import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeterministicClock } from '../src/clock.js';
import { DreamerProfile } from '../src/dreamerProfile.js';

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
