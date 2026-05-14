import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { createJungialRuntime } from './runtime.js';
import { saveGameState } from './persistence.js';
import { GniEmulator } from './gniEmulator.js';
import { selectDreamJourney } from './dreamJourney.js';
import { SymbolGrammar } from './symbolGrammar.js';
import { createDeterministicClock } from './clock.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export async function runSimulation({
  seed = 777,
  savePath = join(root, 'saves', 'latest-session.json'),
  gniResponse = null,
  emulateGni = false,
  catalog = undefined,
  clock = undefined
} = {}) {
  const {
    archetypes,
    feeling,
    chamber,
    witness,
    architect,
    dreamflow,
    journal,
    masks,
    gni
  } = createJungialRuntime({ seed, catalog, clock });

  const transcript = [];
  transcript.push('Threshold Chamber: silent, dim, confined.');
  transcript.push(`A small note waits: "${chamber.note}".`);

  chamber.receiveInput({
    kind: 'speech',
    text: 'the word',
    archetypes,
    feeling
  });
  transcript.push('The Heartlight opens. Tools become visible.');

  witness.observeAction('open_portal', ['Seeker'], ['portal']);
  chamber.openPortal('key_of_portals');
  transcript.push('The Key of Portals turns without sound.');

  const dreamJourney = selectDreamJourney({
    dreamflow,
    archetypeState: archetypes,
    feelingState: feeling,
    roomConfig: chamber.snapshot()
  });
  const firstBeat = dreamJourney.beats[0];
  const selectedDream = {
    id: firstBeat.moduleId,
    name: firstBeat.moduleName,
    symbolicTags: firstBeat.symbolicTags,
    weightBreakdown: firstBeat.weightBreakdown
  };
  transcript.push(`Dreamflow selects: ${selectedDream.name}.`);
  transcript.push(`Dream journey: ${dreamJourney.summary}.`);

  const mask = masks.selectEligibleMask(archetypes);
  if (mask) {
    transcript.push(`A presence gathers: ${mask.name}.`);
  }

  const symbolGrammar = new SymbolGrammar();
  symbolGrammar.ingest({ symbols: dreamJourney.symbolTrail, vibeState: feeling.vibeState });
  const entry = journal.writeReturnEntry({
    symbols: dreamJourney.symbolTrail,
    actions: archetypes.recentActions(),
    dominantArchetype: archetypes.dominantArchetype(),
    vibeState: feeling.vibeState,
    journey: dreamJourney,
    symbolGrammar
  });
  transcript.push(`Journal of Mirrors: ${entry.text}`);

  const bundle = witness.toSessionBundle({ selectedDream });
  const architectUpdate = architect.update(bundle);
  const gniRequest = gni.createProcessingRequest(bundle);
  transcript.push(`Architect updates ${Object.keys(architectUpdate.adjustedWeights).length} dream weight(s).`);
  transcript.push(`GNI request prepared as ${gniRequest.contract.inputFormat} -> ${gniRequest.contract.outputFormat}.`);

  const emulatedGniResponse = !gniResponse && emulateGni
    ? new GniEmulator({ seed }).processSessionBundle(bundle)
    : null;
  if (emulatedGniResponse) {
    transcript.push('GNI emulator prepared a directive.');
  }
  const appliedGniDirective = gniResponse || emulatedGniResponse ? gni.parseDirective(gniResponse ?? emulatedGniResponse) : null;
  const directiveUpdate = appliedGniDirective ? architect.applyDirective(appliedGniDirective) : null;
  if (appliedGniDirective) {
    transcript.push(`GNI directive applied: ${Object.keys(appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
  }

  await saveGameState(savePath, {
    room: chamber.snapshot(),
    archetypeState: archetypes.snapshot(),
    feelingState: feeling.snapshot(),
    journal: journal.snapshot(),
    architectState: architect.snapshot(),
    dreamJourney,
    symbolGrammar: symbolGrammar.snapshot(),
    lastSessionBundle: bundle,
    pendingGniRequest: gniRequest,
    appliedGniDirective
  }, { clock });
  transcript.push(`Saved session JSON to ${savePath}.`);

  return {
    transcript,
    selectedDream,
    dreamJourney,
    entry,
    architectUpdate,
    directiveUpdate,
    gniRequest,
    appliedGniDirective,
    savePath
  };
}

export function parseSimulationArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      options.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--save=')) {
      options.savePath = arg.slice('--save='.length);
    } else if (arg.startsWith('--gni-response=')) {
      options.gniResponsePath = arg.slice('--gni-response='.length);
    } else if (arg === '--emulate-gni') {
      options.emulateGni = true;
    } else if (arg.startsWith('--clock-start=')) {
      options.clockStartIso = arg.slice('--clock-start='.length);
    } else if (arg.startsWith('--clock-step-ms=')) {
      options.clockStepMs = Number(arg.slice('--clock-step-ms='.length));
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseSimulationArgs(process.argv.slice(2));
  const gniResponse = options.gniResponsePath
    ? JSON.parse(await readFile(options.gniResponsePath, 'utf8'))
    : null;
  const clock = options.clockStartIso
    ? createDeterministicClock({ startIso: options.clockStartIso, stepMs: options.clockStepMs ?? 1000 })
    : undefined;
  const result = await runSimulation({
    seed: options.seed,
    savePath: options.savePath,
    gniResponse,
    emulateGni: options.emulateGni,
    clock
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of result.transcript) {
      console.log(line);
    }
  }
}
