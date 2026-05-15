import test from 'node:test';
import assert from 'node:assert/strict';

import { applyGniFirebreak } from '../src/gniFirebreak.js';

test('GNI Firebreak suppresses private and hard-boundary directive content', () => {
  const result = applyGniFirebreak({
    source: 'provider',
    request: {
      payload: {
        sessionCovenant: {
          intensityCeiling: 0.35,
          hardBoundaryTags: ['pursuit']
        },
        dreamWeatherContext: {
          suppressedTags: ['claustrophobia']
        }
      }
    },
    rawDirective: {
      dreamWeightDeltas: {
        garden: 1.4,
        pursuit: 0.6,
        raw_private_module: 0.5
      },
      symbolEchoes: ['mirror', 'pursuit', 'raw_childhood_address'],
      maskPressure: {
        double: 0.9,
        claustrophobia: 0.4,
        private_mask: 0.2
      },
      pacingDelta: {
        intensity: 0.9,
        silence: -0.8,
        noise: 1
      },
      rawPrompt: 'do not keep this'
    }
  });

  assert.deepEqual(result.directive.dreamWeightDeltas, { garden: 0.35 });
  assert.deepEqual(result.directive.symbolEchoes, ['mirror']);
  assert.deepEqual(result.directive.maskPressure, { double: 0.35 });
  assert.deepEqual(result.directive.pacingDelta, { intensity: 0.35, silence: -0.35 });
  assert.equal(JSON.stringify(result).includes('do not keep this'), false);
  assert.equal(result.trace.changed, true);
  assert.deepEqual(result.trace.boundaryTags, ['claustrophobia', 'pursuit']);
  assert.deepEqual(result.trace.suppressedCounts, {
    fields: 1,
    dreamWeightDeltas: 2,
    symbolEchoes: 2,
    maskPressure: 2,
    pacingDelta: 1
  });
  assert.deepEqual(result.trace.clampCounts, {
    dreamWeightDeltas: 1,
    maskPressure: 1,
    pacingDelta: 2
  });
});
