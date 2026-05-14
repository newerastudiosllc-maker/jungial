import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ArchetypeState } from '../src/archetype.js';
import { FeelingState } from '../src/feeling.js';
import { ThresholdChamber } from '../src/thresholdChamber.js';
import { WitnessState, ArchitectState, GniAdapter } from '../src/ai.js';
import { JournalOfMirrors } from '../src/library.js';
import { saveGameState, loadGameState } from '../src/persistence.js';
import { loadBundledContentCatalog } from '../src/contentCatalog.js';

test('witness bundles local context and architect updates global weights', async () => {
  const catalog = loadBundledContentCatalog();
  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber({ toolSigils: catalog.toolSigils });
  const witness = new WitnessState({ archetypeState: archetypes, feelingState: feeling, room: chamber });
  const architect = new ArchitectState();

  witness.observeSpeech('the word', ['threshold', 'light']);
  witness.observeAction('open_portal', ['Seeker'], ['portal']);
  const bundle = witness.toSessionBundle({ selectedDream: { id: 'mirror_hall', symbolicTags: ['reflection'] } });

  const update = architect.update(bundle);

  assert.equal(bundle.recentSymbols.includes('portal'), true);
  assert.ok(update.adjustedWeights.mirror_hall > 1);
  assert.equal(architect.symbolFrequency.portal, 1);
});

test('GNI adapter packages session bundle without coupling game systems to provider internals', () => {
  const adapter = new GniAdapter({ endpoint: 'local-gni-placeholder' });
  const request = adapter.createProcessingRequest({
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal', 'light'],
    recentActions: ['open_portal']
  });

  assert.equal(request.provider, 'GNI');
  assert.equal(request.schema, 'GniProcessingRequestV1');
  assert.equal(request.schemaVersion, 1);
  assert.equal(request.endpoint, 'local-gni-placeholder');
  assert.equal(request.contract.outputFormat, 'JungialDirectiveV1');
  assert.deepEqual(request.payload.recentSymbols, ['portal', 'light']);
});

test('persistence saves and loads room, archetypes, journal, and architect state as JSON', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-'));
  const savePath = join(dir, 'save.json');

  try {
    const catalog = loadBundledContentCatalog();
    const archetypes = new ArchetypeState();
    archetypes.recordAction('open_portal', ['Seeker'], ['portal']);
    const chamber = new ThresholdChamber({ toolSigils: catalog.toolSigils });
    chamber.receiveInput({ kind: 'speech', text: 'the word', archetypes, feeling: new FeelingState() });
    const journal = new JournalOfMirrors();
    journal.writeReturnEntry({
      symbols: ['portal'],
      actions: ['open_portal'],
      dominantArchetype: 'Seeker',
      vibeState: 'calm_hopeful_boundless_bright_warm'
    });
    const architect = new ArchitectState();

    await saveGameState(savePath, {
      room: chamber.snapshot(),
      archetypeState: archetypes.snapshot(),
      journal: journal.snapshot(),
      architectState: architect.snapshot()
    });

    const raw = JSON.parse(await readFile(savePath, 'utf8'));
    const loaded = await loadGameState(savePath);

    assert.equal(raw.schema, 'JungialSaveGame');
    assert.equal(raw.payload.room.awakened, true);
    assert.equal(loaded.journal.entries.length, 1);
    assert.ok(loaded.archetypeState.archetype_vector.Seeker > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
