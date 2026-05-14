import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { createJungialRuntime } from './runtime.js';
import { saveGameState } from './persistence.js';
import { selectDreamJourney } from './dreamJourney.js';

export async function runReplay({ script, savePath, clock = undefined }) {
  const runtime = createJungialRuntime({ seed: script.seed ?? 1, clock });
  const transcript = [];

  for (const input of script.inputs ?? []) {
    if (input.kind === 'speech') {
      runtime.chamber.receiveInput({
        kind: 'speech',
        text: input.text,
        archetypes: runtime.archetypes,
        feeling: runtime.feeling
      });
      transcript.push(`speech:${input.text}`);
    }

    if (input.kind === 'action') {
      runtime.witness.observeAction(input.name, input.archetypes ?? [], input.symbols ?? []);
      if (input.name === 'open_portal') {
        runtime.chamber.openPortal('key_of_portals');
      }
      transcript.push(`action:${input.name}`);
    }
  }

  const journey = selectDreamJourney({
    dreamflow: runtime.dreamflow,
    archetypeState: runtime.archetypes,
    feelingState: runtime.feeling,
    roomConfig: runtime.chamber.snapshot()
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
  const bundle = runtime.witness.toSessionBundle({ selectedDream });
  runtime.architect.update(bundle);

  for (const directive of script.gniDirectives ?? []) {
    runtime.architect.applyDirective(directive);
  }

  const result = {
    schema: 'JungialReplayResultV1',
    seed: script.seed ?? 1,
    transcript,
    selectedDream,
    dreamJourney: journey,
    journalEntry,
    sessionBundle: bundle,
    architectState: runtime.architect.snapshot()
  };

  if (savePath) {
    await saveGameState(savePath, {
      replayResult: result,
      architectState: runtime.architect.snapshot(),
      journal: runtime.journal.snapshot(),
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
