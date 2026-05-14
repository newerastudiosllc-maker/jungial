import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchetypeState } from '../src/archetype.js';
import { FeelingState } from '../src/feeling.js';
import { ThresholdChamber } from '../src/thresholdChamber.js';
import { DreamflowGenerator } from '../src/dreamflow.js';
import { JournalOfMirrors } from '../src/library.js';
import { MaskRegistry } from '../src/masks.js';

test('threshold chamber awakens from input and opens a dream transition', () => {
  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber();

  const result = chamber.receiveInput({
    kind: 'speech',
    text: 'the word',
    archetypes,
    feeling
  });

  assert.equal(result.awakened, true);
  assert.equal(chamber.heartlight.awake, true);
  assert.deepEqual(chamber.visibleToolSigils.map((tool) => tool.id), [
    'key_of_portals',
    'glyph_quill',
    'mirror_lens',
    'lamp_of_forms'
  ]);
  assert.equal(chamber.openPortal('key_of_portals').portalOpen, true);
});

test('dreamflow selects a weighted module and journal writes a return entry', () => {
  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber();
  const dreamflow = new DreamflowGenerator({ seed: 42 });

  archetypes.recordAction('look_into_mirror', ['Shadow', 'Child'], ['mirror', 'self-observation']);
  feeling.nudge({ expansive_confined: -0.5, bright_dark: -0.4 });
  chamber.receiveInput({ kind: 'speech', text: 'the word', archetypes, feeling });

  const selected = dreamflow.selectNext({
    archetypeState: archetypes,
    feelingState: feeling,
    roomConfig: chamber.snapshot()
  });

  assert.ok(['Cabin', 'Garden', 'Boundless White Void', 'Space / Black Hole', 'Mirror Hall'].includes(selected.name));
  assert.ok(selected.weightBreakdown.total > 0);

  const journal = new JournalOfMirrors();
  const entry = journal.writeReturnEntry({
    symbols: selected.symbolicTags,
    actions: ['opened_portal', 'returned'],
    dominantArchetype: archetypes.dominantArchetype(),
    vibeState: feeling.vibeState
  });

  assert.match(entry.text, /I returned with/);
  assert.equal(journal.entries.length, 1);
});

test('mask registry chooses emergent presence from archetype and coherence', () => {
  const archetypes = new ArchetypeState();
  archetypes.recordAction('listen_to_silence', ['Child', 'Shadow'], ['fog']);

  const masks = new MaskRegistry({ seed: 12 });
  const mask = masks.selectEligibleMask(archetypes);

  assert.ok(mask);
  assert.ok(['Mirror Child', 'Ash-Faced One', 'Weaver', 'Jester of Glass', 'Double'].includes(mask.name));
});
