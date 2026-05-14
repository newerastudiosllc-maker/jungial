import test from 'node:test';
import assert from 'node:assert/strict';

import { CURRENT_SAVE_VERSION, migrateSaveGame, wrapSaveGame } from '../src/versioning.js';
import { validateSessionBundle } from '../src/contracts.js';

test('save games are wrapped with explicit schema and version metadata', () => {
  const wrapped = wrapSaveGame({
    room: { awakened: true },
    archetypeState: { archetype_vector: { Seeker: 1 } },
    journal: { entries: [] },
    architectState: { globalDreamWeights: {} }
  });

  assert.equal(wrapped.schema, 'JungialSaveGame');
  assert.equal(wrapped.version, CURRENT_SAVE_VERSION);
  assert.equal(wrapped.payload.room.awakened, true);
  assert.match(wrapped.savedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('legacy unversioned saves migrate into current version envelope', () => {
  const migrated = migrateSaveGame({
    room: { awakened: false },
    archetypeState: { archetype_vector: {} },
    journal: { entries: [] },
    architectState: { globalDreamWeights: {} }
  });

  assert.equal(migrated.schema, 'JungialSaveGame');
  assert.equal(migrated.version, CURRENT_SAVE_VERSION);
  assert.equal(migrated.migrations.includes('legacy-unversioned-to-v1'), true);
  assert.equal(migrated.payload.room.awakened, false);
});

test('session bundle validation requires versioned schema metadata', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.5,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { awakened: true },
    archetypeVector: { Seeker: 1 }
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.includes('schemaVersion must be 1'), true);
});
