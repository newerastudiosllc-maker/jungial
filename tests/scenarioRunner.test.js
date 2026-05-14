import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runScenarioMatrix } from '../src/scenarioRunner.js';

test('scenario matrix runs mixed simulations and replays with stable hashes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-scenarios-'));

  try {
    const matrix = {
      schema: 'JungialScenarioMatrixV1',
      scenarios: [
        {
          id: 'sim-emulated',
          kind: 'simulation',
          seed: 777,
          emulateGni: true,
          clockStartIso: '2055-01-01T00:00:00.000Z'
        },
        {
          id: 'threshold-replay',
          kind: 'replay',
          clockStartIso: '2055-01-02T00:00:00.000Z',
          script: {
            seed: 44,
            inputs: [
              { kind: 'speech', text: 'the word' },
              { kind: 'action', name: 'open_portal', archetypes: ['Seeker'], symbols: ['portal'] }
            ]
          }
        },
        {
          id: 'two-cycle-campaign',
          kind: 'campaign',
          cycles: 2,
          seed: 91,
          emulateGni: true,
          clockStartIso: '2055-01-03T00:00:00.000Z'
        }
      ]
    };

    const first = await runScenarioMatrix({ matrix, outDir: dir });
    const second = await runScenarioMatrix({ matrix, outDir: dir });

    assert.equal(first.schema, 'JungialScenarioReportV1');
    assert.equal(first.results.length, 3);
    assert.deepEqual(first.results.map((result) => result.id), ['sim-emulated', 'threshold-replay', 'two-cycle-campaign']);
    assert.deepEqual(first.results.map((result) => result.hash), second.results.map((result) => result.hash));
    assert.ok(first.results.every((result) => result.traceEventCount > 0));

    const written = JSON.parse(await readFile(join(dir, 'scenario-report.json'), 'utf8'));
    assert.deepEqual(written.results.map((result) => result.hash), first.results.map((result) => result.hash));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
