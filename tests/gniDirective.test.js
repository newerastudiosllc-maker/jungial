import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchitectState, GniAdapter } from '../src/ai.js';

test('GNI directives are normalized before game state can consume them', () => {
  const adapter = new GniAdapter();

  const directive = adapter.parseDirective({
    schema: 'JungialDirectiveV1',
    dreamWeightDeltas: {
      mirror_hall: 12,
      cabin: -12,
      ignored_bad_value: Number.NaN
    },
    symbolEchoes: ['mirror', 7, 'portal', ''],
    maskPressure: {
      double: 4,
      mirror_child: -4
    },
    pacingDelta: {
      intensity: 3,
      repetition: -3,
      impossible_key: 9
    },
    executableSuggestion: 'spawn whatever I say'
  });

  assert.deepEqual(directive.dreamWeightDeltas, {
    mirror_hall: 2,
    cabin: -0.95
  });
  assert.deepEqual(directive.symbolEchoes, ['mirror', 'portal']);
  assert.deepEqual(directive.maskPressure, {
    double: 1,
    mirror_child: -1
  });
  assert.deepEqual(directive.pacingDelta, {
    intensity: 1,
    repetition: -1
  });
  assert.equal('executableSuggestion' in directive, false);
});

test('architect applies normalized GNI directives without allowing negative dream weights', () => {
  const architect = new ArchitectState({
    globalDreamWeights: {
      mirror_hall: 1,
      cabin: 0.2
    },
    pacingProfile: {
      intensity: 0.5,
      repetition: 0.5,
      silence: 0.5
    }
  });

  const result = architect.applyDirective({
    schema: 'JungialDirectiveV1',
    dreamWeightDeltas: {
      mirror_hall: 0.75,
      cabin: -0.95
    },
    symbolEchoes: ['mirror', 'mirror', 'portal'],
    maskPressure: {
      double: 0.25
    },
    pacingDelta: {
      intensity: 0.25,
      silence: -0.9
    }
  });

  assert.equal(result.adjustedWeights.mirror_hall, 1.75);
  assert.equal(result.adjustedWeights.cabin, 0.05);
  assert.equal(result.symbolFrequency.mirror, 2);
  assert.equal(result.symbolFrequency.portal, 1);
  assert.equal(result.maskPressure.double, 0.25);
  assert.equal(result.pacingProfile.intensity, 0.75);
  assert.equal(result.pacingProfile.silence, 0);
});
