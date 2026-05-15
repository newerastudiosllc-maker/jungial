import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { DreamerProfile } from '../src/dreamerProfile.js';
import { loadGameState } from '../src/persistence.js';
import { prepareSaveSlot } from '../src/saveSlotManager.js';
import { runSimulation } from '../src/simulation.js';

const SESSION_BUNDLE = Object.freeze({
  schema: 'SessionBundleV1',
  schemaVersion: 1,
  sessionId: 'session-one',
  dominantArchetype: 'Seeker',
  coherence: 0.62,
  vibeState: 'calm_hopeful_boundless_bright_warm',
  recentSymbols: ['portal', 'mirror'],
  recentActions: ['awaken_heartlight'],
  roomConfigSnapshot: { awakened: true, privateSpeech: 'do not remember this' },
  selectedDream: {
    id: 'mirror_hall',
    symbolicTags: ['reflection']
  },
  archetypeVector: {
    Seeker: 1.2
  }
});

test('fresh save slot creates a new empty profile and divergent run seed', () => {
  const source = seededProfile({
    consent: { profileMemory: true, crossSaveEchoes: true }
  });
  const fresh = prepareSaveSlot({
    profileSnapshot: source.snapshot(),
    slotId: 'slot-a',
    mode: 'fresh',
    clock: createDeterministicClock({ startIso: '2090-01-01T00:00:00.000Z' })
  });
  const continued = prepareSaveSlot({
    profileSnapshot: source.snapshot(),
    slotId: 'slot-a',
    mode: 'continue',
    clock: createDeterministicClock({ startIso: '2090-01-01T00:00:00.000Z' })
  });

  assert.equal(fresh.schema, 'SaveSlotPlanV1');
  assert.equal(fresh.mode, 'fresh');
  assert.equal(fresh.profile.memory.sessionCount, 0);
  assert.deepEqual(fresh.dreamerMemoryContext.strongSymbols, []);
  assert.notEqual(fresh.profile.profileId, source.snapshot().profileId);
  assert.notEqual(fresh.runSeed, continued.runSeed);
});

test('new incarnation starts empty but can send faint redacted cross-save echoes', () => {
  const source = seededProfile({
    consent: { profileMemory: true, crossSaveEchoes: true }
  });
  const plan = prepareSaveSlot({
    profileSnapshot: source.snapshot(),
    slotId: 'slot-b',
    mode: 'new_incarnation',
    incarnationIndex: 3,
    clock: createDeterministicClock({ startIso: '2090-01-02T00:00:00.000Z' })
  });

  assert.equal(plan.mode, 'new_incarnation');
  assert.equal(plan.incarnationIndex, 3);
  assert.equal(plan.profile.memory.sessionCount, 0);
  assert.equal(plan.dreamerMemoryContext.saveMode, 'new_incarnation');
  assert.equal(plan.dreamerMemoryContext.profileId, source.snapshot().profileId);
  assert.ok(plan.dreamerMemoryContext.strongSymbols.includes('portal'));
  assert.equal(JSON.stringify(plan).includes('do not remember this'), false);
});

test('new incarnation suppresses cross-save echoes when consent is disabled', () => {
  const source = seededProfile({
    consent: { profileMemory: true, crossSaveEchoes: false }
  });
  const plan = prepareSaveSlot({
    profileSnapshot: source.snapshot(),
    slotId: 'slot-c',
    mode: 'new_incarnation',
    incarnationIndex: 1,
    clock: createDeterministicClock({ startIso: '2090-01-03T00:00:00.000Z' })
  });

  assert.equal(plan.dreamerMemoryContext.profileId, null);
  assert.deepEqual(plan.dreamerMemoryContext.strongSymbols, []);
  assert.equal(plan.crossSaveEchoes, false);
});

test('simulation persists save slot plan and sends incarnation memory context to GNI', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-save-slot-'));
  const savePath = join(dir, 'session.json');
  const source = seededProfile({
    consent: { profileMemory: true, crossSaveEchoes: true }
  });
  const requests = [];

  try {
    const result = await runSimulation({
      seed: 777,
      savePath,
      dreamerProfile: source.snapshot(),
      saveSlotId: 'slot-incarnation',
      saveMode: 'new_incarnation',
      incarnationIndex: 2,
      clock: createDeterministicClock({ startIso: '2090-01-04T00:00:00.000Z' }),
      gniProvider: async (request) => {
        requests.push(request);
        return null;
      }
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.saveSlot.mode, 'new_incarnation');
    assert.equal(saved.saveSlot.mode, 'new_incarnation');
    assert.equal(saved.dreamerProfile.memory.sessionCount, 1);
    assert.equal(requests[0].payload.dreamerMemoryContext.saveMode, 'new_incarnation');
    assert.ok(requests[0].payload.dreamerMemoryContext.strongSymbols.includes('portal'));
    assert.equal(JSON.stringify(requests[0]).includes('do not remember this'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function seededProfile({ consent }) {
  const profile = new DreamerProfile({
    profileId: 'dreamer-source',
    rootSeed: 'root-source',
    consent
  }, {
    clock: createDeterministicClock({ startIso: '2089-01-01T00:00:00.000Z' })
  });
  profile.recordSession({ sessionBundle: SESSION_BUNDLE });
  return profile;
}
