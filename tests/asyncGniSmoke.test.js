import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runAsyncGniSmoke } from '../src/asyncGniSmoke.js';
import { loadGameState } from '../src/persistence.js';

test('async GNI smoke runs simulation, polls queued job, and persists resolved directive', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-async-gni-smoke-'));
  const savePath = join(dir, 'session.json');

  try {
    const result = await runAsyncGniSmoke({
      seed: 777,
      savePath,
      directive: {
        dreamWeightDeltas: { garden: 0.45 },
        symbolEchoes: ['threshold'],
        pacingDelta: { silence: 0.1 }
      }
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.simulation.gniBridgeResult.status, 'provider_empty');
    assert.equal(result.initialSave.gniQueue.pending.length, 1);
    assert.equal(result.queueProcess.processed[0].status, 'directive_ready');
    assert.equal(result.finalSave.gniQueue.pending.length, 0);
    assert.equal(result.finalSave.gniQueue.resolved.length, 1);
    assert.equal(result.finalSave.architectState.globalDreamWeights.garden, 1.35);
    assert.equal(
      result.finalSave.architectState.symbolFrequency.threshold,
      result.initialSave.architectState.symbolFrequency.threshold + 1
    );
    assert.equal(saved.gniQueue.pending.length, 0);
    assert.equal(saved.lastGniQueueProcessResult.schema, 'GniDirectiveQueueProcessResultV1');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('async GNI smoke can rehearse delayed provider job readiness', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-async-gni-delayed-smoke-'));
  const savePath = join(dir, 'session.json');

  try {
    const result = await runAsyncGniSmoke({
      seed: 777,
      savePath,
      readyAfterPolls: 2,
      maxQueueProcessAttempts: 2,
      directive: {
        dreamWeightDeltas: { garden: 0.45 },
        symbolEchoes: ['threshold']
      }
    });

    assert.equal(result.queueProcessAttempts.length, 2);
    assert.equal(result.queueProcessAttempts[0].processed[0].status, 'provider_empty');
    assert.equal(result.queueProcessAttempts[1].processed[0].status, 'directive_ready');
    assert.equal(result.finalSave.gniQueue.pending.length, 0);
    assert.equal(result.finalSave.gniQueue.resolved.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
