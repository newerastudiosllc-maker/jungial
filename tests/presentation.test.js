import test from 'node:test';
import assert from 'node:assert/strict';

import { buildThresholdPresentation } from '../src/presentation.js';
import { createJungialRuntime } from '../src/runtime.js';
import { applyPlayerInput } from '../src/input.js';
import { createDreamWeather } from '../src/dreamWeather.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';

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

test('threshold presentation maps dream weather into bounded render and comfort cues', () => {
  const runtime = createJungialRuntime({ seed: 13 });
  applyPlayerInput({ kind: 'speech', text: 'the word' }, runtime);
  const sessionCovenant = createSessionCovenant({
    toneTags: ['dark', 'strange'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['pursuit']
  });
  const dreamWeather = createDreamWeather({
    seed: 89,
    covenant: sessionCovenant,
    weatherTags: ['gravity', 'cold', 'pursuit'],
    dreadBudget: {
      pursuit: 0.8,
      bodyUnease: 0.3,
      cosmicDread: 0.6,
      disorientation: 0.4,
      loss: 0.2,
      watching: 0.3,
      claustrophobia: 0.2
    }
  });

  const presentation = buildThresholdPresentation({
    chamber: runtime.chamber,
    feeling: runtime.feeling,
    dreamWeather,
    sessionCovenant
  });

  assert.equal(presentation.dreamAtmosphere.schema, 'DreamAtmospherePresentationV1');
  assert.equal(presentation.dreamAtmosphere.weatherId, dreamWeather.weatherId);
  assert.equal(presentation.dreamAtmosphere.mood, dreamWeather.mood);
  assert.equal(presentation.dreamAtmosphere.pressure, dreamWeather.pressure);
  assert.ok(presentation.dreamAtmosphere.weatherTags.includes('gravity'));
  assert.equal(presentation.dreamAtmosphere.comfort.pursuitAllowed, false);
  assert.equal(presentation.dreamAtmosphere.comfort.suddenFlashAllowed, false);
  assert.ok(presentation.dreamAtmosphere.haptics.amplitude <= sessionCovenant.intensityCeiling);
  assert.ok(presentation.dreamAtmosphere.movement.drag >= dreamWeather.atmosphere.movementDrag);
  assert.ok(!JSON.stringify(presentation.dreamAtmosphere).includes('dreadBudget'));

  for (const section of ['lighting', 'fog', 'audio', 'haptics', 'movement']) {
    for (const value of Object.values(presentation.dreamAtmosphere[section])) {
      if (typeof value === 'number') {
        assert.ok(value >= 0 && value <= 1, `${section} value ${value} stays normalized`);
      }
    }
  }
});
