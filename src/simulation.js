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
import { applyPlayerInput } from './input.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { buildThresholdPresentation } from './presentation.js';
import { DreamerProfile } from './dreamerProfile.js';
import { prepareSaveSlot } from './saveSlotManager.js';
import { advanceSessionArc } from './sessionArc.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { createEchoTrace, selectPassage, toGniPassageContext } from './passageLattice.js';
import { createDreamWeather, createWeatherTrace, toGniWeatherContext } from './dreamWeather.js';
import { deriveSessionCovenantFromListening, runFirstListeningSequence } from './firstListening.js';
import { createExperienceDirective } from './experienceDirector.js';

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
  tracePath = undefined,
  dreamerProfile = null,
  saveSlotId = 'default',
  saveMode = 'continue',
  incarnationIndex = null,
  sessionArc = null,
  sessionCovenant = null,
  firstListening = false,
  firstListeningBeats = undefined,
  passageResponse = null,
  recentEchoTraces = []
} = {}) {
  const saveSlot = shouldPrepareSaveSlot({ dreamerProfile, saveSlotId, saveMode, incarnationIndex })
    ? prepareSaveSlot({
        profileSnapshot: dreamerProfile,
        slotId: saveSlotId,
        mode: saveMode,
        incarnationIndex,
        clock: clock?.fork?.() ?? undefined
      })
    : null;
  const effectiveSeed = saveSlot?.runSeed ?? seed;
  const traceRecorder = trace ?? new TraceRecorder({ clock: clock?.fork?.() ?? undefined });
  traceRecorder.record('simulation.started', {
    seed: effectiveSeed,
    emulateGni,
    hasGniResponse: Boolean(gniResponse),
    ...(saveSlot
      ? {
          requestedSeed: seed,
          saveMode: saveSlot.mode,
          saveSlotId: saveSlot.slotId
        }
      : {})
  });

  const {
    catalog: contentCatalog,
    archetypes,
    feeling,
    chamber,
    witness,
    architect,
    dreamflow,
    journal,
    masks,
    gni,
    gniQueue
  } = createJungialRuntime({ seed: effectiveSeed, catalog, clock });
  const dreamer = saveSlot?.profile
    ? new DreamerProfile(saveSlot.profile, { clock: clock?.fork?.() ?? undefined })
    : dreamerProfile
      ? new DreamerProfile(dreamerProfile, { clock: clock?.fork?.() ?? undefined })
      : null;
  const activeSaveSlotId = saveSlot?.slotId ?? saveSlotId;
  const activeSaveMode = saveSlot?.mode ?? saveMode;
  const dreamerMemoryContext = saveSlot?.dreamerMemoryContext
    ?? (dreamer ? dreamer.toGniMemoryContext({ slotId: activeSaveSlotId, mode: activeSaveMode }) : null);
  const firstListeningRun = firstListening
    ? runFirstListeningSequence({
        seed: effectiveSeed,
        beats: firstListeningBeats
      })
    : null;
  const activeSessionCovenant = firstListeningRun
    ? deriveSessionCovenantFromListening({
        listeningRun: firstListeningRun,
        explicitSessionSettings: sessionCovenant ?? {}
      })
    : createSessionCovenant(sessionCovenant ?? {});

  const transcript = [];
  transcript.push('Threshold Chamber: silent, dim, confined.');
  transcript.push(`A small note waits: "${chamber.note}".`);
  if (firstListeningRun) {
    transcript.push('The room listens before the key turns.');
    recordFirstListeningTrace(traceRecorder, firstListeningRun);
  }

  traceRecorder.record('threshold.input', { kind: 'speech', text: 'the word' });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, {
    archetypes,
    feeling,
    chamber,
    witness
  });
  transcript.push('The Heartlight opens. Tools become visible.');
  traceRecorder.record('threshold.awakened', {
    room: chamber.snapshot(),
    vibeState: feeling.vibeState,
    dominantArchetype: archetypes.dominantArchetype()
  });

  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, {
    archetypes,
    feeling,
    chamber,
    witness
  });
  transcript.push('The Key of Portals turns without sound.');
  traceRecorder.record('portal.opened', { room: chamber.snapshot() });

  const weatherPreview = createDreamWeather({
    covenant: activeSessionCovenant,
    archetypeVector: { ...archetypes.archetypeVector },
    vibeState: feeling.vibeState,
    dreamerMemoryContext,
    recentEchoTraces,
    seed
  });
  const passageSelection = selectPassage({
    passages: contentCatalog.passages,
    covenant: activeSessionCovenant,
    seed,
    recentEchoTraces,
    dreamerMemoryContext,
    architectState: architect.snapshot(),
    dreamWeather: weatherPreview
  });
  const activePassage = passageSelection.passage;
  const echoTrace = createEchoTrace({
    passage: activePassage,
    response: passageResponse ?? { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 }
  });
  transcript.push(`A Passage gathers: ${activePassage.id}.`);
  traceRecorder.record('passage.gathered', {
    passageId: activePassage.id,
    motifs: activePassage.motifs,
    intensityBand: activePassage.intensityBand
  });
  traceRecorder.record('echo.trace.created', echoTrace);

  const sessionArcAdvance = advanceSessionArc({
    previousArc: sessionArc,
    covenant: activeSessionCovenant,
    echoTrace,
    dreamWeather: weatherPreview,
    dreamerMemoryContext,
    seed: effectiveSeed
  });
  const activeSessionArc = sessionArcAdvance.arc;
  const sessionArcDirective = sessionArcAdvance.directive;
  traceRecorder.record('session.arc.advanced', {
    phase: activeSessionArc.phase,
    beatCount: activeSessionArc.beatCount,
    pressure: activeSessionArc.pressure,
    returnReadiness: activeSessionArc.returnReadiness,
    decision: sessionArcDirective.decision,
    suggestedRole: sessionArcDirective.suggestedRole,
    returnAvailable: sessionArcDirective.returnAvailable,
    weightOverrides: sessionArcDirective.weightOverrides
  });

  const dreamJourney = selectDreamJourney({
    dreamflow,
    archetypeState: archetypes,
    feelingState: feeling,
    roomConfig: chamber.snapshot(),
    weightOverrides: sessionArcDirective.weightOverrides
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
  const currentEchoTraces = [...recentEchoTraces, echoTrace];
  const weatherSourceTags = [
    ...(selectedDream.symbolicTags ?? []),
    ...(activePassage.motifs ?? []),
    ...(activePassage.pressureTags ?? [])
  ];
  const dreamWeather = createDreamWeather({
    covenant: activeSessionCovenant,
    archetypeVector: { ...archetypes.archetypeVector },
    vibeState: feeling.vibeState,
    dreamerMemoryContext,
    selectedDream,
    activePassage,
    recentEchoTraces: currentEchoTraces,
    weatherTags: weatherSourceTags,
    seed
  });
  const weatherTrace = createWeatherTrace({
    weather: dreamWeather,
    sourceTags: weatherSourceTags,
    seed
  });
  traceRecorder.record('dream.weather.created', {
    weatherId: dreamWeather.weatherId,
    traceId: weatherTrace.traceId,
    mood: dreamWeather.mood,
    pressure: dreamWeather.pressure,
    weatherTags: dreamWeather.weatherTags,
    sourceTags: weatherTrace.sourceTags,
    suppressedTags: weatherTrace.suppressedTags
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
  if (dreamer) {
    bundle.dreamerMemoryContext = dreamerMemoryContext;
  }
  bundle.sessionCovenant = activeSessionCovenant;
  bundle.passageContext = toGniPassageContext({
    activePassage,
    recentEchoTraces: currentEchoTraces
  });
  bundle.dreamWeatherContext = toGniWeatherContext({ dreamWeather, weatherTrace });
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
  if (gniBridgeResult.firebreakTrace?.changed) {
    traceRecorder.record('gni.firebreak.applied', {
      source: gniBridgeResult.firebreakTrace.source,
      suppressedCounts: gniBridgeResult.firebreakTrace.suppressedCounts,
      clampCounts: gniBridgeResult.firebreakTrace.clampCounts,
      boundaryTags: gniBridgeResult.firebreakTrace.boundaryTags
    });
  }

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
  if (!appliedGniDirective && gniBridgeResult.request) {
    const queued = gniQueue.enqueue({
      request: gniBridgeResult.request,
      reason: gniBridgeResult.status,
      providerJob: gniBridgeResult.providerJob
    });
    traceRecorder.record('gni.request.queued', {
      id: queued.id,
      reason: queued.reason,
      sessionId: gniBridgeResult.request.payload.sessionId
    });
  }

  const directiveUpdate = appliedGniDirective ? architect.applyDirective(appliedGniDirective) : null;
  if (appliedGniDirective) {
    transcript.push(`GNI directive applied: ${Object.keys(appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
    traceRecorder.record('gni.directive.applied', {
      directive: appliedGniDirective,
      update: directiveUpdate
    });
  }
  const experienceDirective = createExperienceDirective({
    seed: effectiveSeed,
    firstListeningRun,
    sessionCovenant: activeSessionCovenant,
    sessionArc: activeSessionArc,
    dreamWeather,
    dreamerMemoryContext,
    architectState: architect.snapshot(),
    appliedGniDirective
  });
  traceRecorder.record('experience.directive.created', {
    directiveId: experienceDirective.directiveId,
    nextMove: experienceDirective.nextMove,
    suggestedRole: experienceDirective.suggestedRole,
    pressureTarget: experienceDirective.pressureTarget,
    returnReadiness: experienceDirective.returnReadiness,
    reasonCodes: experienceDirective.reasonCodes
  });
  const dreamerProfileSnapshot = dreamer
    ? dreamer.recordSession({ sessionBundle: bundle, dreamJourney, mask, echoTrace, dreamWeather })
    : null;

  const thresholdPresentation = buildThresholdPresentation({
    chamber,
    feeling,
    dreamWeather,
    sessionCovenant: activeSessionCovenant
  });
  const gniQueueSnapshot = gniQueue.snapshot();
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
    thresholdPresentation,
    trace: traceSnapshot,
    sessionArc: activeSessionArc,
    lastSessionBundle: bundle,
    pendingGniRequest: gniRequest,
    gniQueue: gniQueueSnapshot,
    gniBridgeResult,
    appliedGniDirective,
    sessionCovenant: activeSessionCovenant,
    echoTrace,
    activePassage,
    ...(firstListeningRun ? { firstListeningRun } : {}),
    experienceDirective,
    dreamWeather,
    weatherTrace,
    ...(dreamerProfileSnapshot ? { dreamerProfile: dreamerProfileSnapshot } : {}),
    ...(saveSlot ? { saveSlot: { ...saveSlot, profile: dreamerProfileSnapshot ?? saveSlot.profile } } : {})
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
    gniQueue: gniQueueSnapshot,
    appliedGniDirective,
    thresholdPresentation,
    trace: traceSnapshot,
    sessionArc: activeSessionArc,
    sessionArcDirective,
    sessionCovenant: activeSessionCovenant,
    firstListeningRun,
    experienceDirective,
    activePassage,
    echoTrace,
    dreamWeather,
    weatherTrace,
    dreamerProfile: dreamerProfileSnapshot,
    saveSlot: saveSlot ? { ...saveSlot, profile: dreamerProfileSnapshot ?? saveSlot.profile } : null,
    effectiveSeed,
    savePath
  };
}

function recordFirstListeningTrace(traceRecorder, firstListeningRun) {
  traceRecorder.record('first.listening.started', {
    seed: firstListeningRun.seed,
    beatCount: firstListeningRun.beats.length
  });
  for (const beat of firstListeningRun.beats) {
    traceRecorder.record('first.listening.beat.recorded', {
      beatId: beat.beatId,
      symbolicObjectId: beat.symbolicObjectId,
      responseKind: beat.responseKind,
      gestureTags: beat.gestureTags,
      motifTags: beat.motifTags,
      pressureAccepted: beat.pressureAccepted,
      boundarySignals: beat.boundarySignals
    });
  }
  traceRecorder.record('first.listening.completed', {
    derivedToneTags: firstListeningRun.derivedToneTags,
    intensityHint: firstListeningRun.intensityHint,
    returnAnchorHint: firstListeningRun.returnAnchorHint,
    redactedSummary: firstListeningRun.redactedSummary
  });
}

function shouldPrepareSaveSlot({ dreamerProfile, saveSlotId, saveMode, incarnationIndex }) {
  return Boolean(dreamerProfile)
    || saveSlotId !== 'default'
    || saveMode !== 'continue'
    || incarnationIndex !== null;
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
    } else if (arg === '--first-listening') {
      options.firstListening = true;
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
    } else if (arg.startsWith('--trace=')) {
      options.tracePath = arg.slice('--trace='.length);
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

export function createGniProviderFromOptions(options = {}) {
  if (!options.gniEndpoint) {
    return null;
  }

  const tokenEnv = options.gniTokenEnv ?? 'GNI_API_KEY';
  return new GniHttpProvider({
    endpoint: options.gniEndpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: options.gniTimeoutMs ?? 10000
  });
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
    gniProvider: createGniProviderFromOptions(options),
    emulateGni: options.emulateGni,
    firstListening: options.firstListening,
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
