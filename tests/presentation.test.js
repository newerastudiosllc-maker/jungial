import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThresholdPresentation } from '../src/presentation.js';
import { createJungialRuntime } from '../src/runtime.js';
import { applyPlayerInput } from '../src/input.js';

test('threshold presentation maps chamber and feeling state into render parameters', () => {
  const runtime = createJungialRuntime({ seed: 3 });
  applyPlayerInput({ kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ kind: 'tool', toolId: 'mirror_lens' }, runtime);

  const presentation = buildThresholdPresentation({
    chamber: runtime.chamber,
    feeling: runtime.feeling
  });

  assert.equal(presentation.schema, 'ThresholdPresentationV1');
  assert.equal(presentation.room.boundaryState, 'boundless');
  assert.equal(presentation.note.text, 'the word');
  assert.equal(presentation.heartlight.awake, true);
  assert.equal(presentation.heartlight.color, 'silver-blue placeholder');
  assert.equal(presentation.portal.open, false);
  assert.equal(presentation.toolSigils.visible.length, 4);
  assert.equal(presentation.atmosphere.audio.parameterMood, runtime.feeling.vibeState);
  assert.ok(presentation.atmosphere.lighting.intensity > 1);
});

test('threshold presentation marks portal and spawned forms after tool use', () => {
  const runtime = createJungialRuntime({ seed: 3 });
  applyPlayerInput({ kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ kind: 'action', name: 'open_portal' }, runtime);
  applyPlayerInput({ kind: 'tool', toolId: 'lamp_of_forms' }, runtime);

  const presentation = buildThresholdPresentation({
    chamber: runtime.chamber.snapshot(),
    feeling: runtime.feeling.snapshot()
  });

  assert.equal(presentation.portal.open, true);
  assert.equal(presentation.forms.length, 1);
  assert.equal(presentation.forms[0].kind, 'light_or_mirror_placeholder');
});
