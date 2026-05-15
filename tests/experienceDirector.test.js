import test from 'node:test';
import assert from 'node:assert/strict';

import { createDreamWeather } from '../src/dreamWeather.js';
import { createExperienceDirective } from '../src/experienceDirector.js';
import { runFirstListeningSequence } from '../src/firstListening.js';
import { createSessionArc } from '../src/sessionArc.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import { validateExperienceDirective } from '../src/contracts.js';

test('Experience Director softens when First Listening and Session Arc signal boundaries', () => {
  const firstListeningRun = runFirstListeningSequence({
    seed: 144,
    beats: [{
      beatId: 'beat-lamp',
      symbolicObjectId: 'heartlight',
      responseKind: 'wait',
      gestureTags: ['wait', 'observe'],
      motifTags: ['lamp', 'threshold'],
      pressureAccepted: 0.12,
      boundarySignals: ['long_pause'],
      rawSpeech: 'do not use this private phrase'
    }]
  });
  const covenant = createSessionCovenant({
    toneTags: ['gentle', 'strange'],
    intensityCeiling: 0.42,
    hardBoundaryTags: ['pursuit'],
    returnAnchor: { kind: 'image', value: 'heartlight' }
  });
  const sessionArc = createSessionArc({
    phase: 'softening',
    beatCount: 4,
    pressure: 0.35,
    returnReadiness: 0.52,
    boundarySignalCount: 2,
    lastDecision: 'soften',
    weightOverrides: { garden: 1.22 }
  });
  const dreamWeather = createDreamWeather({
    covenant,
    weatherTags: ['threshold', 'lamp'],
    dreadBudget: { watching: 0.3 },
    seed: 144
  });

  const directive = createExperienceDirective({
    seed: 144,
    firstListeningRun,
    sessionCovenant: covenant,
    sessionArc,
    dreamWeather,
    dreamerMemoryContext: {
      strongSymbols: ['mirror'],
      familiarDreamModules: ['mirror_hall'],
      familiarMasks: ['double']
    },
    architectState: {
      globalDreamWeights: { mirror_hall: 1.4 },
      pacingProfile: { silence: 0.4 },
      maskPressure: { double: 0.5 }
    }
  });

  assert.equal(directive.schema, 'ExperienceDirectiveV1');
  assert.equal(directive.nextMove, 'soften');
  assert.equal(directive.suggestedRole, 'return');
  assert.equal(directive.pressureTarget <= covenant.intensityCeiling, true);
  assert.equal(directive.returnReadiness >= sessionArc.returnReadiness, true);
  assert.equal(directive.returnAnchorKind, 'image');
  assert.equal(directive.returnAnchorValue, 'heartlight');
  assert.equal(directive.dreamWeightOverrides.garden > 1, true);
  assert.equal(directive.dreamWeightOverrides.cabin > 1, true);
  assert.equal(directive.maskPressure.double > 0, true);
  assert.equal(directive.reasonCodes.includes('first_listening_boundary'), true);
  assert.equal(directive.reasonCodes.includes('session_arc_soften'), true);
  assert.deepEqual(validateExperienceDirective(directive), { valid: true, errors: [] });
  assert.equal(JSON.stringify(directive).includes('private phrase'), false);
  assert.equal(JSON.stringify(directive).includes('rawSpeech'), false);
});

test('Experience Director applies GNI pacing and weight hints within covenant bounds', () => {
  const covenant = createSessionCovenant({
    toneTags: ['deep', 'dark'],
    intensityCeiling: 0.72,
    returnAnchor: { kind: 'image', value: 'threshold_note' }
  });
  const sessionArc = createSessionArc({
    phase: 'mirroring',
    beatCount: 3,
    pressure: 0.45,
    returnReadiness: 0.24,
    lastDecision: 'mirror',
    weightOverrides: { mirror_hall: 1.3 }
  });
  const dreamWeather = createDreamWeather({
    covenant,
    weatherTags: ['mirror', 'gravity'],
    dreadBudget: { cosmicDread: 0.5 },
    seed: 377
  });

  const directive = createExperienceDirective({
    seed: 377,
    sessionCovenant: covenant,
    sessionArc,
    dreamWeather,
    appliedGniDirective: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: {
        mirror_hall: 0.4,
        garden: -0.95,
        impossible_private_place: 8
      },
      symbolEchoes: ['mirror'],
      maskPressure: { double: 0.3 },
      pacingDelta: { intensity: 0.5, repetition: 0.2, silence: -0.2 }
    }
  });

  assert.equal(directive.nextMove, 'mirror');
  assert.equal(directive.pressureTarget <= covenant.intensityCeiling, true);
  assert.equal(directive.dreamWeightOverrides.mirror_hall > sessionArc.weightOverrides.mirror_hall, true);
  assert.equal(directive.dreamWeightOverrides.garden >= 0.05, true);
  assert.equal(directive.dreamWeightOverrides.impossible_private_place, undefined);
  assert.equal(directive.pacingBias.intensity > 0, true);
  assert.equal(directive.pacingBias.repetition > 0, true);
  assert.equal(directive.reasonCodes.includes('gni_directive_applied'), true);
  assert.deepEqual(validateExperienceDirective(directive), { valid: true, errors: [] });
});

test('Experience Director returns deterministic directives for identical inputs', () => {
  const input = {
    seed: 610,
    sessionCovenant: createSessionCovenant({ intensityCeiling: 0.5 }),
    sessionArc: createSessionArc({ lastDecision: 'deepen', pressure: 0.2 }),
    dreamWeather: createDreamWeather({ seed: 610, weatherTags: ['garden'] })
  };

  assert.deepEqual(createExperienceDirective(input), createExperienceDirective(input));
});
