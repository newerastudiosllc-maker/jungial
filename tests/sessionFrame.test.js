import test from 'node:test';
import assert from 'node:assert/strict';

import { createDreamWeather } from '../src/dreamWeather.js';
import { createExperienceDirective } from '../src/experienceDirector.js';
import { buildThresholdPresentation } from '../src/presentation.js';
import { buildSessionFrame } from '../src/sessionFrame.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import { validateSessionFrame } from '../src/contracts.js';

test('SessionFrameV1 combines presentation and hidden direction for renderer handoff', () => {
  const sessionCovenant = createSessionCovenant({
    toneTags: ['gentle', 'strange'],
    intensityCeiling: 0.42,
    hardBoundaryTags: ['pursuit'],
    returnAnchor: { kind: 'image', value: 'heartlight' }
  });
  const dreamWeather = createDreamWeather({
    seed: 144,
    covenant: sessionCovenant,
    weatherTags: ['threshold', 'lamp'],
    dreadBudget: { watching: 0.24 }
  });
  const thresholdPresentation = buildThresholdPresentation({
    chamber: {
      awakened: true,
      boundaryState: 'boundless',
      note: 'the word',
      heartlight: { awake: true, intensity: 1, color: 'silver-blue placeholder' },
      portalOpen: true,
      visibleToolSigils: [],
      spawnedForms: []
    },
    feeling: {},
    dreamWeather,
    sessionCovenant
  });
  const experienceDirective = createExperienceDirective({
    seed: 144,
    sessionCovenant,
    dreamWeather
  });

  const frame = buildSessionFrame({
    seed: 144,
    frameIndex: 3,
    thresholdPresentation,
    experienceDirective,
    sessionCovenant,
    trace: {
      schema: 'JungialTraceV1',
      entries: [
        { type: 'threshold.awakened' },
        { type: 'experience.directive.created' }
      ]
    }
  });

  assert.equal(frame.schema, 'SessionFrameV1');
  assert.equal(frame.schemaVersion, 1);
  assert.equal(frame.frameIndex, 3);
  assert.equal(frame.frameKind, 'threshold_portal');
  assert.equal(frame.presentation.schema, 'ThresholdPresentationV1');
  assert.equal(frame.experienceDirective.schema, 'ExperienceDirectiveV1');
  assert.equal(frame.comfort.intensityCeiling, 0.42);
  assert.equal(frame.comfort.pursuitAllowed, false);
  assert.equal(frame.comfort.returnAvailable, false);
  assert.equal(frame.rendererHints.nextMove, experienceDirective.nextMove);
  assert.equal(frame.rendererHints.pressureTarget, experienceDirective.pressureTarget);
  assert.equal(frame.rendererHints.lightingIntensityScale, thresholdPresentation.dreamAtmosphere.lighting.intensityScale);
  assert.equal(frame.debug.eventCount, 2);
  assert.equal(frame.debug.lastEventType, 'experience.directive.created');
  assert.equal(frame.playerFacingText, null);
  assert.deepEqual(validateSessionFrame(frame), { valid: true, errors: [] });
});

test('SessionFrameV1 stays redacted and bounded even with raw caller context nearby', () => {
  const sessionCovenant = createSessionCovenant({
    intensityCeiling: 0.3,
    returnAnchor: { kind: 'image', value: 'the note' }
  });
  const thresholdPresentation = buildThresholdPresentation({
    chamber: {
      awakened: false,
      boundaryState: 'confined',
      note: 'the word',
      portalOpen: false
    },
    feeling: {},
    sessionCovenant
  });
  const experienceDirective = createExperienceDirective({
    seed: 610,
    sessionCovenant,
    rawSpeech: 'this should not appear'
  });

  const frame = buildSessionFrame({
    seed: 610,
    thresholdPresentation,
    experienceDirective,
    sessionCovenant,
    rawSpeech: 'do not render this phrase'
  });

  assert.equal(frame.frameKind, 'threshold_silent');
  assert.equal(frame.comfort.intensityCeiling, 0.3);
  assert.equal(JSON.stringify(frame).includes('do not render this phrase'), false);
  assert.equal(JSON.stringify(frame).includes('this should not appear'), false);
  assert.equal(JSON.stringify(frame).includes('rawSpeech'), false);
  assert.deepEqual(validateSessionFrame(frame), { valid: true, errors: [] });
});
