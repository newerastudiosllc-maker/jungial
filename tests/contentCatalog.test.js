import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBundledContentCatalog, validateContentCatalog } from '../src/contentCatalog.js';
import { ArchetypeState } from '../src/archetype.js';
import { FeelingState } from '../src/feeling.js';
import { ThresholdChamber } from '../src/thresholdChamber.js';
import { DreamflowGenerator } from '../src/dreamflow.js';
import { MaskRegistry } from '../src/masks.js';

test('bundled JSON content loads into runtime-ready catalog objects', () => {
  const catalog = loadBundledContentCatalog();

  assert.deepEqual(catalog.toolSigils.map((tool) => tool.id), [
    'key_of_portals',
    'glyph_quill',
    'mirror_lens',
    'lamp_of_forms'
  ]);
  assert.equal(catalog.dreamModules.find((module) => module.id === 'mirror_hall').archetypeAffinities.Shadow, 1);
  assert.equal(catalog.dreamModules.find((module) => module.id === 'white_void').vibeAffinities.expansive_confined, 0.8);
  assert.equal(catalog.masks.find((mask) => mask.id === 'double').minCoherence, 0.25);
  assert.ok(catalog.symbolLexicon.some((symbol) => symbol.id === 'threshold'));
});

test('content catalog validation rejects unknown archetype and feeling affinity keys', () => {
  const result = validateContentCatalog({
    archetypes: ['Hero'],
    toolSigils: [],
    dreamModules: [
      {
        id: 'bad_dream',
        name: 'Bad Dream',
        symbolicTags: [],
        baseWeight: 1,
        archetypeAffinities: { NotReal: 1 },
        vibeAffinities: { not_an_axis: 1 }
      }
    ],
    masks: [
      {
        id: 'bad_mask',
        name: 'Bad Mask',
        archetypeTags: ['AlsoNotReal'],
        minCoherence: 0.1
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamModules.bad_dream has unknown archetype affinity NotReal',
    'dreamModules.bad_dream has unknown vibe affinity not_an_axis',
    'masks.bad_mask has unknown archetype tag AlsoNotReal'
  ]);
});

test('content catalog validation rejects dream symbols outside the lexicon', () => {
  const result = validateContentCatalog({
    archetypes: ['Seeker'],
    symbolLexicon: [{ id: 'known_symbol', domain: 'test', note: 'Known.' }],
    toolSigils: [],
    dreamModules: [
      {
        id: 'bad_symbol_dream',
        name: 'Bad Symbol Dream',
        symbolicTags: ['unknown_symbol'],
        baseWeight: 1,
        archetypeAffinities: {},
        vibeAffinities: {}
      }
    ],
    masks: []
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamModules.bad_symbol_dream has unknown symbolic tag unknown_symbol'
  ]);
});

test('chamber, dreamflow, and masks can run entirely from bundled content catalog', () => {
  const catalog = loadBundledContentCatalog();
  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber({ toolSigils: catalog.toolSigils });
  const dreamflow = new DreamflowGenerator({ seed: 5, modules: catalog.dreamModules });
  const masks = new MaskRegistry({ seed: 5, masks: catalog.masks });

  chamber.receiveInput({ kind: 'speech', text: 'the word', archetypes, feeling });
  chamber.openPortal('key_of_portals');
  archetypes.recordAction('look_into_mirror', ['Shadow'], ['mirror']);

  const selectedDream = dreamflow.selectNext({
    archetypeState: archetypes,
    feelingState: feeling,
    roomConfig: chamber.snapshot()
  });
  const mask = masks.selectEligibleMask(archetypes);

  assert.ok(catalog.dreamModules.some((module) => module.id === selectedDream.id));
  assert.ok(catalog.masks.some((candidate) => candidate.id === mask.id));
});

test('bundled Passage catalog loads into runtime-ready catalog objects', () => {
  const catalog = loadBundledContentCatalog();

  assert.ok(catalog.passages.length >= 5);
  const door = catalog.passages.find((passage) => passage.id === 'door_breathing_low');
  assert.deepEqual(door.motifs, ['door', 'breath', 'threshold']);
  assert.equal(door.intensityBand, 'strange');
  assert.equal(door.variationFamily, 'threshold_doors');
});

test('content catalog validation rejects malformed Passage content', () => {
  const result = validateContentCatalog({
    archetypes: ['Seeker'],
    symbolLexicon: [{ id: 'known_symbol', domain: 'test', note: 'Known.' }],
    toolSigils: [],
    dreamModules: [],
    masks: [],
    passages: [
      {
        id: 'bad_passage',
        motifs: ['unknown_symbol'],
        pressureTags: ['unknown'],
        formTags: [],
        intensityBand: 'too_much',
        allowedResponseKinds: [],
        returnAnchorTags: ['missing_anchor'],
        variationFamily: ''
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'passages.bad_passage has unknown motif unknown_symbol',
    'passages.bad_passage has unknown return anchor missing_anchor',
    'passages.bad_passage has unsupported intensity band too_much',
    'passages.bad_passage variationFamily is required'
  ]);
});
