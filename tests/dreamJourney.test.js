import test from 'node:test';
import assert from 'node:assert/strict';

import { DreamflowGenerator } from '../src/dreamflow.js';
import { createJungialRuntime } from '../src/runtime.js';
import { selectDreamJourney } from '../src/dreamJourney.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';

test('dream journey selects deterministic entry, pressure, mirror, and return beats', () => {
  const runtime = createJungialRuntime({ seed: 7 });
  runtime.chamber.receiveInput({
    kind: 'speech',
    text: 'the word',
    archetypes: runtime.archetypes,
    feeling: runtime.feeling
  });
  runtime.chamber.openPortal('key_of_portals');

  const journey = selectDreamJourney({
    dreamflow: runtime.dreamflow,
    archetypeState: runtime.archetypes,
    feelingState: runtime.feeling,
    roomConfig: runtime.chamber.snapshot()
  });

  assert.deepEqual(journey.beats.map((beat) => beat.role), ['entry', 'pressure', 'mirror', 'return']);
  assert.equal(journey.beats.length, 4);
  assert.ok(journey.symbolTrail.length >= 4);
  assert.equal(journey.summary.includes('entry'), true);
});

test('dream journey suppresses modules that cross covenant hard boundaries', () => {
  const dreamflow = new DreamflowGenerator({
    seed: 10,
    modules: [
      dreamModule('shadow_room', 'Shadow Room', ['shadow'], 50),
      dreamModule('quiet_garden', 'Quiet Garden', ['growth', 'beauty'], 1)
    ]
  });

  const journey = selectDreamJourney({
    dreamflow,
    archetypeState: { archetypeVector: {} },
    feelingState: { axes: {} },
    roomConfig: { portalOpen: true },
    covenant: createSessionCovenant({ hardBoundaryTags: ['shadow'] })
  });

  assert.deepEqual([...new Set(journey.beats.map((beat) => beat.moduleId))], ['quiet_garden']);
  assert.equal(journey.symbolTrail.includes('shadow'), false);
  assert.equal(journey.policy.schema, 'DreamJourneyPolicyV1');
  assert.deepEqual(journey.policy.suppressedModuleIds, ['shadow_room']);
  assert.deepEqual(journey.policy.hardBoundaryTags, ['real_world_self_harm', 'shadow']);
  assert.equal(journey.policy.fallbackUsed, false);
  assert.equal(journey.policy.playerFacingText, null);
});

test('dream journey reroutes blocked weighted picks through compatible allowed symbols', () => {
  const dreamflow = new DreamflowGenerator({
    seed: 21,
    modules: [
      dreamModule('black_star', 'Black Star', ['annihilation', 'rebirth', 'cosmic mystery'], 5000),
      dreamModule('rebirth_garden', 'Rebirth Garden', ['rebirth', 'growth'], 1),
      dreamModule('blank_room', 'Blank Room', ['blankness'], 1)
    ]
  });

  const journey = selectDreamJourney({
    dreamflow,
    archetypeState: { archetypeVector: {} },
    feelingState: { axes: {} },
    roomConfig: { portalOpen: true },
    covenant: createSessionCovenant({ hardBoundaryTags: ['annihilation'] })
  });

  assert.equal(journey.beats.some((beat) => beat.moduleId === 'black_star'), false);
  assert.equal(journey.symbolTrail.includes('annihilation'), false);
  assert.equal(journey.symbolTrail.includes('rebirth'), true);
  assert.deepEqual(journey.policy.replacementRoutes, [
    {
      target: 'dreamModule',
      action: 'replace',
      blockedId: 'black_star',
      selectedId: 'rebirth_garden',
      carriedTags: ['rebirth'],
      suppressedTags: ['annihilation'],
      reason: 'dream_journey_boundary_reroute'
    }
  ]);
});

test('dream journey uses a deterministic hidden fallback when every module is blocked', () => {
  const dreamflow = new DreamflowGenerator({
    seed: 11,
    modules: [
      dreamModule('shadow_room', 'Shadow Room', ['shadow'], 4),
      dreamModule('black_star', 'Black Star', ['annihilation'], 4)
    ]
  });

  const journey = selectDreamJourney({
    dreamflow,
    archetypeState: { archetypeVector: {} },
    feelingState: { axes: {} },
    roomConfig: { portalOpen: true },
    covenant: createSessionCovenant({ hardBoundaryTags: ['shadow', 'annihilation'] })
  });

  assert.deepEqual([...new Set(journey.beats.map((beat) => beat.moduleId))], ['threshold_drift']);
  assert.equal(journey.symbolTrail.includes('shadow'), false);
  assert.equal(journey.symbolTrail.includes('annihilation'), false);
  assert.deepEqual(journey.policy.suppressedModuleIds, ['black_star', 'shadow_room']);
  assert.equal(journey.policy.fallbackUsed, true);
  assert.equal(journey.policy.playerFacingText, null);
});

test('dream journey fallback avoids fallback symbols that are also hard boundaries', () => {
  const dreamflow = new DreamflowGenerator({
    seed: 12,
    modules: [
      dreamModule('shadow_room', 'Shadow Room', ['shadow'], 4)
    ]
  });
  const journey = selectDreamJourney({
    dreamflow,
    archetypeState: { archetypeVector: {} },
    feelingState: { axes: {} },
    roomConfig: { portalOpen: true },
    covenant: createSessionCovenant({
      hardBoundaryTags: ['shadow', 'threshold', 'silence', 'lamp', 'breath', 'awakening']
    })
  });

  assert.deepEqual(journey.symbolTrail, ['note', 'light']);
});

function dreamModule(id, name, symbolicTags, baseWeight) {
  return {
    id,
    name,
    symbolicTags,
    archetypeAffinities: {},
    vibeAffinities: {},
    baseWeight
  };
}
