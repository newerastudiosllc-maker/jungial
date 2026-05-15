import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createDeterministicClock } from './clock.js';
import { runSimulation } from './simulation.js';
import { stableHash } from './stableHash.js';
import { inspectTrace } from './traceInspector.js';
import { processPendingGniQueue } from './gniQueueProcessor.js';
import { checkGniContract } from './gniContractCheck.js';
import { DreamerProfile } from './dreamerProfile.js';
import { createJungialRuntime } from './runtime.js';
import { applyPlayerInput } from './input.js';
import { createDreamSessionCheckpoint, runDreamSessionFromRuntime } from './dreamSession.js';
import { createRuntimeReadinessReport } from './runtimeReadiness.js';
import { createSessionShapeSelection } from './sessionShape.js';

const FIXTURE_FILES = Object.freeze([
  'session_bundle_v1.json',
  'session_covenant_v1.json',
  'passage_v1.json',
  'echo_trace_v1.json',
  'first_listening_v1.json',
  'experience_directive_v1.json',
  'session_frame_v1.json',
  'session_shape_selection_v1.json',
  'session_content_gate_v1.json',
  'session_content_replacement_plan_v1.json',
  'runtime_readiness_v1.json',
  'dreamer_profile_v1.json',
  'dreamer_memory_context_v1.json',
  'session_arc_v1.json',
  'dream_session_v1.json',
  'dream_session_checkpoint_v1.json',
  'dream_weather_v1.json',
  'weather_trace_v1.json',
  'threshold_presentation_v1.json',
  'gni_request_v1.json',
  'gni_directive_v1.json',
  'gni_firebreak_trace_v1.json',
  'gni_bridge_result_v1.json',
  'gni_contract_check_report_v1.json',
  'gni_directive_queue_v1.json',
  'gni_queue_process_result_v1.json',
  'fixture-run.save.json',
  'fixture-pending-run.save.json',
  'trace_summary_v1.json'
]);

export async function exportContractFixtures({
  outDir = 'fixtures',
  seed = 777,
  clockStartIso = '2060-01-01T00:00:00.000Z'
} = {}) {
  await mkdir(outDir, { recursive: true });
  const run = await runSimulation({
    seed,
    savePath: join(outDir, 'fixture-run.save.json'),
    emulateGni: true,
    firstListening: true,
    clock: createDeterministicClock({ startIso: clockStartIso })
  });
  const pendingRun = await runSimulation({
    seed,
    savePath: join(outDir, 'fixture-pending-run.save.json'),
    clock: createDeterministicClock({ startIso: clockStartIso })
  });

  const sessionBundle = run.gniRequest.payload;
  const sessionCovenant = run.sessionCovenant;
  const passage = run.activePassage;
  const echoTrace = run.echoTrace;
  const firstListeningRun = run.firstListeningRun;
  const experienceDirective = run.experienceDirective;
  const sessionFrame = run.sessionFrame;
  const sessionShapeSelection = createSessionShapeSelection({
    shapeId: 'dark_mirror'
  });
  const sessionContentGate = run.sessionContentGate;
  const sessionContentReplacementPlan = run.sessionContentReplacementPlan;
  const runtimeReadiness = createRuntimeReadinessReport({
    gniEndpoint: 'gni://local-dev-placeholder',
    platformTargets: ['node_prototype', 'ue5', 'vr', 'console']
  });
  const dreamer = new DreamerProfile({
    profileId: 'fixture-dreamer',
    rootSeed: 'fixture-root-seed',
    consent: {
      profileMemory: true,
      crossSaveEchoes: false
    }
  }, {
    clock: createDeterministicClock({ startIso: clockStartIso })
  });
  const dreamerProfile = dreamer.recordSession({
    sessionBundle,
    dreamJourney: run.dreamJourney
  });
  const dreamerMemoryContext = dreamer.toGniMemoryContext({
    slotId: 'fixture-slot',
    mode: 'continue'
  });
  const sessionArc = run.sessionArc;
  const dreamSessionRuntime = createJungialRuntime({
    seed,
    clock: createDeterministicClock({ startIso: clockStartIso })
  });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, dreamSessionRuntime);
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, dreamSessionRuntime);
  const dreamSession = runDreamSessionFromRuntime({
    runtime: dreamSessionRuntime,
    covenant: sessionCovenant,
    seed,
    maxBeats: 3,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.48 },
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 }
    ]
  });
  const dreamSessionCheckpoint = createDreamSessionCheckpoint(dreamSession);
  const dreamWeather = run.dreamWeather;
  const weatherTrace = run.weatherTrace;
  const thresholdPresentation = run.thresholdPresentation;
  const gniRequest = run.gniRequest;
  const gniDirective = run.appliedGniDirective;
  const gniFirebreakTrace = run.gniBridgeResult.firebreakTrace;
  const gniBridgeResult = run.gniBridgeResult;
  const gniDirectiveQueue = pendingRun.gniQueue;
  const fixtureRunSave = JSON.parse(await readFile(join(outDir, 'fixture-run.save.json'), 'utf8'));
  const fixturePendingRunSave = JSON.parse(await readFile(join(outDir, 'fixture-pending-run.save.json'), 'utf8'));
  const gniQueueProcessResult = await processPendingGniQueue({
    queueSnapshot: gniDirectiveQueue,
    architectState: {
      globalDreamWeights: pendingRun.architectUpdate.adjustedWeights,
      symbolFrequency: pendingRun.architectUpdate.symbolFrequency,
      pacingProfile: pendingRun.architectUpdate.pacingProfile,
      futureDreamModuleWeights: {},
      maskPressure: pendingRun.architectUpdate.maskPressure
    },
    provider: async () => ({
      dreamWeightDeltas: { white_void: 0.2 },
      symbolEchoes: ['threshold'],
      pacingDelta: { silence: 0.1 }
    })
  });
  const gniContractCheckReport = await checkGniContract({
    endpoint: 'gni://fixture-provider',
    request: gniRequest,
    provider: {
      endpoint: 'gni://fixture-provider',
      async processRequest() {
        return gniDirective;
      }
    }
  });
  const traceSummary = inspectTrace(run.trace);
  const payloads = {
    'session_bundle_v1.json': sessionBundle,
    'session_covenant_v1.json': sessionCovenant,
    'passage_v1.json': passage,
    'echo_trace_v1.json': echoTrace,
    'first_listening_v1.json': firstListeningRun,
    'experience_directive_v1.json': experienceDirective,
    'session_frame_v1.json': sessionFrame,
    'session_shape_selection_v1.json': sessionShapeSelection,
    'session_content_gate_v1.json': sessionContentGate,
    'session_content_replacement_plan_v1.json': sessionContentReplacementPlan,
    'runtime_readiness_v1.json': runtimeReadiness,
    'dreamer_profile_v1.json': dreamerProfile,
    'dreamer_memory_context_v1.json': dreamerMemoryContext,
    'session_arc_v1.json': sessionArc,
    'dream_session_v1.json': dreamSession,
    'dream_session_checkpoint_v1.json': dreamSessionCheckpoint,
    'dream_weather_v1.json': dreamWeather,
    'weather_trace_v1.json': weatherTrace,
    'threshold_presentation_v1.json': thresholdPresentation,
    'gni_request_v1.json': gniRequest,
    'gni_directive_v1.json': gniDirective,
    'gni_firebreak_trace_v1.json': gniFirebreakTrace,
    'gni_bridge_result_v1.json': gniBridgeResult,
    'gni_contract_check_report_v1.json': gniContractCheckReport,
    'gni_directive_queue_v1.json': gniDirectiveQueue,
    'gni_queue_process_result_v1.json': gniQueueProcessResult,
    'fixture-run.save.json': fixtureRunSave,
    'fixture-pending-run.save.json': fixturePendingRunSave,
    'trace_summary_v1.json': traceSummary
  };

  for (const [file, payload] of Object.entries(payloads)) {
    await writeFile(join(outDir, file), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  const manifest = {
    schema: 'JungialContractFixtureManifestV1',
    seed,
    clockStartIso,
    files: [...FIXTURE_FILES],
    hash: stableHash(payloads)
  };
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] ?? 'fixtures';
  const manifest = await exportContractFixtures({ outDir });
  console.log(JSON.stringify(manifest, null, 2));
}
