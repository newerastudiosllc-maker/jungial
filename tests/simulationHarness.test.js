import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createGniProviderFromOptions, parseSimulationArgs, runSimulation } from '../src/simulation.js';
import { loadGameState } from '../src/persistence.js';

test('simulation can apply a mocked GNI directive and persist the result', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-sim-'));
  const savePath = join(dir, 'latest.json');

  try {
    const result = await runSimulation({
      seed: 777,
      savePath,
      gniResponse: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: {
          mirror_hall: 0.5
        },
        symbolEchoes: ['mirror'],
        maskPressure: {
          double: 0.25
        },
        pacingDelta: {
          intensity: 0.25
        }
      }
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.appliedGniDirective.dreamWeightDeltas.mirror_hall, 0.5);
    assert.equal(saved.architectState.globalDreamWeights.mirror_hall, 1.5);
    assert.equal(saved.thresholdPresentation.schema, 'ThresholdPresentationV1');
    assert.equal(result.thresholdPresentation.portal.open, true);
    assert.equal(saved.architectState.symbolFrequency.mirror, 1);
    assert.equal(saved.architectState.maskPressure.double, 0.25);
    assert.equal(saved.gniBridgeResult.source, 'provided');
    assert.match(result.transcript.join('\n'), /GNI directive applied/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('simulation CLI args parse seed, save path, JSON mode, and mock GNI response path', () => {
  const options = parseSimulationArgs([
    '--seed=123',
    '--save=saves/test.json',
    '--gni-response=data/mock.json',
    '--emulate-gni',
    '--gni-endpoint=https://gni.local/direct',
    '--gni-token-env=TEST_GNI_TOKEN',
    '--gni-timeout-ms=2500',
    '--clock-start=2040-01-02T03:04:05.000Z',
    '--clock-step-ms=250',
    '--trace=saves/trace.json',
    '--json'
  ]);

  assert.deepEqual(options, {
    seed: 123,
    savePath: 'saves/test.json',
    gniResponsePath: 'data/mock.json',
    emulateGni: true,
    gniEndpoint: 'https://gni.local/direct',
    gniTokenEnv: 'TEST_GNI_TOKEN',
    gniTimeoutMs: 2500,
    clockStartIso: '2040-01-02T03:04:05.000Z',
    clockStepMs: 250,
    tracePath: 'saves/trace.json',
    json: true
  });
});

test('simulation can build a GNI HTTP provider from CLI options without exposing secrets', () => {
  const previous = process.env.TEST_GNI_TOKEN;
  process.env.TEST_GNI_TOKEN = 'token-from-env';

  try {
    const provider = createGniProviderFromOptions({
      gniEndpoint: 'https://gni.local/direct',
      gniTokenEnv: 'TEST_GNI_TOKEN',
      gniTimeoutMs: 500
    });

    assert.equal(provider.endpoint, 'https://gni.local/direct');
    assert.equal(provider.bearerToken, 'token-from-env');
    assert.equal(provider.timeoutMs, 500);
  } finally {
    if (previous === undefined) {
      delete process.env.TEST_GNI_TOKEN;
    } else {
      process.env.TEST_GNI_TOKEN = previous;
    }
  }
});

test('simulation can use deterministic GNI emulator when no real directive is provided', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-emulated-gni-'));
  const savePath = join(dir, 'latest.json');

  try {
    const result = await runSimulation({ seed: 55, savePath, emulateGni: true });

    assert.equal(result.appliedGniDirective.schema, 'JungialDirectiveV1');
    assert.equal(result.appliedGniDirective.schemaVersion, 1);
    assert.match(result.transcript.join('\n'), /GNI emulator prepared a directive/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('simulation can accept an injected GNI provider boundary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-gni-provider-'));
  const savePath = join(dir, 'latest.json');
  const requests = [];

  try {
    const result = await runSimulation({
      seed: 21,
      savePath,
      gniProvider: {
        async processRequest(request) {
          requests.push(request);
          return {
            dreamWeightDeltas: { garden: 0.4 },
            symbolEchoes: ['garden'],
            pacingDelta: { repetition: 0.2 }
          };
        }
      }
    });
    const saved = await loadGameState(savePath);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].contract.inputFormat, 'SessionBundleV1');
    assert.equal(result.gniBridgeResult.source, 'provider');
    assert.equal(result.appliedGniDirective.dreamWeightDeltas.garden, 0.4);
    assert.equal(saved.gniBridgeResult.status, 'directive_ready');
    assert.match(result.transcript.join('\n'), /GNI provider returned a directive/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
