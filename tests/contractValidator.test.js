import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateContractDocument, validateContractFiles } from '../src/contractValidator.js';
import { createDeterministicClock } from '../src/clock.js';
import { createDreamWeather, createWeatherTrace } from '../src/dreamWeather.js';
import { exportContractFixtures } from '../src/fixtureExporter.js';
import { applyPlayerInput } from '../src/input.js';
import { buildThresholdPresentation } from '../src/presentation.js';
import { createJungialRuntime } from '../src/runtime.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import { createDreamSessionCheckpoint, runDreamSessionFromRuntime } from '../src/dreamSession.js';
import { runFirstListeningSequence } from '../src/firstListening.js';
import { createExperienceDirective } from '../src/experienceDirector.js';

test('contract validator routes known Jungial contract schemas', () => {
  const directiveResult = validateContractDocument({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: { garden: 0.2 },
    symbolEchoes: [],
    maskPressure: {},
    pacingDelta: {}
  });
  const traceResult = validateContractDocument({
    schema: 'JungialTraceV1',
    runId: 'trace-one',
    entries: [{
      index: 1,
      at: '2080-01-01T00:00:00.000Z',
      type: 'gni.queue.processed',
      payload: { statusCounts: { directive_ready: 1 } }
    }]
  });
  const traceSummaryResult = validateContractDocument({
    schema: 'JungialTraceSummaryV1',
    runId: 'trace-one',
    eventCounts: { 'gni.request.created': 1 },
    journeySummary: null,
    symbolTrail: ['portal'],
    gniRequestCount: 1,
    gniQueuedRequestCount: 0,
    gniDirectiveCount: 0
  });
  const manifestResult = validateContractDocument({
    schema: 'JungialContractFixtureManifestV1',
    seed: 777,
    clockStartIso: '2060-01-01T00:00:00.000Z',
    files: ['session_bundle_v1.json'],
    hash: 'a'.repeat(64)
  });
  const gniContractCheckResult = validateContractDocument({
    schema: 'GniContractCheckReportV1',
    ok: true,
    endpoint: 'https://gni.local/process',
    request: {
      valid: true,
      errors: [],
      value: {
        schema: 'GniProcessingRequestV1',
        schemaVersion: 1,
        provider: 'GNI',
        endpoint: 'gni://local-dev-placeholder',
        model: 'gni-dream-director-dev',
        contract: {
          inputFormat: 'SessionBundleV1',
          outputFormat: 'JungialDirectiveV1',
          allowedDirectives: ['adjust_dream_weights']
        },
        payload: {
          schema: 'SessionBundleV1',
          schemaVersion: 1,
          sessionId: 'session-one',
          dominantArchetype: 'Seeker',
          coherence: 0.6,
          vibeState: 'calm_hopeful_boundless_bright_warm',
          recentSymbols: ['portal'],
          recentActions: ['open_portal'],
          roomConfigSnapshot: { portalOpen: true },
          archetypeVector: { Seeker: 1 }
        }
      }
    },
    response: { status: 'provider_empty', errors: [] },
    job: null
  });
  const dreamerProfileResult = validateContractDocument({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2080-01-01T00:00:00.000Z',
    updatedAt: '2080-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 0,
      symbols: {},
      archetypes: {},
      actions: {},
      dreamModules: {},
      masks: {},
      vibeStates: {},
      passages: {},
      motifs: {},
      gestures: {},
      echoThreads: {},
      weatherTags: {},
      dreadAxes: {},
      lastSessionDigest: null
    }
  });
  const sessionCovenantResult = validateContractDocument({
    schema: 'SessionCovenantV1',
    schemaVersion: 1,
    mode: 'tonight_shape',
    toneTags: ['strange'],
    intensityCeiling: 0.45,
    hardBoundaryTags: ['real_world_self_harm'],
    softBoundaryTags: [],
    allowedPressureTags: [],
    returnAnchor: { kind: 'image', value: 'small lamp' },
    groundingPreference: 'quiet_room',
    memoryScope: 'session_only'
  });
  const passageResult = validateContractDocument({
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  });
  const echoTraceResult = validateContractDocument({
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door'],
    gestureTags: ['approach'],
    tempo: 'unhurried',
    pressureAccepted: 0.5,
    returnAnchorUsed: false,
    boundarySignals: [],
    dreamflowDeltas: {}
  });
  const firebreakTraceResult = validateContractDocument({
    schema: 'GniFirebreakTraceV1',
    schemaVersion: 1,
    source: 'provider',
    changed: true,
    ceiling: 0.35,
    boundaryTags: ['pursuit'],
    suppressedCounts: {
      fields: 1,
      dreamWeightDeltas: 1,
      symbolEchoes: 1,
      maskPressure: 0,
      pacingDelta: 0
    },
    clampCounts: {
      dreamWeightDeltas: 1,
      maskPressure: 0,
      pacingDelta: 1
    }
  });
  const sessionArcResult = validateContractDocument({
    schema: 'SessionArcV1',
    schemaVersion: 1,
    phase: 'mirroring',
    beatCount: 2,
    pressure: 0.4,
    returnReadiness: 0.2,
    continuationSeed: 123,
    recentBeatRoles: ['pressure', 'mirror'],
    boundarySignalCount: 0,
    lastDecision: 'mirror',
    weightOverrides: { mirror_hall: 1.2 }
  });
  const thresholdPresentationResult = validateContractDocument(buildThresholdPresentation({
    chamber: {
      awakened: true,
      boundaryState: 'boundless',
      note: 'the word',
      heartlight: { awake: true, intensity: 1, color: 'silver-blue placeholder' },
      portalOpen: true,
      visibleToolSigils: [],
      spawnedForms: []
    },
    feeling: {}
  }));

  assert.deepEqual(directiveResult, { valid: true, errors: [] });
  assert.deepEqual(traceResult, { valid: true, errors: [] });
  assert.deepEqual(traceSummaryResult, { valid: true, errors: [] });
  assert.deepEqual(manifestResult, { valid: true, errors: [] });
  assert.deepEqual(gniContractCheckResult, { valid: true, errors: [] });
  assert.deepEqual(dreamerProfileResult, { valid: true, errors: [] });
  assert.deepEqual(sessionCovenantResult, { valid: true, errors: [] });
  assert.deepEqual(passageResult, { valid: true, errors: [] });
  assert.deepEqual(echoTraceResult, { valid: true, errors: [] });
  assert.deepEqual(firebreakTraceResult, { valid: true, errors: [] });
  assert.deepEqual(sessionArcResult, { valid: true, errors: [] });
  assert.deepEqual(thresholdPresentationResult, { valid: true, errors: [] });
});

test('contract validator validates save game payload and nested GNI state', () => {
  const result = validateContractDocument({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: { awakened: true },
      archetypeState: { archetype_vector: { Seeker: 1 } },
      feelingState: { vibe_state: 'calm_hopeful_boundless_bright_warm' },
      journal: { entries: [] },
      architectState: { globalDreamWeights: {} },
      gniQueue: {
        schema: 'GniDirectiveQueueV1',
        pending: 'not-an-array',
        resolved: []
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['payload.gniQueue.pending must be an array']);
});

test('contract validator routes DreamWeatherV1 documents', () => {
  const result = validateContractDocument(createDreamWeather({ seed: 21, weatherTags: ['mist'] }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator routes WeatherTraceV1 documents', () => {
  const weather = createDreamWeather({ seed: 22, weatherTags: ['garden'] });
  const result = validateContractDocument(createWeatherTrace({ weather, seed: 22 }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator routes DreamSessionV1 documents', () => {
  const runtime = createJungialRuntime({
    seed: 88,
    clock: createDeterministicClock({ startIso: '2088-01-01T00:00:00.000Z' })
  });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);

  const result = validateContractDocument(runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({ intensityCeiling: 0.45 }),
    seed: 88,
    maxBeats: 2
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator routes DreamSessionCheckpointV1 documents', () => {
  const runtime = createJungialRuntime({
    seed: 89,
    clock: createDeterministicClock({ startIso: '2089-01-01T00:00:00.000Z' })
  });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);
  const session = runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({ intensityCeiling: 0.45 }),
    seed: 89,
    maxBeats: 4,
    beatsToRun: 2
  });

  const result = validateContractDocument(createDreamSessionCheckpoint(session));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator routes FirstListeningRunV1 documents', () => {
  const result = validateContractDocument(runFirstListeningSequence({
    seed: 144,
    beats: [{
      beatId: 'beat-note',
      symbolicObjectId: 'threshold_note',
      responseKind: 'approach',
      gestureTags: ['approach'],
      motifTags: ['threshold'],
      pressureAccepted: 0.4
    }]
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator routes ExperienceDirectiveV1 documents', () => {
  const result = validateContractDocument(createExperienceDirective({
    seed: 144,
    sessionCovenant: createSessionCovenant({ intensityCeiling: 0.45 })
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('contract validator validates generated Dream Weather and summary fixture files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-weather-contracts-'));

  try {
    await exportContractFixtures({
      outDir: dir,
      seed: 777,
      clockStartIso: '2060-01-01T00:00:00.000Z'
    });

    const report = await validateContractFiles([
      join(dir, 'threshold_presentation_v1.json'),
      join(dir, 'dream_weather_v1.json'),
      join(dir, 'weather_trace_v1.json'),
      join(dir, 'first_listening_v1.json'),
      join(dir, 'experience_directive_v1.json'),
      join(dir, 'dream_session_v1.json'),
      join(dir, 'dream_session_checkpoint_v1.json'),
      join(dir, 'session_arc_v1.json'),
      join(dir, 'gni_firebreak_trace_v1.json'),
      join(dir, 'trace_summary_v1.json'),
      join(dir, 'manifest.json')
    ]);

    assert.equal(report.ok, true);
    assert.deepEqual(report.files.map((file) => file.schema), [
      'ThresholdPresentationV1',
      'DreamWeatherV1',
      'WeatherTraceV1',
      'FirstListeningRunV1',
      'ExperienceDirectiveV1',
      'DreamSessionV1',
      'DreamSessionCheckpointV1',
      'SessionArcV1',
      'GniFirebreakTraceV1',
      'JungialTraceSummaryV1',
      'JungialContractFixtureManifestV1'
    ]);
    assert.deepEqual(report.files.map((file) => file.valid), [true, true, true, true, true, true, true, true, true, true, true]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('contract validator rejects malformed trace summaries and fixture manifests', () => {
  const traceSummaryResult = validateContractDocument({
    schema: 'JungialTraceSummaryV1',
    runId: '',
    eventCounts: { ok: 1, bad: -1, fractional: 0.5 },
    journeySummary: 7,
    symbolTrail: ['portal', ''],
    gniRequestCount: -1,
    gniQueuedRequestCount: 0.5,
    gniDirectiveCount: 0
  });
  const manifestResult = validateContractDocument({
    schema: 'JungialContractFixtureManifestV1',
    seed: '777',
    clockStartIso: '',
    files: ['session_bundle_v1.json', ''],
    hash: 'not-a-hash'
  });

  assert.equal(traceSummaryResult.valid, false);
  assert.deepEqual(traceSummaryResult.errors, [
    'runId is required',
    'eventCounts.bad must be a non-negative integer',
    'eventCounts.fractional must be a non-negative integer',
    'journeySummary must be a string or null',
    'symbolTrail[1] must be a non-empty string',
    'gniRequestCount must be a non-negative integer',
    'gniQueuedRequestCount must be a non-negative integer'
  ]);
  assert.equal(manifestResult.valid, false);
  assert.deepEqual(manifestResult.errors, [
    'seed must be a number',
    'clockStartIso is required',
    'files[1] must be a non-empty string',
    'hash must be a 64-character lowercase hex string'
  ]);
});

test('contract validator requires save game migration metadata', () => {
  const result = validateContractDocument({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {}
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['migrations must be an array']);
});

test('contract validator reports unsupported schemas and file-level failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-contracts-'));
  const validPath = join(dir, 'directive.json');
  const invalidPath = join(dir, 'unknown.json');

  try {
    await writeFile(validPath, JSON.stringify({
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { garden: 0.2 }
    }));
    await writeFile(invalidPath, JSON.stringify({ schema: 'UnknownThing' }));

    const report = await validateContractFiles([validPath, invalidPath]);

    assert.equal(report.schema, 'JungialContractValidationReportV1');
    assert.equal(report.ok, false);
    assert.equal(report.files[0].valid, true);
    assert.equal(report.files[1].valid, false);
    assert.deepEqual(report.files[1].errors, ['unsupported contract schema: UnknownThing']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
