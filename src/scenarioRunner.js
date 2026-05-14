import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createDeterministicClock } from './clock.js';
import { runReplay } from './replay.js';
import { runSimulation } from './simulation.js';
import { stableHash } from './stableHash.js';
import { inspectTrace } from './traceInspector.js';

export async function runScenarioMatrix({ matrix, outDir = 'saves/scenarios' }) {
  await mkdir(outDir, { recursive: true });
  const results = [];

  for (const scenario of matrix.scenarios ?? []) {
    const clock = scenario.clockStartIso
      ? createDeterministicClock({ startIso: scenario.clockStartIso, stepMs: scenario.clockStepMs ?? 1000 })
      : undefined;
    const savePath = join(outDir, `${scenario.id}.save.json`);
    const tracePath = join(outDir, `${scenario.id}.trace.json`);
    const run = scenario.kind === 'replay'
      ? await runReplay({ script: scenario.script, savePath, clock })
      : await runSimulation({
        seed: scenario.seed,
        savePath,
        tracePath,
        emulateGni: scenario.emulateGni ?? false,
        gniResponse: scenario.gniResponse ?? null,
        clock
      });
    const trace = run.trace;
    const traceSummary = inspectTrace(trace);
    const result = summarizeScenarioRun(scenario, run, traceSummary);
    results.push(result);
  }

  const report = {
    schema: 'JungialScenarioReportV1',
    generatedAt: matrix.generatedAt ?? 'deterministic',
    results
  };
  await writeFile(join(outDir, 'scenario-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function summarizeScenarioRun(scenario, run, traceSummary) {
  const selectedDream = run.selectedDream;
  const summary = {
    id: scenario.id,
    kind: scenario.kind,
    selectedDreamId: selectedDream?.id ?? null,
    journeySummary: run.dreamJourney?.summary ?? null,
    journalText: run.entry?.text ?? run.journalEntry?.text ?? '',
    traceEventCount: run.trace?.entries?.length ?? 0,
    traceSummary
  };

  return {
    ...summary,
    hash: stableHash(summary)
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const matrixPath = process.argv[2];
  const outDir = process.argv[3] ?? 'saves/scenarios';
  if (!matrixPath) {
    console.error('Usage: node src/scenarioRunner.js <matrix.json> [outDir]');
    process.exit(1);
  }
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const report = await runScenarioMatrix({ matrix, outDir });
  console.log(JSON.stringify(report, null, 2));
}
