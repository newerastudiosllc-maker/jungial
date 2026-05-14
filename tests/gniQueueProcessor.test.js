import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ArchitectState } from '../src/ai.js';
import { GniDirectiveQueue } from '../src/gniQueue.js';
import { createMockGniServer } from '../src/mockGniServer.js';
import {
  createGniQueueProviderFromOptions,
  loadGniQueueProviderFromOptions,
  parseGniQueueProcessorArgs,
  processPendingGniQueue,
  processSavedGniQueue
} from '../src/gniQueueProcessor.js';
import { loadGameState, saveGameState } from '../src/persistence.js';

const REQUEST = Object.freeze({
  schema: 'GniProcessingRequestV1',
  schemaVersion: 1,
  provider: 'GNI',
  endpoint: 'gni://local-dev-placeholder',
  model: 'gni-dream-director-dev',
  contract: {
    inputFormat: 'SessionBundleV1',
    outputFormat: 'JungialDirectiveV1',
    allowedDirectives: ['adjust_dream_weights']
  },
  payload: {
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.6,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { portalOpen: true },
    selectedDream: { id: 'garden' },
    archetypeVector: { Seeker: 1 }
  }
});

test('pending GNI queue processor resolves directives and applies architect state', async () => {
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });
  const architect = new ArchitectState({ globalDreamWeights: { garden: 1 } });

  const result = await processPendingGniQueue({
    queueSnapshot: queue.snapshot(),
    architectState: architect,
    provider: async (request) => {
      assert.equal(request.payload.sessionId, 'session-one');
      return {
        dreamWeightDeltas: { garden: 0.5 },
        symbolEchoes: ['mirror'],
        pacingDelta: { intensity: 0.1 }
      };
    }
  });

  assert.equal(result.processed[0].status, 'directive_ready');
  assert.equal(result.queue.pending.length, 0);
  assert.equal(result.queue.resolved.length, 1);
  assert.equal(result.architectState.globalDreamWeights.garden, 1.5);
  assert.equal(architect.snapshot().symbolFrequency.mirror, 1);
});

test('pending GNI queue processor keeps empty provider responses queued', async () => {
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });

  const result = await processPendingGniQueue({
    queueSnapshot: queue.snapshot(),
    architectState: new ArchitectState(),
    provider: async () => null
  });

  assert.equal(result.processed[0].status, 'provider_empty');
  assert.equal(result.queue.pending.length, 1);
  assert.equal(result.queue.pending[0].attempts, 2);
  assert.equal(result.queue.pending[0].reason, 'provider_empty');
});

test('pending GNI queue processor captures provider errors without mutating architect state', async () => {
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });
  const architect = new ArchitectState({ globalDreamWeights: { garden: 1 } });

  const result = await processPendingGniQueue({
    queueSnapshot: queue.snapshot(),
    architectState: architect,
    provider: async () => {
      throw new Error('GNI unavailable');
    }
  });

  assert.equal(result.processed[0].status, 'provider_error');
  assert.deepEqual(result.processed[0].errors, ['GNI unavailable']);
  assert.equal(result.queue.pending[0].reason, 'provider_error');
  assert.equal(result.architectState.globalDreamWeights.garden, 1);
});

test('saved GNI queue processor persists resolved directives back into save payload', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-queue-process-'));
  const savePath = join(dir, 'save.json');
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });

  try {
    await saveGameState(savePath, {
      gniQueue: queue.snapshot(),
      architectState: new ArchitectState({ globalDreamWeights: { garden: 1 } }).snapshot()
    });

    const result = await processSavedGniQueue({
      savePath,
      provider: async () => ({
        dreamWeightDeltas: { garden: 0.25 },
        symbolEchoes: ['threshold']
      })
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.processed[0].status, 'directive_ready');
    assert.equal(saved.gniQueue.pending.length, 0);
    assert.equal(saved.gniQueue.resolved.length, 1);
    assert.equal(saved.architectState.globalDreamWeights.garden, 1.25);
    assert.equal(saved.lastGniQueueProcessResult.schema, 'GniDirectiveQueueProcessResultV1');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('saved GNI queue processor appends a developer trace event', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-queue-trace-'));
  const savePath = join(dir, 'save.json');
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });

  try {
    await saveGameState(savePath, {
      gniQueue: queue.snapshot(),
      architectState: new ArchitectState({ globalDreamWeights: { garden: 1 } }).snapshot(),
      trace: {
        schema: 'JungialTraceV1',
        runId: 'trace-one',
        entries: [{
          index: 1,
          at: '2090-01-01T00:00:00.000Z',
          type: 'gni.request.queued',
          payload: { id: 'gni_pending_session-one' }
        }]
      }
    });

    await processSavedGniQueue({
      savePath,
      clock: {
        nowIso() {
          return '2090-01-01T00:00:01.000Z';
        }
      },
      provider: async () => ({
        dreamWeightDeltas: { garden: 0.25 },
        symbolEchoes: ['threshold']
      })
    });
    const saved = await loadGameState(savePath);
    const traceEntry = saved.trace.entries.at(-1);

    assert.equal(traceEntry.index, 2);
    assert.equal(traceEntry.at, '2090-01-01T00:00:01.000Z');
    assert.equal(traceEntry.type, 'gni.queue.processed');
    assert.deepEqual(traceEntry.payload, {
      processed: [{ id: 'gni_pending_session-one', status: 'directive_ready', providerJob: null }],
      statusCounts: { directive_ready: 1 },
      pendingCount: 0,
      resolvedCount: 1
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('pending GNI queue processor polls provider job status URLs before resubmitting requests', async () => {
  const mock = createMockGniServer({
    mode: 'async',
    directive: {
      dreamWeightDeltas: { garden: 0.35 },
      symbolEchoes: ['threshold']
    }
  });
  const queue = new GniDirectiveQueue();

  try {
    await mock.start();
    const acceptedResponse = await fetch(`${mock.url}/gni`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(REQUEST)
    });
    const accepted = await acceptedResponse.json();
    queue.enqueue({
      request: REQUEST,
      reason: 'provider_empty',
      providerJob: {
        id: accepted.jobId,
        statusUrl: accepted.statusUrl,
        pollAfterMs: accepted.pollAfterMs
      }
    });

    const result = await processPendingGniQueue({
      queueSnapshot: queue.snapshot(),
      architectState: new ArchitectState({ globalDreamWeights: { garden: 1 } })
    });

    assert.equal(result.processed[0].status, 'directive_ready');
    assert.equal(result.queue.pending.length, 0);
    assert.equal(result.queue.resolved.length, 1);
    assert.equal(result.queue.resolved[0].providerJob.id, accepted.jobId);
    assert.equal(result.architectState.globalDreamWeights.garden, 1.35);
    assert.equal(result.architectState.symbolFrequency.threshold, 1);
  } finally {
    await mock.stop();
  }
});

test('GNI queue processor CLI args and provider factory support HTTP handoff options', () => {
  const previous = process.env.TEST_GNI_TOKEN;
  process.env.TEST_GNI_TOKEN = 'token-from-env';

  try {
    const options = parseGniQueueProcessorArgs([
      '--save=saves/latest-session.json',
      '--out=saves/processed-session.json',
      '--gni-endpoint=https://gni.local/process',
      '--gni-token-env=TEST_GNI_TOKEN',
      '--gni-timeout-ms=2500',
      '--limit=2',
      '--clock-start=2090-01-01T00:00:00.000Z',
      '--clock-step-ms=500',
      '--json'
    ]);
    const provider = createGniQueueProviderFromOptions(options);

    assert.deepEqual(options, {
      savePath: 'saves/latest-session.json',
      outputPath: 'saves/processed-session.json',
      gniEndpoint: 'https://gni.local/process',
      gniTokenEnv: 'TEST_GNI_TOKEN',
      gniTimeoutMs: 2500,
      limit: 2,
      clockStartIso: '2090-01-01T00:00:00.000Z',
      clockStepMs: 500,
      json: true
    });
    assert.equal(provider.endpoint, 'https://gni.local/process');
    assert.equal(provider.bearerToken, 'token-from-env');
    assert.equal(provider.timeoutMs, 2500);
  } finally {
    if (previous === undefined) {
      delete process.env.TEST_GNI_TOKEN;
    } else {
      process.env.TEST_GNI_TOKEN = previous;
    }
  }
});

test('saved GNI queue processor can stamp deterministic process timestamps', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-queue-clock-'));
  const savePath = join(dir, 'save.json');
  const queue = new GniDirectiveQueue();
  queue.enqueue({ request: REQUEST, reason: 'pending' });

  try {
    await saveGameState(savePath, {
      gniQueue: queue.snapshot(),
      architectState: new ArchitectState().snapshot()
    });

    await processSavedGniQueue({
      savePath,
      clock: {
        nowIso() {
          return '2090-01-01T00:00:00.000Z';
        }
      },
      provider: async () => ({ dreamWeightDeltas: { garden: 0.1 } })
    });
    const saved = await loadGameState(savePath);

    assert.equal(saved.gniQueue.resolved[0].resolvedAt, '2090-01-01T00:00:00.000Z');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('GNI queue processor can load a local directive fixture as provider output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-queue-fixture-provider-'));
  const responsePath = join(dir, 'directive.json');

  try {
    await writeFile(responsePath, JSON.stringify({
      dreamWeightDeltas: { garden: 0.25 },
      symbolEchoes: ['mirror']
    }), 'utf8');

    const options = parseGniQueueProcessorArgs([
      '--save=saves/latest-session.json',
      `--gni-response=${responsePath}`
    ]);
    const provider = await loadGniQueueProviderFromOptions(options);
    const response = await provider(REQUEST);

    assert.equal(options.gniResponsePath, responsePath);
    assert.deepEqual(response, {
      dreamWeightDeltas: { garden: 0.25 },
      symbolEchoes: ['mirror']
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
