import test from 'node:test';
import assert from 'node:assert/strict';

import { advanceSessionArc, createSessionArc } from '../src/sessionArc.js';

test('session arc deepens while accepted pressure stays within the covenant ceiling', () => {
  const result = advanceSessionArc({
    covenant: { intensityCeiling: 0.62 },
    echoTrace: {
      pressureAccepted: 0.55,
      boundarySignals: [],
      returnAnchorUsed: false
    },
    dreamWeather: {
      pressure: 'uneasy',
      dreadBudget: { watching: 0.4, pursuit: 0.1 }
    },
    seed: 12
  });

  assert.equal(result.arc.schema, 'SessionArcV1');
  assert.equal(result.arc.phase, 'deepening');
  assert.equal(result.directive.decision, 'deepen');
  assert.ok(result.arc.pressure <= 0.62);
  assert.ok(result.arc.returnReadiness < 0.5);
  assert.equal(result.directive.weightOverrides.space_black_hole > 1, true);
});

test('session arc softens and opens return when boundary signals appear', () => {
  const previous = createSessionArc({
    phase: 'deepening',
    beatCount: 4,
    pressure: 0.58,
    returnReadiness: 0.35,
    continuationSeed: 123
  });
  const result = advanceSessionArc({
    previousArc: previous,
    covenant: { intensityCeiling: 0.7 },
    echoTrace: {
      pressureAccepted: 0.2,
      boundarySignals: ['long_pause', 'withdraw'],
      returnAnchorUsed: false
    },
    dreamWeather: {
      pressure: 'heavy',
      dreadBudget: { claustrophobia: 0.5 }
    },
    seed: 12
  });

  assert.equal(result.arc.phase, 'softening');
  assert.equal(result.directive.decision, 'soften');
  assert.equal(result.arc.boundarySignalCount, 2);
  assert.ok(result.arc.pressure < previous.pressure);
  assert.ok(result.arc.returnReadiness > previous.returnReadiness);
  assert.equal(result.directive.returnAvailable, true);
  assert.equal(result.directive.weightOverrides.garden > 1, true);
});

test('session arc returns when duration and pressure ask for a way back', () => {
  const previous = createSessionArc({
    phase: 'mirroring',
    beatCount: 8,
    pressure: 0.66,
    returnReadiness: 0.74,
    continuationSeed: 456
  });
  const result = advanceSessionArc({
    previousArc: previous,
    covenant: { intensityCeiling: 0.8 },
    echoTrace: {
      pressureAccepted: 0.45,
      boundarySignals: [],
      returnAnchorUsed: false
    },
    dreamWeather: {
      pressure: 'heavy',
      dreadBudget: { loss: 0.3 }
    },
    seed: 33
  });

  assert.equal(result.arc.phase, 'returning');
  assert.equal(result.directive.decision, 'return');
  assert.equal(result.directive.suggestedRole, 'return');
  assert.equal(result.directive.returnAvailable, true);
  assert.equal(result.directive.weightOverrides.cabin > 1, true);
});

test('session arc is deterministic from the same inputs and seed', () => {
  const input = {
    covenant: { intensityCeiling: 0.62 },
    echoTrace: {
      pressureAccepted: 0.44,
      boundarySignals: [],
      returnAnchorUsed: false
    },
    dreamWeather: {
      pressure: 'uneasy',
      dreadBudget: { watching: 0.2 }
    },
    dreamerMemoryContext: {
      familiarDreamModules: ['mirror_hall'],
      strongSymbols: ['mirror']
    },
    seed: 91
  };

  assert.deepEqual(advanceSessionArc(input), advanceSessionArc(input));
});
