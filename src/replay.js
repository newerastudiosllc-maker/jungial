import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { createJungialRuntime } from './runtime.js';
import { saveGameState } from './persistence.js';
import { selectDreamJourney, toDreamJourneyTracePolicy, toGniDreamJourneyContext } from './dreamJourney.js';
import { TraceRecorder } from './trace.js';
import { applyPlayerInput } from './input.js';

export async function runReplay({ script, savePath, clock = undefined, trace = undefined }) {
  const runtime = createJungialRuntime({ seed: script.seed ?? 1, clock });
  const traceRecorder = trace ?? new TraceRecorder({ clock: clock?.fork?.() ?? undefined });
  const transcript = [];
  traceRecorder.record('replay.started', { seed: script.seed ?? 1, inputCount: script.inputs?.length ?? 0 });

  for (const input of script.inputs ?? []) {
    traceRecorder.record('replay.input', input);
    const application = applyPlayerInput(input, runtime);
    transcript.push(`intent:${application.intent.intent}`);
  }

  const journey = selectDreamJourney({
    dreamflow: runtime.dreamflow,
    archetypeState: runtime.archetypes,
    feelingState: runtime.feeling,
    roomConfig: runtime.chamber.snapshot()
  });
  traceRecorder.record('dream.journey.selected', {
    summary: journey.summary,
    symbolTrail: journey.symbolTrail,
    beats: journey.beats,
    policy: toDreamJourneyTracePolicy(journey)
  });
  const selectedDream = {
    id: journey.beats[0].moduleId,
    name: journey.beats[0].moduleName,
    symbolicTags: journey.beats[0].symbolicTags
  };
  const journalEntry = runtime.journal.writeReturnEntry({
    symbols: journey.symbolTrail,
    actions: runtime.archetypes.recentActions(),
    dominantArchetype: runtime.archetypes.dominantArchetype(),
    vibeState: runtime.feeling.vibeState,
    journey
  });
  traceRecorder.record('journal.entry.written', {
    entryId: journalEntry.id,
    symbols: journalEntry.symbols,
    dominantArchetype: journalEntry.dominantArchetype
  });
  const bundle = runtime.witness.toSessionBundle({ selectedDream });
  bundle.dreamJourneyContext = toGniDreamJourneyContext(journey);
  traceRecorder.record('witness.bundle.created', {
    sessionId: bundle.sessionId,
    dominantArchetype: bundle.dominantArchetype,
    coherence: bundle.coherence,
    dreamJourneyContext: bundle.dreamJourneyContext
  });
  runtime.architect.update(bundle);
  traceRecorder.record('architect.updated', { selectedDreamId: selectedDream.id });

  for (const directive of script.gniDirectives ?? []) {
    runtime.architect.applyDirective(directive);
  }
  traceRecorder.record('replay.completed', { selectedDreamId: selectedDream.id });
  const traceSnapshot = traceRecorder.snapshot();

  const result = {
    schema: 'JungialReplayResultV1',
    seed: script.seed ?? 1,
    transcript,
    selectedDream,
    dreamJourney: journey,
    journalEntry,
    sessionBundle: bundle,
    trace: traceSnapshot,
    architectState: runtime.architect.snapshot()
  };

  if (savePath) {
    await saveGameState(savePath, {
      replayResult: result,
      architectState: runtime.architect.snapshot(),
      journal: runtime.journal.snapshot(),
      trace: traceSnapshot,
      room: runtime.chamber.snapshot(),
      archetypeState: runtime.archetypes.snapshot()
    }, { clock });
  }

  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const scriptPath = process.argv[2];
  if (!scriptPath) {
    console.error('Usage: node src/replay.js <script.json> [save.json]');
    process.exit(1);
  }
  const script = JSON.parse(await readFile(scriptPath, 'utf8'));
  const result = await runReplay({ script, savePath: process.argv[3] });
  console.log(JSON.stringify(result, null, 2));
}
