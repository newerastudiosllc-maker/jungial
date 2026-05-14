import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

export function inspectTrace(trace) {
  const eventCounts = {};
  for (const entry of trace.entries ?? []) {
    eventCounts[entry.type] = (eventCounts[entry.type] ?? 0) + 1;
  }

  const journey = findLastEntry(trace.entries ?? [], 'dream.journey.selected');

  return {
    schema: 'JungialTraceSummaryV1',
    runId: trace.runId,
    eventCounts,
    journeySummary: journey?.payload?.summary ?? null,
    symbolTrail: journey?.payload?.symbolTrail ?? [],
    gniRequestCount: eventCounts['gni.request.created'] ?? 0,
    gniDirectiveCount: eventCounts['gni.directive.applied'] ?? 0
  };
}

function findLastEntry(entries, type) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index].type === type) {
      return entries[index];
    }
  }
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tracePath = process.argv[2];
  if (!tracePath) {
    console.error('Usage: node src/traceInspector.js <trace.json>');
    process.exit(1);
  }
  const trace = JSON.parse(await readFile(tracePath, 'utf8'));
  console.log(JSON.stringify(inspectTrace(trace), null, 2));
}
