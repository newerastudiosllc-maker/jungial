import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBundledContentCatalog } from '../src/contentCatalog.js';
import { validateSessionContentReplacementPlan } from '../src/contracts.js';
import { createDreamWeather } from '../src/dreamWeather.js';
import { createSessionContentGateReport } from '../src/sessionContentGate.js';
import { createSessionContentReplacementPlan } from '../src/sessionContentReplacement.js';
import { createSessionShapeSelection } from '../src/sessionShape.js';

test('Session Content Replacement creates a safe internal route when the gate blocks content', () => {
  const catalog = loadBundledContentCatalog();
  const sessionShapeSelection = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const gateReport = createSessionContentGateReport({
    sessionShapeSelection,
    sessionCovenant: sessionShapeSelection.covenant,
    rawSpeech: 'do not carry this sentence into the plan',
    passage: {
      id: 'corridor_of_pursuit',
      motifs: ['pursuit'],
      pressureTags: ['pursuit'],
      formTags: ['body_horror'],
      intensityBand: 'horrific'
    },
    dreamWeather: {
      weatherId: 'weather-overrun',
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
      weatherTags: ['pursuit']
    }
  });

  const plan = createSessionContentReplacementPlan({
    gateReport,
    sessionCovenant: sessionShapeSelection.covenant,
    passages: catalog.passages,
    seed: 414
  });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.schema, 'SessionContentReplacementPlanV1');
  assert.equal(plan.status, 'replacement_required');
  assert.equal(plan.sourceGateId, gateReport.gateId);
  assert.equal(plan.replacement.passage.id, 'candle_refuses_dark');
  assert.equal(plan.replacement.passage.intensityBand, 'gentle');
  assert.equal(plan.replacement.dreamWeather.pressure, 'low');
  assert.equal(plan.replacement.dreamWeather.ceiling <= sessionShapeSelection.covenant.intensityCeiling, true);
  assert.equal(plan.avoidTags.includes('pursuit'), true);
  assert.equal(plan.avoidTags.includes('body_horror'), true);
  assert.deepEqual(plan.routes.map((route) => route.target), ['passage', 'dreamWeather']);
  assert.equal(plan.playerFacingText, null);
  assert.equal(serialized.includes('do not carry this sentence'), false);
  assert.equal(serialized.includes('rawSpeech'), false);
  assert.deepEqual(validateSessionContentReplacementPlan(plan), { valid: true, errors: [] });
});

test('Session Content Replacement creates a no-op plan when the gate allows content', () => {
  const sessionShapeSelection = createSessionShapeSelection({ shapeId: 'dark_mirror' });
  const dreamWeather = createDreamWeather({
    covenant: sessionShapeSelection.covenant,
    weatherTags: ['mirror', 'shadow'],
    seed: 88
  });
  const gateReport = createSessionContentGateReport({
    sessionShapeSelection,
    sessionCovenant: sessionShapeSelection.covenant,
    passage: {
      id: 'mirror_yesterday_room',
      motifs: ['mirror', 'memory'],
      pressureTags: ['reflection'],
      formTags: ['mist_mirror'],
      intensityBand: 'dark'
    },
    dreamWeather
  });

  const plan = createSessionContentReplacementPlan({
    gateReport,
    sessionCovenant: sessionShapeSelection.covenant,
    passages: loadBundledContentCatalog().passages,
    seed: 88
  });

  assert.equal(plan.status, 'not_needed');
  assert.equal(plan.replacement.passage, null);
  assert.equal(plan.replacement.dreamWeather, null);
  assert.deepEqual(plan.routes, []);
  assert.deepEqual(validateSessionContentReplacementPlan(plan), { valid: true, errors: [] });
});
