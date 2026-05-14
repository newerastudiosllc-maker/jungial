import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { createDeterministicClock } from './clock.js';
import { createJungialRuntime } from './runtime.js';
import { saveGameState } from './persistence.js';
import { selectDreamJourney } from './dreamJourney.js';
import { createDreamWeightOverrides } from './directorPolicy.js';
import { GniBridge } from './gniBridge.js';
import { SymbolGrammar } from './symbolGrammar.js';
import { TraceRecorder } from './trace.js';

export async function runCampaign({
  cycles = 3,
  seed = 777,
  emulateGni = false,
  gniProvider = null,
  gniDirectives = [],
  savePath = null,
  clock = undefined,
  catalog = undefined
} = {}) {
  const runtime = createJungialRuntime({ seed, clock, catalog });
  const trace = new TraceRecorder({ clock: clock?.fork?.() ?? undefined });
  const gniBridge = new GniBridge({ adapter: runtime.gni, provider: gniProvider });
  const symbolGrammar = new SymbolGrammar();
  const campaignCycles = [];

  trace.record('campaign.started', { cycles, seed, emulateGni });

  for (let index = 0; index < cycles; index += 1) {
    const cycleNumber = index + 1;
    trace.record('campaign.cycle.started', { cycle: cycleNumber });

    runtime.chamber.receiveInput({
      kind: 'speech',
      text: 'the word',
      archetypes: runtime.archetypes,
      feeling: runtime.feeling
    });
    runtime.witness.observeAction('open_portal', ['Seeker'], ['portal']);
    runtime.chamber.openPortal('key_of_portals');

    const weightOverrides = createDreamWeightOverrides(runtime.architect.snapshot());
    const dreamJourney = selectDreamJourney({
      dreamflow: runtime.dreamflow,
      archetypeState: runtime.archetypes,
      feelingState: runtime.feeling,
      roomConfig: runtime.chamber.snapshot(),
      weightOverrides
    });
    const firstBeat = dreamJourney.beats[0];
    const selectedDream = {
      id: firstBeat.moduleId,
      name: firstBeat.moduleName,
      symbolicTags: firstBeat.symbolicTags,
      weightBreakdown: firstBeat.weightBreakdown
    };
    trace.record('dream.journey.selected', {
      cycle: cycleNumber,
      selectedDreamId: selectedDream.id,
      summary: dreamJourney.summary,
      symbolTrail: dreamJourney.symbolTrail,
      weightOverrides
    });

    symbolGrammar.ingest({ symbols: dreamJourney.symbolTrail, vibeState: runtime.feeling.vibeState });
    const journalEntry = runtime.journal.writeReturnEntry({
      symbols: dreamJourney.symbolTrail,
      actions: runtime.archetypes.recentActions(),
      dominantArchetype: runtime.archetypes.dominantArchetype(),
      vibeState: runtime.feeling.vibeState,
      journey: dreamJourney,
      symbolGrammar
    });
    const bundle = runtime.witness.toSessionBundle({ selectedDream });
    trace.record('witness.bundle.created', {
      cycle: cycleNumber,
      sessionId: bundle.sessionId,
      dominantArchetype: bundle.dominantArchetype,
      coherence: bundle.coherence
    });
    const architectUpdate = runtime.architect.update(bundle);
    const explicitDirective = gniDirectives[index] ?? null;
    const gniBridgeResult = await gniBridge.processSessionBundle({
      sessionBundle: bundle,
      providedDirective: explicitDirective,
      emulate: emulateGni,
      seed: `${seed}:${cycleNumber}`
    });
    trace.record('gni.request.created', {
      cycle: cycleNumber,
      provider: gniBridgeResult.request.provider,
      endpoint: gniBridgeResult.request.endpoint,
      contract: gniBridgeResult.request.contract,
      sessionId: gniBridgeResult.request.payload.sessionId
    });
    const appliedDirective = gniBridgeResult.directive;
    const directiveUpdate = appliedDirective ? runtime.architect.applyDirective(appliedDirective) : null;
    if (gniBridgeResult.source === 'emulator') {
      trace.record('gni.emulator.directive.created', {
        cycle: cycleNumber,
        dreamWeightDeltas: gniBridgeResult.directive.dreamWeightDeltas
      });
    }
    if (gniBridgeResult.source === 'provider' && gniBridgeResult.status === 'directive_ready') {
      trace.record('gni.provider.directive.created', {
        cycle: cycleNumber,
        dreamWeightDeltas: gniBridgeResult.directive.dreamWeightDeltas
      });
    }
    if (gniBridgeResult.status === 'provider_error') {
      trace.record('gni.provider.error', {
        cycle: cycleNumber,
        errors: gniBridgeResult.errors
      });
    }
    if (appliedDirective) {
      trace.record('gni.directive.applied', {
        cycle: cycleNumber,
        dreamWeightDeltas: appliedDirective.dreamWeightDeltas,
        maskPressure: appliedDirective.maskPressure
      });
    }

    const cycle = {
      cycle: cycleNumber,
      selectedDream,
      dreamJourney,
      weightOverrides,
      journalEntry,
      sessionBundle: bundle,
      architectUpdate,
      gniBridgeResult,
      appliedDirective,
      directiveUpdate,
      architectState: runtime.architect.snapshot()
    };
    campaignCycles.push(cycle);
    trace.record('campaign.cycle.completed', {
      cycle: cycleNumber,
      selectedDreamId: selectedDream.id,
      journeySummary: dreamJourney.summary,
      weightOverrides,
      appliedDirective: Boolean(appliedDirective)
    });
  }

  trace.record('campaign.completed', { cycles });
  const traceSnapshot = trace.snapshot();
  const result = {
    schema: 'JungialCampaignResultV1',
    seed,
    cycles: campaignCycles,
    symbolGrammar: symbolGrammar.snapshot(),
    architectState: runtime.architect.snapshot(),
    journal: runtime.journal.snapshot(),
    trace: traceSnapshot
  };

  if (savePath) {
    await saveGameState(savePath, {
      campaign: result,
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
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: node src/campaign.js <campaign.json> [save.json]');
    process.exit(1);
  }
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const clock = config.clockStartIso
    ? createDeterministicClock({ startIso: config.clockStartIso, stepMs: config.clockStepMs ?? 1000 })
    : undefined;
  const result = await runCampaign({ ...config, savePath: process.argv[3] ?? config.savePath ?? null, clock });
  console.log(JSON.stringify(result, null, 2));
}
