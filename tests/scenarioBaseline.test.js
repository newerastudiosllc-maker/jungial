import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { compareScenarioBaseline, writeScenarioBaseline } from '../src/scenarioBaseline.js';

const report = {
  schema: 'JungialScenarioReportV1',
  generatedAt: 'deterministic',
  results: [
    {
      id: 'sim-emulated-gni',
      hash: 'hash-one',
      selectedDreamId: 'white_void',
      journeySummary: 'entry:Boundless White Void'
    },
    {
      id: 'threshold-word-replay',
      hash: 'hash-two',
      selectedDreamId: 'garden',
      journeySummary: 'entry:Garden'
    }
  ]
};

test('scenario baseline comparison passes matching report hashes', () => {
  const baseline = {
    schema: 'JungialScenarioBaselineV1',
    scenarios: [
      { id: 'sim-emulated-gni', hash: 'hash-one' },
      { id: 'threshold-word-replay', hash: 'hash-two' }
    ]
  };

  assert.deepEqual(compareScenarioBaseline({ baseline, report }), {
    schema: 'JungialScenarioBaselineCheckV1',
    ok: true,
    matched: ['sim-emulated-gni', 'threshold-word-replay'],
    changed: [],
    missing: [],
    unexpected: []
  });
});

test('scenario baseline comparison reports changed, missing, and unexpected scenarios', () => {
  const baseline = {
    schema: 'JungialScenarioBaselineV1',
    scenarios: [
      { id: 'sim-emulated-gni', hash: 'old-hash' },
      { id: 'removed-scenario', hash: 'old' }
    ]
  };

  const result = compareScenarioBaseline({ baseline, report });

  assert.equal(result.ok, false);
  assert.deepEqual(result.changed, [
    {
      id: 'sim-emulated-gni',
      expectedHash: 'old-hash',
      actualHash: 'hash-one',
      selectedDreamId: 'white_void',
      journeySummary: 'entry:Boundless White Void'
    }
  ]);
  assert.deepEqual(result.missing, ['removed-scenario']);
  assert.deepEqual(result.unexpected, ['threshold-word-replay']);
});

test('scenario baseline writer stores only stable scenario expectations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-baseline-'));
  const path = join(dir, 'baseline.json');

  try {
    const baseline = await writeScenarioBaseline({ report, path });
    const written = JSON.parse(await readFile(path, 'utf8'));

    assert.deepEqual(written, baseline);
    assert.deepEqual(baseline.scenarios, [
      {
        id: 'sim-emulated-gni',
        hash: 'hash-one',
        selectedDreamId: 'white_void',
        journeySummary: 'entry:Boundless White Void'
      },
      {
        id: 'threshold-word-replay',
        hash: 'hash-two',
        selectedDreamId: 'garden',
        journeySummary: 'entry:Garden'
      }
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
