import test from 'node:test';
import assert from 'node:assert/strict';

import { createJungialRuntime } from '../src/runtime.js';
import { applyPlayerInput, normalizePlayerInput } from '../src/input.js';

test('input router maps controller command to threshold awakening without speech text', () => {
  const intent = normalizePlayerInput({
    source: 'controller',
    kind: 'action',
    name: 'speak_word'
  });

  assert.deepEqual(intent, {
    schema: 'JungialInputIntentV1',
    source: 'controller',
    kind: 'intent',
    intent: 'awaken_threshold',
    text: 'the word',
    actionName: 'speak_word',
    toolId: null,
    archetypes: ['Creator', 'Seeker'],
    symbols: ['threshold', 'silence', 'light'],
    requiresMicrophone: false
  });
});

test('input router applies platform-neutral awakening and portal intents', () => {
  const runtime = createJungialRuntime({ seed: 12 });

  const awaken = applyPlayerInput({
    source: 'vr',
    kind: 'intent',
    intent: 'awaken_threshold'
  }, runtime);
  const portal = applyPlayerInput({
    source: 'keyboard',
    kind: 'action',
    name: 'open_portal'
  }, runtime);

  assert.equal(awaken.applied, true);
  assert.equal(portal.applied, true);
  assert.equal(runtime.chamber.snapshot().portalOpen, true);
  assert.equal(runtime.archetypes.recentActions().includes('open_portal'), true);
});

test('input router applies tool use through a stable intent shape', () => {
  const runtime = createJungialRuntime({ seed: 12 });

  applyPlayerInput({ kind: 'speech', text: 'the word' }, runtime);
  const result = applyPlayerInput({
    source: 'controller',
    kind: 'tool',
    toolId: 'lamp_of_forms'
  }, runtime);

  assert.equal(result.applied, true);
  assert.equal(runtime.chamber.snapshot().spawnedForms.length, 1);
  assert.equal(runtime.archetypes.recentActions().at(-1), 'use_lamp_of_forms');
});

test('input router keeps unknown platform sources contract-safe', () => {
  const intent = normalizePlayerInput({
    source: 'mystery-device',
    kind: 'action',
    name: 'speak_word'
  });

  assert.equal(intent.source, 'system');
  assert.equal(intent.requiresMicrophone, false);
});
