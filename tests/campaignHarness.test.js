import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { runCampaign } from '../src/campaign.js';
import { loadGameState } from '../src/persistence.js';

test('campaign harness runs multiple dream cycles with Architect feedback', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-campaign-'));
  const savePath = join(dir, 'campaign.json');

  try {
    const result = await runCampaign({
      cycles: 3,
      seed: 91,
      emulateGni: true,
      savePath,
      clock: createDeterministicClock({ startIso: '2070-01-01T00:00:00.000Z' })
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.schema, 'JungialCampaignResultV1');
    assert.equal(result.cycles.length, 3);
    assert.equal(saved.campaign.cycles.length, 3);
    assert.ok(result.cycles[1].dreamJourney.beats.every((beat) => 'directorMultiplier' in beat.weightBreakdown));
    assert.ok(Object.keys(result.architectState.globalDreamWeights).length > 0);
    assert.ok(result.trace.entries.some((entry) => entry.type === 'campaign.cycle.completed'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('campaign harness is deterministic with the same seed and clock', async () => {
  const first = await runCampaign({
    cycles: 2,
    seed: 91,
    emulateGni: true,
    clock: createDeterministicClock({ startIso: '2070-02-01T00:00:00.000Z' })
  });
  const second = await runCampaign({
    cycles: 2,
    seed: 91,
    emulateGni: true,
    clock: createDeterministicClock({ startIso: '2070-02-01T00:00:00.000Z' })
  });

  assert.deepEqual(first.cycles, second.cycles);
  assert.deepEqual(first.architectState, second.architectState);
});
