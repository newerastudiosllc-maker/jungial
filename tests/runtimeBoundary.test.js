import test from 'node:test';
import assert from 'node:assert/strict';

import { DreamflowGenerator } from '../src/dreamflow.js';
import { MaskRegistry } from '../src/masks.js';
import { ThresholdChamber } from '../src/thresholdChamber.js';
import { createJungialRuntime } from '../src/runtime.js';
import { runSimulation } from '../src/simulation.js';

const customCatalog = {
  archetypes: ['Hero', 'Shadow', 'Seeker'],
  toolSigils: [
    {
      id: 'key_of_portals',
      name: 'Test Key',
      effect: 'opens_dream_transition'
    }
  ],
  dreamModules: [
    {
      id: 'test_dream',
      name: 'Test Dream',
      symbolicTags: ['test-symbol'],
      archetypeAffinities: { Seeker: 1 },
      vibeAffinities: {},
      baseWeight: 1
    }
  ],
  masks: [
    {
      id: 'test_mask',
      name: 'Test Mask',
      archetypeTags: ['Seeker'],
      material: 'test_material',
      dialogueTone: 'test_tone',
      minCoherence: 0.1
    }
  ]
};

test('gameplay systems require injected content instead of loading bundled data in constructors', () => {
  assert.throws(
    () => new ThresholdChamber(),
    /ThresholdChamber requires toolSigils from a content catalog/
  );
  assert.throws(
    () => new DreamflowGenerator({ seed: 1 }),
    /DreamflowGenerator requires dream modules from a content catalog/
  );
  assert.throws(
    () => new MaskRegistry({ seed: 1 }),
    /MaskRegistry requires masks from a content catalog/
  );
});

test('runtime composition creates gameplay systems from one explicit content catalog', () => {
  const runtime = createJungialRuntime({ seed: 1, catalog: customCatalog });

  assert.equal(runtime.chamber.toolSigils[0].name, 'Test Key');
  assert.equal(runtime.dreamflow.modules[0].id, 'test_dream');
  assert.equal(runtime.masks.masks[0].id, 'test_mask');
});

test('simulation accepts an injected catalog for future UE5 DataAsset bootstrapping', async () => {
  const result = await runSimulation({
    seed: 1,
    catalog: customCatalog,
    savePath: 'saves/runtime-boundary-test.json'
  });

  assert.equal(result.selectedDream.id, 'test_dream');
  assert.equal(result.selectedDream.symbolicTags[0], 'test-symbol');
  assert.match(result.transcript.join('\n'), /Dreamflow selects: Test Dream/);
});
