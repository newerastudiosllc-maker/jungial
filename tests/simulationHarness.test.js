import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseSimulationArgs, runSimulation } from '../src/simulation.js';
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
    assert.equal(saved.architectState.symbolFrequency.mirror, 1);
    assert.equal(saved.architectState.maskPressure.double, 0.25);
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
    '--json'
  ]);

  assert.deepEqual(options, {
    seed: 123,
    savePath: 'saves/test.json',
    gniResponsePath: 'data/mock.json',
    json: true
  });
});
