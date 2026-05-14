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

const FIXTURE_FILES = Object.freeze([
  'session_bundle_v1.json',
  'dreamer_profile_v1.json',
  'dreamer_memory_context_v1.json',
  'gni_request_v1.json',
  'gni_directive_v1.json',
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
    clock: createDeterministicClock({ startIso: clockStartIso })
  });
  const pendingRun = await runSimulation({
    seed,
    savePath: join(outDir, 'fixture-pending-run.save.json'),
    clock: createDeterministicClock({ startIso: clockStartIso })
  });

  const sessionBundle = run.gniRequest.payload;
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
  const gniRequest = run.gniRequest;
  const gniDirective = run.appliedGniDirective;
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
    'dreamer_profile_v1.json': dreamerProfile,
    'dreamer_memory_context_v1.json': dreamerMemoryContext,
    'gni_request_v1.json': gniRequest,
    'gni_directive_v1.json': gniDirective,
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
