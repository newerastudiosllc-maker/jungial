import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchetypeState } from '../src/archetype.js';
import { FeelingState } from '../src/feeling.js';

test('archetype state records speech, actions, symbols, and dominant current', () => {
  const state = new ArchetypeState();

  state.recordSpeech('the word', ['silence', 'threshold']);
  state.recordAction('touch_heartlight', ['Creator', 'Seeker'], ['light', 'awakening']);
  state.recordAction('face_shadow', ['Shadow'], ['mirror']);

  assert.equal(state.speechEvents.length, 1);
  assert.equal(state.actionEvents.length, 2);
  assert.equal(state.symbolHits.light, 1);
  assert.equal(state.symbolHits.mirror, 1);
  assert.equal(state.dominantArchetype(), 'Creator');
  assert.equal(typeof state.coherence, 'number');
  assert.ok(state.coherence > 0);
  assert.ok(state.coherence <= 1);
});

test('feeling state maps live atmosphere axes to presentation parameters', () => {
  const feeling = new FeelingState();

  feeling.nudge({
    calm_tense: 0.5,
    hopeful_melancholic: -0.25,
    expansive_confined: 0.75,
    bright_dark: -0.5,
    warm_cold: -0.25
  });

  const params = feeling.toPresentationParams();

  assert.equal(feeling.vibeState, 'tense_melancholic_boundless_dim_warm');
  assert.ok(params.lighting.intensity < 1);
  assert.ok(params.fog.density < 0.5);
  assert.ok(params.postProcess.bloom >= 0);
  assert.equal(params.audio.placeholder, 'ambient_tense_melancholic_boundless_dim_warm');
  assert.ok(params.movement.feel.includes('drifting'));
});
