import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBundledContentCatalog } from '../src/contentCatalog.js';
import { validateSessionContentGate, validateSessionContentReplacementPlan } from '../src/contracts.js';
import { resolveSessionContentSurface } from '../src/sessionContentSurface.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';

test('Session Content Surface replaces blocked passage and weather before the beat is stored', () => {
  const catalog = loadBundledContentCatalog();
  const covenant = createSessionCovenant({
    toneTags: ['gentle'],
    intensityCeiling: 0.28,
    hardBoundaryTags: ['pursuit', 'body_horror']
  });
  const surface = resolveSessionContentSurface({
    sessionCovenant: covenant,
    candidatePassage: {
      schema: 'PassageV1',
      schemaVersion: 1,
      id: 'corridor_of_pursuit',
      motifs: ['pursuit'],
      pressureTags: ['pursuit'],
      formTags: ['body_horror'],
      intensityBand: 'horrific',
      allowedResponseKinds: ['approach', 'wait'],
      returnAnchorTags: ['threshold'],
      variationFamily: 'unsafe_test',
      baseWeight: 1
    },
    candidateDreamWeather: {
      schema: 'DreamWeatherV1',
      schemaVersion: 1,
      weatherId: 'weather-overrun',
      mood: 'gravity',
      pressure: 'storm',
      ceiling: 0.78,
      dreadBudget: {
        pursuit: 0.72,
        bodyUnease: 0.3,
        cosmicDread: 0,
        disorientation: 0,
        loss: 0,
        watching: 0,
        claustrophobia: 0
      },
      weatherTags: ['pursuit'],
      suppressedTags: [],
      atmosphere: {
        lightIntensity: 0.2,
        fogDensity: 0.8,
        bloom: 0.1,
        exposure: 0.2,
        warmth: 0.1,
        movementDrag: 0.8
      }
    },
    passages: catalog.passages,
    seed: 616
  });

  assert.equal(surface.contentGate.allowed, false);
  assert.equal(surface.contentReplacementPlan.status, 'replacement_required');
  assert.equal(surface.passage.id, 'candle_refuses_dark');
  assert.equal(surface.passage.intensityBand, 'gentle');
  assert.equal(surface.dreamWeather.pressure, 'low');
  assert.equal(surface.dreamWeather.ceiling <= covenant.intensityCeiling, true);
  assert.equal(surface.contentReplacementPlan.playerFacingText, null);
  assert.equal(surface.contentGate.playerFacingText, null);
  assert.deepEqual(validateSessionContentGate(surface.contentGate), { valid: true, errors: [] });
  assert.deepEqual(validateSessionContentReplacementPlan(surface.contentReplacementPlan), { valid: true, errors: [] });
});

test('Session Content Surface leaves allowed passage and weather untouched', () => {
  const catalog = loadBundledContentCatalog();
  const candidatePassage = catalog.passages.find((passage) => passage.id === 'candle_refuses_dark');
  const surface = resolveSessionContentSurface({
    sessionCovenant: createSessionCovenant({ intensityCeiling: 0.35 }),
    candidatePassage,
    candidateDreamWeather: {
      schema: 'DreamWeatherV1',
      schemaVersion: 1,
      weatherId: 'weather-soft',
      mood: 'stillness',
      pressure: 'low',
      ceiling: 0.28,
      dreadBudget: {
        pursuit: 0,
        bodyUnease: 0.02,
        cosmicDread: 0.01,
        disorientation: 0.03,
        loss: 0,
        watching: 0.02,
        claustrophobia: 0
      },
      weatherTags: ['silence', 'threshold'],
      suppressedTags: [],
      atmosphere: {
        lightIntensity: 0.7,
        fogDensity: 0.2,
        bloom: 0.3,
        exposure: 0.5,
        warmth: 0.5,
        movementDrag: 0.2
      }
    },
    passages: catalog.passages,
    seed: 617
  });

  assert.equal(surface.contentGate.allowed, true);
  assert.equal(surface.contentReplacementPlan.status, 'not_needed');
  assert.equal(surface.passage, candidatePassage);
  assert.equal(surface.dreamWeather.weatherId, 'weather-soft');
});
