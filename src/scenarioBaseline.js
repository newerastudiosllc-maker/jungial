import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function compareScenarioBaseline({ baseline, report }) {
  const baselineById = new Map((baseline.scenarios ?? []).map((scenario) => [scenario.id, scenario]));
  const reportById = new Map((report.results ?? []).map((scenario) => [scenario.id, scenario]));
  const matched = [];
  const changed = [];
  const missing = [];
  const unexpected = [];

  for (const [id, expected] of baselineById.entries()) {
    const actual = reportById.get(id);
    if (!actual) {
      missing.push(id);
      continue;
    }

    if (actual.hash === expected.hash) {
      matched.push(id);
    } else {
      changed.push({
        id,
        expectedHash: expected.hash,
        actualHash: actual.hash,
        selectedDreamId: actual.selectedDreamId,
        journeySummary: actual.journeySummary
      });
    }
  }

  for (const id of reportById.keys()) {
    if (!baselineById.has(id)) {
      unexpected.push(id);
    }
  }

  return {
    schema: 'JungialScenarioBaselineCheckV1',
    ok: changed.length === 0 && missing.length === 0 && unexpected.length === 0,
    matched,
    changed,
    missing,
    unexpected
  };
}

export async function writeScenarioBaseline({ report, path }) {
  const baseline = {
    schema: 'JungialScenarioBaselineV1',
    generatedFrom: report.schema,
    scenarios: (report.results ?? []).map((result) => ({
      id: result.id,
      hash: result.hash,
      selectedDreamId: result.selectedDreamId,
      journeySummary: result.journeySummary
    }))
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  return baseline;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === 'write') {
    const reportPath = process.argv[3];
    const baselinePath = process.argv[4];
    if (!reportPath || !baselinePath) {
      console.error('Usage: node src/scenarioBaseline.js write <report.json> <baseline.json>');
      process.exit(1);
    }
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const baseline = await writeScenarioBaseline({ report, path: baselinePath });
    console.log(JSON.stringify(baseline, null, 2));
  } else if (command === 'check') {
    const baselinePath = process.argv[3];
    const reportPath = process.argv[4];
    if (!baselinePath || !reportPath) {
      console.error('Usage: node src/scenarioBaseline.js check <baseline.json> <report.json>');
      process.exit(1);
    }
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const result = compareScenarioBaseline({ baseline, report });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
      process.exitCode = 1;
    }
  } else {
    console.error('Usage: node src/scenarioBaseline.js <write|check> ...');
    process.exit(1);
  }
}
