import test from 'node:test';
import assert from 'node:assert/strict';

import { validateSessionContentGate } from '../src/contracts.js';
import { createDreamWeather } from '../src/dreamWeather.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import { createSessionContentGateReport } from '../src/sessionContentGate.js';
import { createSessionShapeSelection } from '../src/sessionShape.js';

test('Session Content Gate accepts content inside the current session covenant', () => {
  const sessionShapeSelection = createSessionShapeSelection({ shapeId: 'dark_mirror' });
  const report = createSessionContentGateReport({
    sessionShapeSelection,
    sessionCovenant: sessionShapeSelection.covenant,
    passage: {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'mirror_threshold_soft',
      motifs: ['mirror', 'reflection'],
      pressureTags: ['shadow'],
      formTags: ['threshold'],
      intensityBand: 'dark',
      allowedResponseKinds: ['approach'],
      returnAnchorTags: ['heartlight'],
      variationFamily: 'mirror_threshold',
      baseWeight: 1
    },
    dreamWeather: createDreamWeather({
      covenant: sessionShapeSelection.covenant,
      weatherTags: ['mirror', 'shadow'],
      seed: 12
    }),
    dreamJourney: {
      schema: 'DreamJourneyV1',
      beats: [{
        role: 'entry',
        moduleId: 'mirror_hall',
        moduleName: 'Mirror Hall',
        symbolicTags: ['reflection', 'shadow'],
        weightBreakdown: { base: 1, archetype: 0, vibe: 0, room: 0, portal: 0, directorMultiplier: 1, total: 1, roll: 0.1 }
      }],
      symbolTrail: ['reflection', 'shadow'],
      summary: 'reflection passes through shadow'
    },
    mask: {
      id: 'double',
      archetypeTags: ['Shadow'],
      visualMaterial: 'mirror placeholder',
      dialogueTone: 'reflective'
    }
  });

  assert.equal(report.schema, 'SessionContentGateV1');
  assert.equal(report.allowed, true);
  assert.equal(report.playerFacingText, null);
  assert.deepEqual(report.blockedReasons, []);
  assert.deepEqual(report.suppressedTags, []);
  assert.equal(report.checked.passageId, 'mirror_threshold_soft');
  assert.equal(report.checked.maskId, 'double');
  assert.equal(report.replacementHints.passageIntensityBand, 'dark');
  assert.deepEqual(validateSessionContentGate(report), { valid: true, errors: [] });
});

test('Session Content Gate blocks hard boundaries and intensity overrun without exposing raw input', () => {
  const sessionShapeSelection = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const report = createSessionContentGateReport({
    sessionShapeSelection,
    sessionCovenant: sessionShapeSelection.covenant,
    rawSpeech: 'please never save this phrase',
    passage: {
      id: 'corridor_of_pursuit',
      motifs: ['pursuit', 'mirror'],
      pressureTags: ['pursuit', 'annihilation'],
      formTags: ['body_horror'],
      intensityBand: 'horrific'
    },
    dreamWeather: {
      schema: 'DreamWeatherV1',
      schemaVersion: 1,
      weatherId: 'weather-overrun',
      mood: 'eclipse',
      pressure: 'storm',
      ceiling: 0.78,
      dreadBudget: {
        pursuit: 0.72,
        bodyUnease: 0,
        cosmicDread: 0,
        disorientation: 0,
        loss: 0,
        watching: 0,
        claustrophobia: 0
      },
      weatherTags: ['pursuit', 'shadow'],
      suppressedTags: [],
      atmosphere: {
        lightIntensity: 0.2,
        fogDensity: 0.8,
        bloom: 0.4,
        exposure: 0.2,
        warmth: 0.1,
        movementDrag: 0.7
      }
    },
    dreamJourney: {
      schema: 'DreamJourneyV1',
      beats: [{
        role: 'pressure',
        moduleId: 'space_black_hole',
        moduleName: 'Space / Black Hole',
        symbolicTags: ['annihilation'],
        weightBreakdown: { base: 1, archetype: 0, vibe: 0, room: 0, portal: 0, directorMultiplier: 1, total: 1, roll: 0.2 }
      }],
      symbolTrail: ['annihilation', 'pursuit'],
      summary: 'pressure rises'
    }
  });
  const serialized = JSON.stringify(report);

  assert.equal(report.allowed, false);
  assert.equal(report.playerFacingText, null);
  assert.equal(report.suppressedTags.includes('pursuit'), true);
  assert.equal(report.suppressedTags.includes('body_horror'), true);
  assert.equal(report.blockedReasons.includes('passage.intensityBand.horrific exceeds intensityCeiling 0.28'), true);
  assert.equal(report.blockedReasons.includes('passage.motifs.pursuit crosses hard boundary'), true);
  assert.equal(report.blockedReasons.includes('dreamWeather.dreadBudget.pursuit exceeds intensityCeiling 0.28'), true);
  assert.equal(report.replacementHints.passageIntensityBand, 'gentle');
  assert.equal(report.replacementHints.weatherPressure, 'low');
  assert.equal(serialized.includes('please never save this phrase'), false);
  assert.equal(serialized.includes('rawSpeech'), false);
  assert.deepEqual(validateSessionContentGate(report), { valid: true, errors: [] });
});

test('Session Content Gate validation rejects narration and malformed check packets', () => {
  const selection = createSessionShapeSelection({ shapeId: 'strange_threshold' });
  const report = createSessionContentGateReport({
    sessionShapeSelection: selection,
    sessionCovenant: selection.covenant
  });

  const result = validateSessionContentGate({
    ...report,
    playerFacingText: 'The system softened this because...',
    checked: {
      ...report.checked,
      passageId: 12
    },
    secretReason: 'not allowed'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionContentGate.secretReason is not allowed',
    'checked.passageId must be a string or null',
    'playerFacingText must be null'
  ]);
});

test('Session Content Gate matches dread boundaries across canonical axis spellings', () => {
  const covenant = createSessionCovenant({
    intensityCeiling: 0.7,
    hardBoundaryTags: ['body_unease']
  });
  const report = createSessionContentGateReport({
    sessionCovenant: covenant,
    dreamWeather: {
      weatherId: 'weather-body-axis',
      pressure: 'medium',
      ceiling: 0.5,
      dreadBudget: {
        pursuit: 0,
        bodyUnease: 0.4,
        cosmicDread: 0,
        disorientation: 0,
        loss: 0,
        watching: 0,
        claustrophobia: 0
      },
      weatherTags: []
    }
  });

  assert.equal(report.allowed, false);
  assert.equal(report.blockedReasons.includes('dreamWeather.dreadBudget.bodyUnease crosses hard boundary'), true);
});
