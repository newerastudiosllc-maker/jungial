import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SESSION_COVENANT,
  createSessionCovenant,
  createFirstListeningCovenant,
  createTonightShapeCovenant,
  toGniCovenantContext
} from '../src/sessionCovenant.js';

test('default session covenant is gentle, bounded, and session scoped', () => {
  const covenant = createSessionCovenant();

  assert.equal(covenant.schema, 'SessionCovenantV1');
  assert.equal(covenant.schemaVersion, 1);
  assert.equal(covenant.mode, 'tonight_shape');
  assert.deepEqual(covenant.toneTags, DEFAULT_SESSION_COVENANT.toneTags);
  assert.equal(covenant.intensityCeiling, 0.35);
  assert.deepEqual(covenant.hardBoundaryTags, ['real_world_self_harm']);
  assert.equal(covenant.memoryScope, 'session_only');
});

test('first listening covenant redacts raw speech into symbolic preferences', () => {
  const covenant = createFirstListeningCovenant({
    spokenTokens: ['Let it become strange', 'No teeth tonight', 'Keep the lamp near'],
    selectedToneTags: ['dark', 'horrific'],
    returnAnchor: 'lamp near the note'
  });

  assert.equal(covenant.mode, 'first_listening');
  assert.deepEqual(covenant.toneTags, ['dark', 'horrific', 'strange']);
  assert.equal(covenant.intensityCeiling, 0.78);
  assert.deepEqual(covenant.softBoundaryTags, ['teeth']);
  assert.deepEqual(covenant.returnAnchor, { kind: 'image', value: 'lamp near the note' });
  assert.equal(Object.hasOwn(covenant, 'spokenTokens'), false);
});

test('tonight shape covenant clamps intensity and deduplicates tags', () => {
  const covenant = createTonightShapeCovenant({
    toneTags: ['dark', 'dark', 'strange'],
    intensityCeiling: 4,
    hardBoundaryTags: ['body_horror', 'body_horror'],
    softBoundaryTags: ['helplessness']
  });

  assert.deepEqual(covenant.toneTags, ['dark', 'strange']);
  assert.equal(covenant.intensityCeiling, 1);
  assert.deepEqual(covenant.hardBoundaryTags, ['real_world_self_harm', 'body_horror']);
  assert.deepEqual(covenant.softBoundaryTags, ['helplessness']);
});

test('GNI covenant context sends only redacted fields', () => {
  const covenant = createSessionCovenant({
    toneTags: ['strange'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['body_horror'],
    softBoundaryTags: ['teeth'],
    returnAnchor: { kind: 'image', value: 'small lamp' },
    groundingPreference: 'quiet_room',
    memoryScope: 'profile_aggregate'
  });

  assert.deepEqual(toGniCovenantContext(covenant), {
    schema: 'SessionCovenantContextV1',
    schemaVersion: 1,
    mode: 'tonight_shape',
    toneTags: ['strange'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['real_world_self_harm', 'body_horror'],
    softBoundaryTags: ['teeth'],
    allowedPressureTags: [],
    returnAnchorKind: 'image',
    groundingPreference: 'quiet_room',
    memoryScope: 'profile_aggregate'
  });
});
