import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeterministicClock } from '../src/clock.js';
import { DreamerProfile } from '../src/dreamerProfile.js';
import { createDreamWeather } from '../src/dreamWeather.js';

const SESSION_BUNDLE = Object.freeze({
  schema: 'SessionBundleV1',
  schemaVersion: 1,
  sessionId: 'session-one',
  dominantArchetype: 'Seeker',
  coherence: 0.62,
  vibeState: 'calm_hopeful_boundless_bright_warm',
  recentSymbols: ['portal', 'mirror', 'portal'],
  recentActions: ['awaken_heartlight', 'open_portal'],
  roomConfigSnapshot: {
    portalOpen: true,
    privateSpeech: 'I am afraid of being seen'
  },
  selectedDream: {
    id: 'mirror_hall',
    symbolicTags: ['reflection', 'shadow']
  },
  archetypeVector: {
    Seeker: 1.4,
    Shadow: 0.8,
    Creator: 0.3
  }
});

test('DreamerProfile records symbolic aggregates without storing raw private context', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one'
  }, {
    clock: createDeterministicClock({ startIso: '2060-01-01T00:00:00.000Z' })
  });

  profile.recordSession({
    sessionBundle: SESSION_BUNDLE,
    dreamJourney: {
      beats: [
        { moduleId: 'mirror_hall', symbolicTags: ['reflection', 'shadow'] },
        { moduleId: 'garden', symbolicTags: ['growth'] }
      ],
      symbolTrail: ['reflection', 'shadow', 'growth']
    },
    mask: { id: 'double' }
  });
  const snapshotText = JSON.stringify(profile.snapshot());

  assert.equal(profile.snapshot().schema, 'DreamerProfileV1');
  assert.equal(profile.snapshot().memory.sessionCount, 1);
  assert.equal(profile.snapshot().memory.symbols.portal.count, 2);
  assert.equal(profile.snapshot().memory.symbols.reflection.count, 1);
  assert.equal(profile.snapshot().memory.archetypes.Seeker.weight, 1.4);
  assert.equal(profile.snapshot().memory.dreamModules.mirror_hall.count, 1);
  assert.equal(profile.snapshot().memory.masks.double.count, 1);
  assert.equal(snapshotText.includes('I am afraid of being seen'), false);
  assert.equal(snapshotText.includes('privateSpeech'), false);
});

test('Dreamer profile records Passage motifs and gestures as aggregates only', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-one'
  });

  const snapshot = profile.recordSession({
    sessionBundle: SESSION_BUNDLE,
    echoTrace: {
      schema: 'EchoTraceV1',
      schemaVersion: 1,
      passageId: 'door_breathing_low',
      motifsTouched: ['door', 'threshold'],
      gestureTags: ['approach', 'speak'],
      tempo: 'hesitant_then_committed',
      pressureAccepted: 0.42,
      returnAnchorUsed: false,
      boundarySignals: ['long_pause'],
      dreamflowDeltas: {}
    }
  });

  assert.equal(snapshot.memory.passages.door_breathing_low.count, 1);
  assert.equal(snapshot.memory.motifs.door.count, 1);
  assert.equal(snapshot.memory.gestures.speak.count, 1);
  assert.equal(JSON.stringify(snapshot).includes('rawSpeech'), false);
  assert.deepEqual(profile.toGniMemoryContext({ slotId: 'slot-a' }).familiarMotifs, ['door', 'threshold']);
});

test('DreamerProfile records familiar dream weather without storing raw player input', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-one'
  }, {
    clock: createDeterministicClock({ startIso: '2060-01-01T00:00:00.000Z' })
  });
  const dreamWeather = {
    ...createDreamWeather({
      seed: 12,
      weatherTags: ['mist', 'watching'],
      dreadBudget: { watching: 0.4, loss: 0.03 }
    }),
    rawPrompt: 'my childhood address is 10 Lantern Lane',
    privateNote: 'do not remember this sentence'
  };

  profile.recordSession({ sessionBundle: SESSION_BUNDLE, dreamWeather });
  const snapshot = profile.snapshot();
  const context = profile.toGniMemoryContext({ slotId: 'slot-a' });
  const snapshotText = JSON.stringify(snapshot);

  assert.equal(snapshot.memory.weatherTags.mist.count, 1);
  assert.equal(snapshot.memory.weatherTags.watching.count, 1);
  assert.equal(snapshot.memory.dreadAxes.watching.count, 1);
  assert.equal(snapshot.memory.dreadAxes.watching.weight, dreamWeather.dreadBudget.watching);
  assert.equal(snapshot.memory.dreadAxes.loss, undefined);
  assert.ok(context.familiarWeatherTags.includes('mist'));
  assert.deepEqual(context.familiarDreadAxes, ['watching']);
  assert.equal(snapshotText.includes('10 Lantern Lane'), false);
  assert.equal(snapshotText.includes('do not remember this sentence'), false);
  assert.equal(snapshotText.includes('rawPrompt'), false);
  assert.equal(snapshotText.includes('privateNote'), false);
});

test('DreamerProfile hydrates old snapshots with empty weather memory maps', () => {
  const profile = new DreamerProfile({
    profileId: 'legacy-dreamer',
    rootSeed: 'legacy-root',
    createdAt: '2050-01-01T00:00:00.000Z',
    updatedAt: '2050-01-01T00:00:00.000Z',
    consent: {
      profileMemory: true,
      crossSaveEchoes: false
    },
    memory: {
      sessionCount: 0,
      symbols: {},
      archetypes: {},
      actions: {},
      dreamModules: {},
      masks: {},
      vibeStates: {},
      passages: {},
      motifs: {},
      gestures: {},
      echoThreads: {},
      lastSessionDigest: null
    }
  });

  assert.deepEqual(profile.snapshot().memory.weatherTags, {});
  assert.deepEqual(profile.snapshot().memory.dreadAxes, {});
  assert.deepEqual(profile.toGniMemoryContext({ slotId: 'slot-a' }).familiarWeatherTags, []);
  assert.deepEqual(profile.toGniMemoryContext({ slotId: 'slot-a' }).familiarDreadAxes, []);
});

test('DreamerProfile respects memory context limit for familiar dread axes', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-one',
    memory: {
      dreadAxes: {
        watching: { count: 1, weight: 0.9, lastSeenAt: null },
        pursuit: { count: 1, weight: 0.8, lastSeenAt: null },
        loss: { count: 1, weight: 0.7, lastSeenAt: null }
      }
    }
  });

  assert.deepEqual(profile.toGniMemoryContext({ slotId: 'slot-a', limit: 2 }).familiarDreadAxes, ['watching', 'pursuit']);
});

test('DreamerProfile derives divergent seeds for fresh saves and incarnations', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one'
  });

  assert.equal(
    profile.deriveRunSeed({ slotId: 'slot-a', mode: 'continue', incarnationIndex: 0 }),
    profile.deriveRunSeed({ slotId: 'slot-a', mode: 'continue', incarnationIndex: 0 })
  );
  assert.notEqual(
    profile.deriveRunSeed({ slotId: 'slot-a', mode: 'fresh', incarnationIndex: 0 }),
    profile.deriveRunSeed({ slotId: 'slot-b', mode: 'fresh', incarnationIndex: 0 })
  );
  assert.notEqual(
    profile.deriveRunSeed({ slotId: 'slot-a', mode: 'new_incarnation', incarnationIndex: 1 }),
    profile.deriveRunSeed({ slotId: 'slot-a', mode: 'new_incarnation', incarnationIndex: 2 })
  );
});

test('DreamerProfile creates a redacted GNI memory context with optional cross-save echoes', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    consent: {
      profileMemory: true,
      crossSaveEchoes: false
    }
  });
  profile.recordSession({ sessionBundle: SESSION_BUNDLE });

  const context = profile.toGniMemoryContext({
    slotId: 'slot-a',
    mode: 'continue'
  });

  assert.equal(context.schema, 'DreamerMemoryContextV1');
  assert.equal(context.profileId, null);
  assert.equal(context.saveMode, 'continue');
  assert.deepEqual(context.strongSymbols.slice(0, 2), ['portal', 'mirror']);
  assert.deepEqual(context.recurringArchetypes.slice(0, 2), ['Seeker', 'Shadow']);
  assert.equal(context.sessionCount, 1);
  assert.equal(JSON.stringify(context).includes('afraid'), false);
});
