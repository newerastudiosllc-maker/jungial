import test from 'node:test';
import assert from 'node:assert/strict';

import { createJungialRuntime } from '../src/runtime.js';
import { selectDreamJourney } from '../src/dreamJourney.js';

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
