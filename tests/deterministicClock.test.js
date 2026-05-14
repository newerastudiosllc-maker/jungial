import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { runReplay } from '../src/replay.js';
import { runSimulation } from '../src/simulation.js';
import { loadGameState } from '../src/persistence.js';

const replayScript = {
  seed: 44,
  inputs: [
    { kind: 'speech', text: 'the word' },
    { kind: 'action', name: 'open_portal', archetypes: ['Seeker'], symbols: ['portal'] }
  ],
  gniDirectives: [
    {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { mirror_hall: 0.25 },
      symbolEchoes: ['mirror'],
      maskPressure: { double: 0.2 },
      pacingDelta: { intensity: 0.1 }
    }
  ]
};

test('deterministic replay returns byte-stable timestamps and session ids', async () => {
  const first = await runReplay({
    script: replayScript,
    clock: createDeterministicClock({ startIso: '2030-01-01T00:00:00.000Z' })
  });
  const second = await runReplay({
    script: replayScript,
    clock: createDeterministicClock({ startIso: '2030-01-01T00:00:00.000Z' })
  });

  assert.deepEqual(first, second);
  assert.equal(first.sessionBundle.sessionId, 'session_0001');
  assert.equal(first.journalEntry.createdAt, '2030-01-01T00:00:03.000Z');
});

test('simulation can persist deterministic save metadata when supplied a clock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-clock-'));
  const savePath = join(dir, 'save.json');

  try {
    const result = await runSimulation({
      seed: 12,
      savePath,
      emulateGni: true,
      clock: createDeterministicClock({ startIso: '2040-05-06T07:08:09.000Z' })
    });
    const loadedEnvelope = await loadGameState(savePath, { envelope: true });

    assert.equal(result.gniRequest.payload.sessionId, 'session_0001');
    assert.equal(result.entry.createdAt, '2040-05-06T07:08:12.000Z');
    assert.equal(loadedEnvelope.savedAt, '2040-05-06T07:08:13.000Z');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
