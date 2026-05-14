import test from 'node:test';
import assert from 'node:assert/strict';

import { createDreamWeightOverrides } from '../src/directorPolicy.js';
import { DreamflowGenerator } from '../src/dreamflow.js';
import { ArchetypeState } from '../src/archetype.js';
import { FeelingState } from '../src/feeling.js';

test('director policy converts ArchitectState dream weights into Dreamflow multipliers', () => {
  const overrides = createDreamWeightOverrides({
    globalDreamWeights: {
      garden: 1.75,
      mirror_hall: 0.05
    }
  });

  assert.deepEqual(overrides, {
    garden: 1.75,
    mirror_hall: 0.05
  });
});

test('dreamflow scoring applies director multipliers without hiding base reasons', () => {
  const dreamflow = new DreamflowGenerator({
    seed: 1,
    modules: [
      {
        id: 'garden',
        name: 'Garden',
        symbolicTags: ['growth'],
        archetypeAffinities: {},
        vibeAffinities: {},
        baseWeight: 1
      },
      {
        id: 'mirror_hall',
        name: 'Mirror Hall',
        symbolicTags: ['reflection'],
        archetypeAffinities: {},
        vibeAffinities: {},
        baseWeight: 1
      }
    ]
  });

  const scores = dreamflow.scoreModules({
    archetypeState: new ArchetypeState(),
    feelingState: new FeelingState(),
    roomConfig: { boundaryState: 'confined', portalOpen: false },
    weightOverrides: { garden: 2, mirror_hall: 0.25 }
  });

  assert.equal(scores.find((entry) => entry.id === 'garden').weightBreakdown.directorMultiplier, 2);
  assert.equal(scores.find((entry) => entry.id === 'mirror_hall').weightBreakdown.directorMultiplier, 0.25);
  assert.ok(scores.find((entry) => entry.id === 'garden').weightBreakdown.total > scores.find((entry) => entry.id === 'mirror_hall').weightBreakdown.total);
});
