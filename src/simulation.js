import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { createJungialRuntime } from './runtime.js';
import { saveGameState } from './persistence.js';
import { GniBridge } from './gniBridge.js';
import { selectDreamJourney } from './dreamJourney.js';
import { SymbolGrammar } from './symbolGrammar.js';
import { createDeterministicClock } from './clock.js';
import { TraceRecorder, writeTrace } from './trace.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export async function runSimulation({
  seed = 777,
  savePath = join(root, 'saves', 'latest-session.json'),
  gniResponse = null,
  gniProvider = null,
  emulateGni = false,
  catalog = undefined,
  clock = undefined,
  trace = undefined,
  tracePath = undefined
} = {}) {
  const traceRecorder = trace ?? new TraceRecorder({ clock: clock?.fork?.() ?? undefined });
  traceRecorder.record('simulation.started', { seed, emulateGni, hasGniResponse: Boolean(gniResponse) });

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

  traceRecorder.record('threshold.input', { kind: 'speech', text: 'the word' });
  chamber.receiveInput({
    kind: 'speech',
    text: 'the word',
    archetypes,
    feeling
  });
  transcript.push('The Heartlight opens. Tools become visible.');
  traceRecorder.record('threshold.awakened', {
    room: chamber.snapshot(),
    vibeState: feeling.vibeState,
    dominantArchetype: archetypes.dominantArchetype()
  });

  witness.observeAction('open_portal', ['Seeker'], ['portal']);
  chamber.openPortal('key_of_portals');
  transcript.push('The Key of Portals turns without sound.');
  traceRecorder.record('portal.opened', { room: chamber.snapshot() });

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
  traceRecorder.record('dream.journey.selected', {
    summary: dreamJourney.summary,
    symbolTrail: dreamJourney.symbolTrail,
    beats: dreamJourney.beats
  });

  const mask = masks.selectEligibleMask(archetypes);
  if (mask) {
    transcript.push(`A presence gathers: ${mask.name}.`);
  }
  traceRecorder.record('mask.selected', {
    maskId: mask?.id ?? null,
    maskName: mask?.name ?? null,
    spawnTrigger: mask?.spawnTrigger ?? null
  });

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
  traceRecorder.record('journal.entry.written', {
    entryId: entry.id,
    symbols: entry.symbols,
    dominantArchetype: entry.dominantArchetype,
    vibeState: entry.vibeState
  });

  const bundle = witness.toSessionBundle({ selectedDream });
  traceRecorder.record('witness.bundle.created', {
    sessionId: bundle.sessionId,
    dominantArchetype: bundle.dominantArchetype,
    coherence: bundle.coherence,
    recentSymbols: bundle.recentSymbols
  });
  const architectUpdate = architect.update(bundle);
  const gniBridge = new GniBridge({ adapter: gni, provider: gniProvider });
  const gniBridgeResult = await gniBridge.processSessionBundle({
    sessionBundle: bundle,
    providedDirective: gniResponse,
    emulate: emulateGni,
    seed
  });
  const gniRequest = gniBridgeResult.request;
  transcript.push(`Architect updates ${Object.keys(architectUpdate.adjustedWeights).length} dream weight(s).`);
  transcript.push(`GNI request prepared as ${gniRequest.contract.inputFormat} -> ${gniRequest.contract.outputFormat}.`);
  traceRecorder.record('gni.request.created', {
    provider: gniRequest.provider,
    endpoint: gniRequest.endpoint,
    contract: gniRequest.contract,
    sessionId: gniRequest.payload.sessionId
  });

  if (gniBridgeResult.source === 'emulator') {
    transcript.push('GNI emulator prepared a directive.');
    traceRecorder.record('gni.emulator.directive.created', {
      directive: gniBridgeResult.directive
    });
  }
  if (gniBridgeResult.source === 'provider' && gniBridgeResult.status === 'directive_ready') {
    transcript.push('GNI provider returned a directive.');
    traceRecorder.record('gni.provider.directive.created', {
      directive: gniBridgeResult.directive
    });
  }
  if (gniBridgeResult.status === 'provider_error') {
    traceRecorder.record('gni.provider.error', { errors: gniBridgeResult.errors });
  }

  const appliedGniDirective = gniBridgeResult.directive;
  const directiveUpdate = appliedGniDirective ? architect.applyDirective(appliedGniDirective) : null;
  if (appliedGniDirective) {
    transcript.push(`GNI directive applied: ${Object.keys(appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
    traceRecorder.record('gni.directive.applied', {
      directive: appliedGniDirective,
      update: directiveUpdate
    });
  }

  traceRecorder.record('simulation.saved', { savePath, tracePath: tracePath ?? null });
  const traceSnapshot = traceRecorder.snapshot();
  await saveGameState(savePath, {
    room: chamber.snapshot(),
    archetypeState: archetypes.snapshot(),
    feelingState: feeling.snapshot(),
    journal: journal.snapshot(),
    architectState: architect.snapshot(),
    dreamJourney,
    symbolGrammar: symbolGrammar.snapshot(),
    trace: traceSnapshot,
    lastSessionBundle: bundle,
    pendingGniRequest: gniRequest,
    gniBridgeResult,
    appliedGniDirective
  }, { clock });
  transcript.push(`Saved session JSON to ${savePath}.`);

  if (tracePath) {
    await writeTrace(tracePath, traceSnapshot);
  }

  return {
    transcript,
    selectedDream,
    dreamJourney,
    entry,
    architectUpdate,
    directiveUpdate,
    gniRequest,
    gniBridgeResult,
    appliedGniDirective,
    trace: traceSnapshot,
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
    } else if (arg.startsWith('--trace=')) {
      options.tracePath = arg.slice('--trace='.length);
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
    clock,
    tracePath: options.tracePath
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of result.transcript) {
      console.log(line);
    }
  }
}
