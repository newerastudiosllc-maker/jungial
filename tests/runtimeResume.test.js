import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { loadGameState } from '../src/persistence.js';
import { runCampaign } from '../src/campaign.js';
import { createJungialRuntimeFromSave } from '../src/runtime.js';
import { runSimulation } from '../src/simulation.js';

test('runtime can hydrate chamber, archetypes, journal, and architect from a save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-runtime-resume-'));
  const savePath = join(dir, 'save.json');

  try {
    await runSimulation({
      seed: 777,
      savePath,
      emulateGni: true,
      clock: createDeterministicClock({ startIso: '2080-01-01T00:00:00.000Z' })
    });

    const runtime = await createJungialRuntimeFromSave(savePath, {
      seed: 123,
      clock: createDeterministicClock({ startIso: '2080-01-02T00:00:00.000Z' })
    });
    const journalEntry = runtime.journal.writeReturnEntry({
      symbols: ['portal'],
      actions: runtime.archetypes.recentActions(),
      dominantArchetype: runtime.archetypes.dominantArchetype(),
      vibeState: runtime.feeling.vibeState
    });

    assert.equal(runtime.chamber.portalOpen, true);
    assert.ok(runtime.architect.snapshot().globalDreamWeights.white_void > 1);
    assert.equal(runtime.journal.snapshot().entries.length, 2);
    assert.equal(journalEntry.id, 'journal_002');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('runtime can hydrate pending GNI queue from a save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-runtime-gni-queue-'));
  const savePath = join(dir, 'save.json');

  try {
    await runSimulation({
      seed: 777,
      savePath,
      clock: createDeterministicClock({ startIso: '2080-01-03T00:00:00.000Z' })
    });

    const runtime = await createJungialRuntimeFromSave(savePath, {
      seed: 123,
      clock: createDeterministicClock({ startIso: '2080-01-04T00:00:00.000Z' })
    });

    assert.equal(runtime.gniQueue.snapshot().pending.length, 1);
    assert.equal(runtime.gniQueue.snapshot().pending[0].reason, 'pending');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('campaign can continue from a saved campaign state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-campaign-resume-'));
  const savePath = join(dir, 'campaign.json');

  try {
    const first = await runCampaign({
      cycles: 1,
      seed: 91,
      emulateGni: true,
      savePath,
      clock: createDeterministicClock({ startIso: '2081-01-01T00:00:00.000Z' })
    });
    const saved = await loadGameState(savePath);
    const second = await runCampaign({
      cycles: 1,
      seed: 91,
      emulateGni: true,
      initialState: saved,
      clock: createDeterministicClock({ startIso: '2081-01-02T00:00:00.000Z' })
    });

    assert.ok(saved.feelingState);
    assert.equal(second.cycles[0].journalEntry.id, 'journal_002');
    assert.equal(second.journal.entries.length, 2);
    assert.ok(second.cycles[0].weightOverrides[first.cycles[0].selectedDream.id] > 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
