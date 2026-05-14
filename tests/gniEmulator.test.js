import test from 'node:test';
import assert from 'node:assert/strict';

import { GniEmulator } from '../src/gniEmulator.js';

const bundle = {
  schema: 'SessionBundleV1',
  schemaVersion: 1,
  sessionId: 'session-one',
  dominantArchetype: 'Shadow',
  coherence: 0.7,
  vibeState: 'tense_melancholic_confined_dim_cold',
  recentSymbols: ['mirror', 'portal', 'mirror'],
  recentActions: ['look_into_mirror'],
  roomConfigSnapshot: { awakened: true },
  selectedDream: { id: 'mirror_hall', symbolicTags: ['reflection', 'shadow'] },
  archetypeVector: { Shadow: 2, Seeker: 1 }
};

test('GNI emulator returns deterministic Jungial directives from session bundle context', () => {
  const emulator = new GniEmulator({ seed: 99 });

  const first = emulator.processSessionBundle(bundle);
  const second = new GniEmulator({ seed: 99 }).processSessionBundle(bundle);

  assert.deepEqual(first, second);
  assert.equal(first.schema, 'JungialDirectiveV1');
  assert.equal(first.schemaVersion, 1);
  assert.ok(first.dreamWeightDeltas.mirror_hall > 0);
  assert.ok(first.symbolEchoes.includes('mirror'));
  assert.ok(first.maskPressure.double > 0);
  assert.ok(first.pacingDelta.intensity > 0);
});
