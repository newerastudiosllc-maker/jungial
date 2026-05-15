import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { createDeterministicClock } from './clock.js';
import { createDreamSessionCheckpoint, resumeDreamSessionFromRuntime, runDreamSessionFromRuntime } from './dreamSession.js';
import { toGniWeatherContext } from './dreamWeather.js';
import { GniBridge } from './gniBridge.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { applyPlayerInput } from './input.js';
import { buildThresholdPresentation } from './presentation.js';
import { loadGameState, saveGameState } from './persistence.js';
import { toGniPassageContext } from './passageLattice.js';
import { createJungialRuntime, createJungialRuntimeFromSave } from './runtime.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { SymbolGrammar } from './symbolGrammar.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const DEFAULT_MAX_BEATS = 5;
const DEFAULT_CHECKPOINT_AFTER_BEATS = 2;

export async function startDreamSessionCheckpointRun({
  seed = 777,
  savePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  maxBeats = DEFAULT_MAX_BEATS,
  checkpointAfterBeats = DEFAULT_CHECKPOINT_AFTER_BEATS,
  responses = [],
  sessionCovenant = null,
  catalog = undefined,
  clock = undefined
} = {}) {
  const runtime = createJungialRuntime({ seed, catalog, clock });
  const activeSessionCovenant = createSessionCovenant(sessionCovenant ?? {});
  const transcript = prepareThreshold(runtime);
  const dreamSession = runDreamSessionFromRuntime({
    runtime,
    covenant: activeSessionCovenant,
    seed,
    maxBeats,
    beatsToRun: normalizeCheckpointBeatCount({ checkpointAfterBeats, maxBeats }),
    responses
  });
  const checkpoint = createDreamSessionCheckpoint(dreamSession);
  const savePayload = createDreamSessionSavePayload({
    runtime,
    dreamSession,
    checkpoint,
    sessionCovenant: activeSessionCovenant
  });

  await saveGameState(savePath, savePayload, { clock });
  transcript.push(`Dream session checkpoint saved to ${savePath}.`);

  return {
    transcript,
    dreamSession,
    checkpoint,
    thresholdPresentation: savePayload.thresholdPresentation,
    sessionCovenant: activeSessionCovenant,
    savePath
  };
}

export async function resumeDreamSessionCheckpointRun({
  savePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  outputPath = savePath,
  responses = [],
  beatsToRun = null,
  stopWhenReturnAvailable = false,
  sessionCovenant = null,
  dreamerMemoryContext = null,
  gniResponse = null,
  gniProvider = null,
  emulateGni = false,
  catalog = undefined,
  clock = undefined
} = {}) {
  const savedState = await loadGameState(savePath);
  const checkpoint = savedState.dreamSessionCheckpoint;

  if (!checkpoint || checkpoint.schema !== 'DreamSessionCheckpointV1') {
    throw new Error('resumeDreamSessionCheckpointRun requires a save with DreamSessionCheckpointV1');
  }

  const runtime = await createJungialRuntimeFromSave(savePath, {
    seed: checkpoint.seed,
    catalog,
    clock
  });
  const activeSessionCovenant = createSessionCovenant(sessionCovenant ?? savedState.sessionCovenant ?? {});
  const dreamSession = resumeDreamSessionFromRuntime({
    runtime,
    checkpoint,
    covenant: activeSessionCovenant,
    responses,
    beatsToRun,
    stopWhenReturnAvailable,
    dreamerMemoryContext
  });
  const resumedCheckpoint = createDreamSessionCheckpoint(dreamSession);
  const shouldApplyReturnEffects = !checkpoint.isComplete && resumedCheckpoint.isComplete;
  const returnEffects = shouldApplyReturnEffects
    ? applyDreamReturnEffects({ runtime, dreamSession, sessionCovenant: activeSessionCovenant })
    : null;
  const gniEffects = returnEffects
    ? await processDreamReturnGni({
        runtime,
        returnEffects,
        gniResponse,
        gniProvider,
        emulateGni,
        seed: dreamSession.seed
      })
    : null;
  const savePayload = createDreamSessionSavePayload({
    runtime,
    dreamSession,
    checkpoint: resumedCheckpoint,
    sessionCovenant: activeSessionCovenant,
    returnEffects,
    gniEffects,
    previousState: savedState
  });
  const transcript = ['Dream session resumed from checkpoint.'];

  if (returnEffects?.entry) {
    transcript.push(`Journal of Mirrors: ${returnEffects.entry.text}`);
    transcript.push(`Architect updates ${Object.keys(returnEffects.architectUpdate.adjustedWeights).length} dream weight(s).`);
    transcript.push(`GNI request prepared as ${gniEffects.pendingGniRequest.contract.inputFormat} -> ${gniEffects.pendingGniRequest.contract.outputFormat}.`);
    if (gniEffects.appliedGniDirective) {
      transcript.push(`GNI directive applied: ${Object.keys(gniEffects.appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
    } else if (gniEffects.queuedGniRequest) {
      transcript.push('GNI request queued for later processing.');
    }
  } else if (!resumedCheckpoint.isComplete) {
    transcript.push(`Dream session checkpoint saved to ${outputPath}.`);
  } else {
    transcript.push('Dream session was already complete; no new return entry was written.');
  }

  await saveGameState(outputPath, savePayload, { clock });

  return {
    transcript,
    dreamSession,
    checkpoint: resumedCheckpoint,
    entry: returnEffects?.entry ?? null,
    architectUpdate: returnEffects?.architectUpdate ?? null,
    gniRequest: gniEffects?.pendingGniRequest ?? null,
    gniBridgeResult: gniEffects?.gniBridgeResult ?? null,
    gniQueue: runtime.gniQueue.snapshot(),
    appliedGniDirective: gniEffects?.appliedGniDirective ?? null,
    directiveUpdate: gniEffects?.directiveUpdate ?? null,
    thresholdPresentation: savePayload.thresholdPresentation,
    sessionCovenant: activeSessionCovenant,
    savePath,
    outputPath
  };
}

export async function runDreamSessionCheckpointDemo({
  seed = 777,
  checkpointSavePath = join(root, 'saves', 'dream-session-checkpoint.json'),
  finalSavePath = join(root, 'saves', 'dream-session-resumed.json'),
  sessionCovenant = {
    toneTags: ['strange', 'dark'],
    intensityCeiling: 0.62
  },
  gniResponse = null,
  gniProvider = null,
  emulateGni = false,
  clock = undefined,
  catalog = undefined
} = {}) {
  const start = await startDreamSessionCheckpointRun({
    seed,
    savePath: checkpointSavePath,
    maxBeats: DEFAULT_MAX_BEATS,
    checkpointAfterBeats: DEFAULT_CHECKPOINT_AFTER_BEATS,
    sessionCovenant,
    catalog,
    clock,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.46 }
    ]
  });
  const resumed = await resumeDreamSessionCheckpointRun({
    savePath: checkpointSavePath,
    outputPath: finalSavePath,
    sessionCovenant,
    gniResponse,
    gniProvider,
    emulateGni,
    catalog,
    clock,
    responses: [
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
      {
        kind: 'return_anchor',
        gestureTags: ['touched_note'],
        pressureAccepted: 0.2,
        returnAnchorUsed: true
      }
    ]
  });

  return {
    checkpointSavePath,
    finalSavePath,
    start,
    resumed,
    transcript: [...start.transcript, ...resumed.transcript]
  };
}

export function parseDreamSessionSaveFlowArgs(args = []) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      options.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--checkpoint-save=')) {
      options.checkpointSavePath = arg.slice('--checkpoint-save='.length);
    } else if (arg.startsWith('--final-save=')) {
      options.finalSavePath = arg.slice('--final-save='.length);
    } else if (arg.startsWith('--gni-response=')) {
      options.gniResponsePath = arg.slice('--gni-response='.length);
    } else if (arg === '--emulate-gni') {
      options.emulateGni = true;
    } else if (arg.startsWith('--gni-endpoint=')) {
      options.gniEndpoint = arg.slice('--gni-endpoint='.length);
    } else if (arg.startsWith('--gni-token-env=')) {
      options.gniTokenEnv = arg.slice('--gni-token-env='.length);
    } else if (arg.startsWith('--gni-timeout-ms=')) {
      options.gniTimeoutMs = Number(arg.slice('--gni-timeout-ms='.length));
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

export function createGniProviderFromDreamSessionOptions(options = {}) {
  if (!options.gniEndpoint) {
    return null;
  }

  const tokenEnv = options.gniTokenEnv ?? 'GNI_API_KEY';
  return new GniHttpProvider({
    endpoint: options.gniEndpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: Number.isFinite(options.gniTimeoutMs) ? options.gniTimeoutMs : 10000
  });
}

function prepareThreshold(runtime) {
  const transcript = [];

  transcript.push('Threshold Chamber: silent, dim, confined.');
  transcript.push(`A small note waits: "${runtime.chamber.note}".`);
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  transcript.push('The Heartlight opens. Tools become visible.');
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);
  transcript.push('The Key of Portals turns without sound.');

  return transcript;
}

function applyDreamReturnEffects({ runtime, dreamSession, sessionCovenant }) {
  const dreamJourney = createDreamSessionJourney(dreamSession);
  const symbolGrammar = createDreamSessionSymbolGrammar({
    dreamSession,
    vibeState: runtime.feeling.vibeState
  });
  const entry = runtime.journal.writeReturnEntry({
    symbols: dreamJourney.symbolTrail,
    actions: runtime.archetypes.recentActions(),
    dominantArchetype: runtime.archetypes.dominantArchetype(),
    vibeState: runtime.feeling.vibeState,
    journey: dreamJourney,
    symbolGrammar
  });
  const lastBeat = dreamSession.beats.at(-1) ?? null;
  const bundle = runtime.witness.toSessionBundle({ selectedDream: dreamSession.finalSelectedDream });

  bundle.sessionCovenant = sessionCovenant;
  bundle.passageContext = toGniPassageContext({
    activePassage: lastBeat?.passage ?? null,
    recentEchoTraces: dreamSession.recentEchoTraces
  });
  bundle.dreamWeatherContext = toGniWeatherContext({
    dreamWeather: dreamSession.finalDreamWeather,
    weatherTrace: lastBeat?.weatherTrace ?? null
  });

  return {
    entry,
    dreamJourney,
    symbolGrammar,
    sessionBundle: bundle,
    architectUpdate: runtime.architect.update(bundle)
  };
}

async function processDreamReturnGni({
  runtime,
  returnEffects,
  gniResponse,
  gniProvider,
  emulateGni,
  seed
}) {
  const gniBridge = new GniBridge({ adapter: runtime.gni, provider: gniProvider });
  const gniBridgeResult = await gniBridge.processSessionBundle({
    sessionBundle: returnEffects.sessionBundle,
    providedDirective: gniResponse,
    emulate: emulateGni,
    seed
  });
  const pendingGniRequest = gniBridgeResult.request;
  const appliedGniDirective = gniBridgeResult.directive;
  const queuedGniRequest = !appliedGniDirective && pendingGniRequest
    ? runtime.gniQueue.enqueue({
        request: pendingGniRequest,
        reason: gniBridgeResult.status,
        providerJob: gniBridgeResult.providerJob
      })
    : null;
  const directiveUpdate = appliedGniDirective
    ? runtime.architect.applyDirective(appliedGniDirective)
    : null;

  return {
    pendingGniRequest,
    gniBridgeResult,
    queuedGniRequest,
    appliedGniDirective,
    directiveUpdate
  };
}

function createDreamSessionSavePayload({
  runtime,
  dreamSession,
  checkpoint,
  sessionCovenant,
  returnEffects = null,
  gniEffects = null,
  previousState = {}
}) {
  const lastBeat = dreamSession.beats.at(-1) ?? null;
  const dreamJourney = returnEffects?.dreamJourney
    ?? previousState.dreamJourney
    ?? (checkpoint.isComplete ? createDreamSessionJourney(dreamSession) : null);
  const symbolGrammar = returnEffects?.symbolGrammar?.snapshot?.()
    ?? previousState.symbolGrammar
    ?? (checkpoint.isComplete
      ? createDreamSessionSymbolGrammar({ dreamSession, vibeState: runtime.feeling.vibeState }).snapshot()
      : new SymbolGrammar().snapshot());
  const thresholdPresentation = buildThresholdPresentation({
    chamber: runtime.chamber,
    feeling: runtime.feeling,
    dreamWeather: dreamSession.finalDreamWeather,
    sessionCovenant
  });

  return stripUndefined({
    room: runtime.chamber.snapshot(),
    archetypeState: runtime.archetypes.snapshot(),
    feelingState: runtime.feeling.snapshot(),
    journal: runtime.journal.snapshot(),
    architectState: runtime.architect.snapshot(),
    dreamSession,
    dreamSessionCheckpoint: checkpoint,
    dreamJourney,
    symbolGrammar,
    thresholdPresentation,
    sessionCovenant,
    activePassage: lastBeat?.passage ?? previousState.activePassage ?? null,
    echoTrace: lastBeat?.echoTrace ?? previousState.echoTrace ?? null,
    dreamWeather: dreamSession.finalDreamWeather ?? previousState.dreamWeather ?? null,
    weatherTrace: lastBeat?.weatherTrace ?? previousState.weatherTrace ?? null,
    lastSessionBundle: returnEffects?.sessionBundle ?? previousState.lastSessionBundle,
    pendingGniRequest: gniEffects?.pendingGniRequest ?? previousState.pendingGniRequest,
    gniBridgeResult: gniEffects?.gniBridgeResult ?? previousState.gniBridgeResult,
    appliedGniDirective: gniEffects ? gniEffects.appliedGniDirective : previousState.appliedGniDirective,
    directiveUpdate: gniEffects ? gniEffects.directiveUpdate : previousState.directiveUpdate,
    gniQueue: runtime.gniQueue.snapshot()
  });
}

function createDreamSessionJourney(dreamSession) {
  const beats = dreamSession.beats.map((beat) => ({
    role: beat.arcDirective?.suggestedRole ?? 'entry',
    moduleId: beat.selectedDream?.id ?? null,
    moduleName: beat.selectedDream?.name ?? 'Unknown',
    symbolicTags: [...(beat.selectedDream?.symbolicTags ?? [])],
    weightBreakdown: { ...(beat.selectedDream?.weightBreakdown ?? {}) }
  }));
  const symbolTrail = uniqueTags(beats.flatMap((beat) => beat.symbolicTags));

  return {
    schema: 'DreamJourneyV1',
    beats,
    symbolTrail,
    summary: beats.map((beat) => `${beat.role}:${beat.moduleName}`).join(' -> ')
  };
}

function createDreamSessionSymbolGrammar({ dreamSession, vibeState }) {
  const grammar = new SymbolGrammar();

  for (const beat of dreamSession.beats) {
    grammar.ingest({
      symbols: beat.selectedDream?.symbolicTags ?? [],
      vibeState
    });
  }

  return grammar;
}

function normalizeCheckpointBeatCount({ checkpointAfterBeats, maxBeats }) {
  const beatLimit = Number.isInteger(Number(maxBeats)) ? Math.max(1, Number(maxBeats)) : DEFAULT_MAX_BEATS;
  const requested = Number.isInteger(Number(checkpointAfterBeats))
    ? Number(checkpointAfterBeats)
    : DEFAULT_CHECKPOINT_AFTER_BEATS;
  const largestIncompleteBeat = Math.max(1, beatLimit - 1);

  return Math.max(1, Math.min(requested, largestIncompleteBeat));
}

function uniqueTags(tags = []) {
  return [...new Set(tags.filter(Boolean))];
}

function stripUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseDreamSessionSaveFlowArgs(process.argv.slice(2));
  const clock = options.clockStartIso
    ? createDeterministicClock({ startIso: options.clockStartIso, stepMs: options.clockStepMs ?? 1000 })
    : undefined;
  const gniResponse = options.gniResponsePath
    ? JSON.parse(await readFile(options.gniResponsePath, 'utf8'))
    : null;
  const result = await runDreamSessionCheckpointDemo({
    ...options,
    gniResponse,
    gniProvider: createGniProviderFromDreamSessionOptions(options),
    clock
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.transcript.join('\n'));
    console.log(`Checkpoint save: ${result.checkpointSavePath}`);
    console.log(`Final save: ${result.finalSavePath}`);
  }
}
