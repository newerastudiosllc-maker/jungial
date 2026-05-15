import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHETYPES } from '../src/constants.js';
import {
  validateDirective,
  validateDreamSession,
  validateDreamSessionCheckpoint,
  validateEchoTrace,
  validateExperienceDirective,
  validateDreamerMemoryContext,
  validateDreamerProfile,
  validateDreadBudget,
  validateDreamWeather,
  validateDreamWeatherContext,
  validateFirstListeningRun,
  validateGniBridgeResult,
  validateGniContractCheckReport,
  validateGniDirectiveQueue,
  validateGniFirebreakTrace,
  validateGniQueueProcessResult,
  validateGniProcessingRequest,
  validateListeningBeat,
  validatePassage,
  validateSaveGame,
  validateSaveSlotPlan,
  validateRuntimeReadiness,
  validateSessionArc,
  validateSessionContentGate,
  validateSessionContentReplacementPlan,
  validateSessionCovenant,
  validateSessionShapeSelection,
  validateSessionFrame,
  validateSessionBundle,
  validateThresholdPresentation,
  validateWeatherTrace
} from '../src/contracts.js';
import { DreamerProfile } from '../src/dreamerProfile.js';
import { loadBundledContentCatalog, validateContentCatalog } from '../src/contentCatalog.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';
import {
  createDreamWeather,
  createWeatherTrace,
  normalizeDreadBudget,
  toGniWeatherContext
} from '../src/dreamWeather.js';
import { buildThresholdPresentation } from '../src/presentation.js';
import { createRuntimeReadinessReport } from '../src/runtimeReadiness.js';
import { createSessionContentGateReport } from '../src/sessionContentGate.js';
import { createSessionContentReplacementPlan } from '../src/sessionContentReplacement.js';
import { createSessionShapeSelection } from '../src/sessionShape.js';
import { createDeterministicClock } from '../src/clock.js';
import { applyPlayerInput } from '../src/input.js';
import { createJungialRuntime } from '../src/runtime.js';
import { createDreamSessionCheckpoint, runDreamSessionFromRuntime } from '../src/dreamSession.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('JSON catalogs match runtime constants used by the prototype', async () => {
  const archetypes = await readJson('data/archetypes.json');
  const dreamModules = await readJson('data/dream_modules.json');
  const masks = await readJson('data/masks.json');
  const symbols = await readJson('data/symbols.json');
  const tools = await readJson('data/tool_sigils.json');

  assert.deepEqual(archetypes.archetypes, ARCHETYPES);
  const catalog = loadBundledContentCatalog();
  const validation = validateContentCatalog(catalog);

  assert.deepEqual(dreamModules.modules.map((module) => module.id), catalog.dreamModules.map((module) => module.id));
  assert.deepEqual(masks.masks.map((mask) => mask.id), catalog.masks.map((mask) => mask.id));
  assert.deepEqual(symbols.symbols.map((symbol) => symbol.id), catalog.symbolLexicon.map((symbol) => symbol.id));
  assert.deepEqual(tools.tool_sigils.map((tool) => tool.id), catalog.toolSigils.map((tool) => tool.id));
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test('Dreamer weather schemas encode weather tag and dread axis allowlists', async () => {
  const profileSchema = await readJson('data/schemas/dreamer_profile.schema.json');
  const memoryContextSchema = await readJson('data/schemas/dreamer_memory_context.schema.json');

  assert.ok(profileSchema.$defs.weatherTagMemoryMap.propertyNames.enum.includes('mist'));
  assert.ok(!profileSchema.$defs.weatherTagMemoryMap.propertyNames.enum.includes('raw_childhood_address'));
  assert.ok(profileSchema.$defs.dreadAxisMemoryMap.propertyNames.enum.includes('cosmicDread'));
  assert.ok(!profileSchema.$defs.dreadAxisMemoryMap.propertyNames.enum.includes('privateAxis'));
  assert.ok(memoryContextSchema.$defs.weatherTagList.items.enum.includes('mist'));
  assert.ok(memoryContextSchema.$defs.dreadAxisList.items.enum.includes('watching'));
});

test('First Listening schema documents redacted response contracts', async () => {
  const schema = await readJson('data/schemas/first_listening.schema.json');

  assert.equal(schema.title, 'FirstListeningRunV1');
  assert.deepEqual(schema.properties.schema, { const: 'FirstListeningRunV1' });
  assert.equal(schema.$defs.listeningBeat.additionalProperties, false);
  assert.equal(schema.properties.additionalProperties, undefined);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.listeningBeat.properties.rawSpeech, undefined);
});

test('Experience Director schema documents bounded hidden direction packets', async () => {
  const schema = await readJson('data/schemas/experience_directive.schema.json');

  assert.equal(schema.title, 'ExperienceDirectiveV1');
  assert.deepEqual(schema.properties.schema, { const: 'ExperienceDirectiveV1' });
  assert.deepEqual(schema.properties.nextMove.enum, ['deepen', 'distort', 'mirror', 'soften', 'return']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.rawSpeech, undefined);
});

test('Session Frame schema documents renderer handoff packets', async () => {
  const schema = await readJson('data/schemas/session_frame.schema.json');

  assert.equal(schema.title, 'SessionFrameV1');
  assert.deepEqual(schema.properties.schema, { const: 'SessionFrameV1' });
  assert.deepEqual(schema.properties.frameKind.enum, ['threshold_silent', 'threshold_awake', 'threshold_portal', 'dream', 'return']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.rawSpeech, undefined);
});

test('Runtime Readiness schema documents internal preflight reports', async () => {
  const schema = await readJson('data/schemas/runtime_readiness.schema.json');

  assert.equal(schema.title, 'RuntimeReadinessV1');
  assert.deepEqual(schema.properties.schema, { const: 'RuntimeReadinessV1' });
  assert.deepEqual(schema.properties.status.enum, ['ready', 'degraded', 'blocked']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.playerFacingText.type, 'null');
});

test('Session Shape schema documents bounded session tone presets', async () => {
  const schema = await readJson('data/schemas/session_shape_selection.schema.json');

  assert.equal(schema.title, 'SessionShapeSelectionV1');
  assert.deepEqual(schema.properties.schema, { const: 'SessionShapeSelectionV1' });
  assert.deepEqual(schema.properties.shapeId.enum, ['quiet_lantern', 'strange_threshold', 'dark_mirror', 'nightmare_veil']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.playerFacingText.type, 'null');
});

test('Session Content Gate schema documents internal boundary audit reports', async () => {
  const schema = await readJson('data/schemas/session_content_gate.schema.json');

  assert.equal(schema.title, 'SessionContentGateV1');
  assert.deepEqual(schema.properties.schema, { const: 'SessionContentGateV1' });
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.playerFacingText.type, 'null');
  assert.equal(schema.properties.rawSpeech, undefined);
});

test('Session Content Replacement schema documents internal reroute plans', async () => {
  const schema = await readJson('data/schemas/session_content_replacement_plan.schema.json');

  assert.equal(schema.title, 'SessionContentReplacementPlanV1');
  assert.deepEqual(schema.properties.schema, { const: 'SessionContentReplacementPlanV1' });
  assert.deepEqual(schema.properties.status.enum, ['not_needed', 'replacement_required']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.playerFacingText.type, 'null');
  assert.equal(schema.properties.rawSpeech, undefined);
});

test('DreamSession schema documents hidden DreamJourney policy reports', async () => {
  const schema = await readJson('data/schemas/dream_session.schema.json');
  const policy = schema.$defs.dreamJourney.properties.policy;
  const route = policy.properties.replacementRoutes.items;

  assert.equal(policy.properties.schema.const, 'DreamJourneyPolicyV1');
  assert.equal(policy.properties.playerFacingText.type, 'null');
  assert.equal(route.properties.target.const, 'dreamModule');
  assert.equal(route.properties.action.const, 'replace');
  assert.deepEqual(policy.required, [
    'schema',
    'schemaVersion',
    'hardBoundaryTags',
    'suppressedModuleIds',
    'replacementRoutes',
    'fallbackUsed',
    'playerFacingText'
  ]);
});

test('session bundle validation reports missing GNI handoff fields', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    sessionId: 'session-one',
    dominantArchetype: 'Seeker'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'schemaVersion must be 1',
    'coherence is required',
    'vibeState is required',
    'recentSymbols must be an array',
    'recentActions must be an array',
    'roomConfigSnapshot is required',
    'archetypeVector is required'
  ]);
});

test('session bundle validation accepts compact Witness handoff data', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.5,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { awakened: true },
    archetypeVector: { Seeker: 1 }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session covenant validation accepts bounded session preferences', () => {
  const result = validateSessionCovenant(createSessionCovenant({
    toneTags: ['strange', 'dark'],
    intensityCeiling: 0.6,
    hardBoundaryTags: ['body_horror'],
    softBoundaryTags: ['teeth'],
    allowedPressureTags: ['shadow'],
    returnAnchor: { kind: 'image', value: 'small lamp' }
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session covenant validation rejects raw speech fields', () => {
  const result = validateSessionCovenant({
    ...createSessionCovenant(),
    rawSpeech: ['I should not be stored']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['covenant.rawSpeech is not allowed']);
});

test('Session Shape validation accepts bounded preset selections', () => {
  const result = validateSessionShapeSelection(createSessionShapeSelection({ shapeId: 'dark_mirror' }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('Session Shape validation rejects raw or player-facing fields', () => {
  const selection = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const result = validateSessionShapeSelection({
    ...selection,
    shapeId: 'therapy_protocol',
    source: 'intake',
    intensityBand: 'diagnosis',
    shapeTags: ['dark', ''],
    rawSpeech: 'do not store',
    playerFacingText: 'The system chose this because...'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionShapeSelection.rawSpeech is not allowed',
    'shapeId must be one of quiet_lantern, strange_threshold, dark_mirror, nightmare_veil',
    'source must be preset or fallback',
    'intensityBand must be one of gentle, strange, dark, horrific',
    'shapeTags[1] must be a non-empty string',
    'playerFacingText must be null'
  ]);
});

test('Session Content Gate validation accepts internal reports and rejects leaks', () => {
  const selection = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const report = createSessionContentGateReport({
    sessionShapeSelection: selection,
    sessionCovenant: selection.covenant
  });

  assert.deepEqual(validateSessionContentGate(report), { valid: true, errors: [] });

  const result = validateSessionContentGate({
    ...report,
    playerFacingText: 'This room changed because of a safety rule.',
    rawSpeech: 'do not keep me'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionContentGate.rawSpeech is not allowed',
    'playerFacingText must be null'
  ]);
});

test('Session Content Replacement validation accepts internal plans and rejects leaks', () => {
  const selection = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const gateReport = createSessionContentGateReport({
    sessionShapeSelection: selection,
    sessionCovenant: selection.covenant
  });
  const plan = createSessionContentReplacementPlan({
    gateReport,
    sessionCovenant: selection.covenant
  });

  assert.deepEqual(validateSessionContentReplacementPlan(plan), { valid: true, errors: [] });

  const result = validateSessionContentReplacementPlan({
    ...plan,
    playerFacingText: 'The world swapped this because...',
    rawSpeech: 'do not keep me'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionContentReplacementPlan.rawSpeech is not allowed',
    'playerFacingText must be null'
  ]);
});

test('validates DreamWeatherV1 contracts', () => {
  const weather = createDreamWeather({
    seed: 7,
    weatherTags: ['garden', 'watching'],
    dreadBudget: { watching: 0.4 }
  });

  assert.deepEqual(validateDreamWeather(weather), { valid: true, errors: [] });

  const result = validateDreamWeather({
    ...weather,
    pressure: 'crushing',
    dreadBudget: { ...weather.dreadBudget, watching: 2, teeth: 0.1 },
    atmosphere: { ...weather.atmosphere, fogDensity: -0.1 },
    rawPrompt: 'do not store'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamWeather.rawPrompt is not allowed',
    'pressure must be one of low, medium, heavy, storm',
    'dreadBudget.teeth is not allowed',
    'dreadBudget.watching must be between 0 and 1',
    'atmosphere.fogDensity must be between 0 and 1'
  ]);
});

test('DreamWeatherV1 validation rejects private-looking weather tags', () => {
  const weather = createDreamWeather({ seed: 12 });
  const result = validateDreamWeather({
    ...weather,
    weatherTags: ['threshold', 'raw_childhood_address'],
    suppressedTags: ['private_session_note']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'weatherTags[1] must be an allowed weather tag',
    'suppressedTags[0] must be an allowed weather tag'
  ]);
});

test('validates WeatherTraceV1 contracts', () => {
  const weather = createDreamWeather({ seed: 8, weatherTags: ['mist'] });
  const trace = createWeatherTrace({
    weather,
    sourceTags: ['mist'],
    suppressedTags: ['static'],
    seed: 8
  });

  assert.deepEqual(validateWeatherTrace(trace), { valid: true, errors: [] });

  const result = validateWeatherTrace({
    ...trace,
    weatherId: 123,
    strongestDreadAxis: 'teeth',
    sourceTags: ['mist', ''],
    notes: 'not allowed'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'weatherTrace.notes is not allowed',
    'weatherId must be a string or null',
    'sourceTags[1] must be a non-empty string',
    'strongestDreadAxis must be one of pursuit, bodyUnease, cosmicDread, disorientation, loss, watching, claustrophobia'
  ]);
});

test('WeatherTraceV1 validation rejects tags outside the weather symbolic surface', () => {
  const weather = createDreamWeather({ seed: 13 });
  const trace = createWeatherTrace({ weather, seed: 13 });
  const result = validateWeatherTrace({
    ...trace,
    sourceTags: ['door', 'private_name'],
    resultingTags: ['threshold', 'raw_prompt_fragment'],
    suppressedTags: ['memory', 'home_address']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sourceTags[1] must be an allowed weather tag',
    'resultingTags[1] must be an allowed weather tag',
    'suppressedTags[1] must be an allowed weather tag'
  ]);
});

test('validates DreadBudgetV1 contracts', () => {
  const budget = normalizeDreadBudget({ pursuit: 0.2, watching: 0.4 }, 0.5);

  assert.deepEqual(validateDreadBudget(budget), { valid: true, errors: [] });

  const result = validateDreadBudget({
    ...budget,
    pursuit: 1.2,
    teeth: 0.1
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreadBudget.teeth is not allowed',
    'pursuit must be between 0 and 1'
  ]);
});

test('validates ThresholdPresentationV1 render contracts', () => {
  const covenant = createSessionCovenant({
    toneTags: ['dark'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['pursuit']
  });
  const dreamWeather = createDreamWeather({
    seed: 33,
    covenant,
    weatherTags: ['gravity'],
    dreadBudget: { cosmicDread: 0.4 }
  });
  const presentation = buildThresholdPresentation({
    chamber: {
      awakened: true,
      boundaryState: 'boundless',
      note: 'the word',
      heartlight: { awake: true, intensity: 1, color: 'silver-blue placeholder' },
      portalOpen: true,
      visibleToolSigils: [],
      spawnedForms: []
    },
    feeling: {},
    dreamWeather,
    sessionCovenant: covenant
  });

  assert.deepEqual(validateThresholdPresentation(presentation), { valid: true, errors: [] });

  const result = validateThresholdPresentation({
    ...presentation,
    dreamAtmosphere: {
      ...presentation.dreamAtmosphere,
      weatherTags: ['gravity', 'raw_private_token'],
      lighting: { ...presentation.dreamAtmosphere.lighting, bloom: 4 },
      comfort: {
        ...presentation.dreamAtmosphere.comfort,
        pursuitAllowed: 'sometimes'
      },
      dreadBudget: dreamWeather.dreadBudget
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamAtmosphere.dreadBudget is not allowed',
    'dreamAtmosphere.weatherTags[1] must be an allowed weather tag',
    'dreamAtmosphere.lighting.bloom must be between 0 and 1',
    'dreamAtmosphere.comfort.pursuitAllowed must be a boolean'
  ]);
});

test('session bundle validation accepts valid dreamWeatherContext from toGniWeatherContext', () => {
  const dreamWeather = createDreamWeather({ seed: 9, weatherTags: ['gravity'] });
  const weatherTrace = createWeatherTrace({ weather: dreamWeather, seed: 9 });
  const result = validateSessionBundle({
    ...validSessionBundle(),
    dreamWeatherContext: toGniWeatherContext({ dreamWeather, weatherTrace })
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session bundle validation rejects malformed dreamWeatherContext pressure or extra field', () => {
  const dreamWeather = createDreamWeather({ seed: 10 });
  const result = validateSessionBundle({
    ...validSessionBundle(),
    dreamWeatherContext: {
      ...toGniWeatherContext({ dreamWeather }),
      dreadBudget: { ...dreamWeather.dreadBudget, teeth: 0.1 },
      weatherTags: ['threshold', 'private_symbol'],
      pressure: 'thunder',
      rawPrompt: 'not allowed'
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamWeatherContext.rawPrompt is not allowed',
    'dreamWeatherContext.weatherTags[1] must be an allowed weather tag',
    'dreamWeatherContext.pressure must be one of low, medium, heavy, storm',
    'dreamWeatherContext.dreadBudget.teeth is not allowed'
  ]);
});

test('save game validation checks optional dreamWeather/weatherTrace payloads', () => {
  const dreamWeather = createDreamWeather({ seed: 11, weatherTags: ['cold'] });
  const weatherTrace = createWeatherTrace({ weather: dreamWeather, seed: 11 });

  assert.deepEqual(validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      dreamWeather,
      weatherTrace
    }
  }), { valid: true, errors: [] });

  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      dreamWeather: { ...dreamWeather, weatherId: '' },
      weatherTrace: { ...weatherTrace, resultingTags: ['cold', ''] }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamWeather.weatherId is required',
    'payload.weatherTrace.resultingTags[1] must be a non-empty string'
  ]);
});

test('save game validation rejects null dreamWeather and weatherTrace payloads', () => {
  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      dreamWeather: null,
      weatherTrace: null
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamWeather must be an object',
    'payload.weatherTrace must be an object'
  ]);
});

test('Passage validation accepts dream-native content contracts', () => {
  const result = validatePassage({
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach', 'speak'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('EchoTrace validation accepts compact symbolic observation', () => {
  const result = validateEchoTrace({
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door', 'breath', 'threshold'],
    gestureTags: ['spoke_before_touching', 'speak'],
    tempo: 'hesitant_then_committed',
    pressureAccepted: 0.42,
    returnAnchorUsed: false,
    boundarySignals: ['long_pause'],
    dreamflowDeltas: {}
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('First Listening validation accepts redacted chamber responses', () => {
  const beat = {
    schema: 'ListeningBeatV1',
    schemaVersion: 1,
    beatId: 'beat-note',
    symbolicObjectId: 'threshold_note',
    responseKind: 'approach',
    gestureTags: ['approach', 'touch_note'],
    motifTags: ['threshold', 'word'],
    pressureAccepted: 0.4,
    boundarySignals: []
  };
  const run = {
    schema: 'FirstListeningRunV1',
    schemaVersion: 1,
    seed: 144,
    beats: [beat],
    derivedToneTags: ['curious'],
    intensityHint: 0.4,
    returnAnchorHint: { kind: 'image', value: 'threshold_note' },
    redactedSummary: 'threshold_note answered as approach'
  };

  assert.deepEqual(validateListeningBeat(beat), { valid: true, errors: [] });
  assert.deepEqual(validateFirstListeningRun(run), { valid: true, errors: [] });
});

test('First Listening validation rejects raw private response fields', () => {
  const result = validateFirstListeningRun({
    schema: 'FirstListeningRunV1',
    schemaVersion: 1,
    seed: 144,
    beats: [{
      schema: 'ListeningBeatV1',
      schemaVersion: 1,
      beatId: 'beat-note',
      symbolicObjectId: 'threshold_note',
      responseKind: 'speak',
      gestureTags: ['speak'],
      motifTags: ['word'],
      pressureAccepted: 0.4,
      boundarySignals: [],
      rawSpeech: 'never store this'
    }],
    derivedToneTags: ['curious'],
    intensityHint: 0.4,
    returnAnchorHint: { kind: 'image', value: 'threshold_note' },
    redactedSummary: 'threshold_note answered as speak',
    rawTranscript: 'never store this either'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'firstListeningRun.rawTranscript is not allowed',
    'beats[0].rawSpeech is not allowed'
  ]);
});

test('Experience Directive validation accepts bounded hidden direction packets', () => {
  const result = validateExperienceDirective({
    schema: 'ExperienceDirectiveV1',
    schemaVersion: 1,
    directiveId: 'experience-144',
    seed: 144,
    nextMove: 'soften',
    suggestedRole: 'return',
    pressureTarget: 0.28,
    returnReadiness: 0.68,
    toneTags: ['gentle'],
    weatherTagBias: ['threshold', 'lamp'],
    dreamWeightOverrides: { garden: 1.2 },
    pacingBias: { intensity: -0.1, repetition: 0, silence: 0.2 },
    maskPressure: { double: 0.3 },
    returnAnchorKind: 'image',
    returnAnchorValue: 'heartlight',
    reasonCodes: ['first_listening_boundary']
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('Experience Directive validation rejects raw fields and unbounded values', () => {
  const result = validateExperienceDirective({
    schema: 'ExperienceDirectiveV1',
    schemaVersion: 1,
    directiveId: 'experience-144',
    seed: 144,
    nextMove: 'explain',
    suggestedRole: 'lecture',
    pressureTarget: 4,
    returnReadiness: -1,
    toneTags: ['gentle', ''],
    weatherTagBias: ['threshold', 'private_place'],
    dreamWeightOverrides: { garden: 9 },
    pacingBias: { intensity: 4, noise: 0.2, repetition: 0, silence: 0 },
    maskPressure: { double: 4 },
    returnAnchorKind: 'image',
    returnAnchorValue: 'heartlight',
    reasonCodes: ['ok', ''],
    rawSpeech: 'never store this'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'experienceDirective.rawSpeech is not allowed',
    'nextMove must be one of deepen, distort, mirror, soften, return',
    'suggestedRole must be one of entry, pressure, mirror, return',
    'pressureTarget must be between 0 and 1',
    'returnReadiness must be between 0 and 1',
    'toneTags[1] must be a non-empty string',
    'weatherTagBias[1] must be an allowed weather tag',
    'dreamWeightOverrides.garden must be between 0.05 and 3',
    'pacingBias.intensity must be between -1 and 1',
    'pacingBias.noise is not allowed',
    'maskPressure.double must be between -1 and 1',
    'reasonCodes[1] must be a non-empty string'
  ]);
});

test('Session Frame validation accepts renderer handoff packets', () => {
  const thresholdPresentation = buildThresholdPresentation({
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
  });
  const result = validateSessionFrame({
    schema: 'SessionFrameV1',
    schemaVersion: 1,
    frameId: 'session-frame-001',
    frameIndex: 1,
    frameKind: 'threshold_portal',
    presentation: thresholdPresentation,
    experienceDirective: {
      schema: 'ExperienceDirectiveV1',
      schemaVersion: 1,
      directiveId: 'experience-001',
      seed: 1,
      nextMove: 'deepen',
      suggestedRole: 'pressure',
      pressureTarget: 0.25,
      returnReadiness: 0.1,
      toneTags: ['gentle'],
      weatherTagBias: ['threshold'],
      dreamWeightOverrides: { garden: 1.1 },
      pacingBias: { intensity: 0, repetition: 0, silence: 0 },
      maskPressure: {},
      returnAnchorKind: 'image',
      returnAnchorValue: 'heartlight',
      reasonCodes: ['session_arc_deepen']
    },
    comfort: {
      intensityCeiling: 0.35,
      returnAvailable: false,
      returnAnchorKind: 'image',
      suddenFlashAllowed: false,
      pursuitAllowed: true,
      hapticsEnabled: true,
      locomotionIntensity: 0.28
    },
    rendererHints: {
      nextMove: 'deepen',
      suggestedRole: 'pressure',
      pressureTarget: 0.25,
      returnReadiness: 0.1,
      atmosphereMood: 'stillness',
      weatherPressure: 'low',
      lightingIntensityScale: 0.72,
      fogDensity: 0.2,
      audioTension: 0.1,
      hapticAmplitude: 0.05,
      movementDrag: 0.12
    },
    debug: {
      eventCount: 2,
      lastEventType: 'experience.directive.created'
    },
    playerFacingText: null
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('Session Frame validation rejects raw fields and unbounded renderer values', () => {
  const result = validateSessionFrame({
    schema: 'SessionFrameV1',
    schemaVersion: 1,
    frameId: '',
    frameIndex: -1,
    frameKind: 'explanation',
    presentation: {},
    experienceDirective: {},
    comfort: {
      intensityCeiling: 2,
      returnAvailable: 'sometimes',
      returnAnchorKind: '',
      suddenFlashAllowed: false,
      pursuitAllowed: true,
      hapticsEnabled: true,
      locomotionIntensity: -1
    },
    rendererHints: {
      nextMove: 'deepen',
      suggestedRole: 'pressure',
      pressureTarget: 2,
      returnReadiness: 0,
      atmosphereMood: '',
      weatherPressure: 'low',
      lightingIntensityScale: 0.72,
      fogDensity: 0.2,
      audioTension: 0.1,
      hapticAmplitude: 0.05,
      movementDrag: 0.12
    },
    debug: {
      eventCount: -1,
      lastEventType: 7
    },
    playerFacingText: 'The hidden system decided this.',
    rawSpeech: 'never store'
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.includes('sessionFrame.rawSpeech is not allowed'), true);
  assert.equal(result.errors.includes('frameId is required'), true);
  assert.equal(result.errors.includes('frameIndex must be a non-negative integer'), true);
  assert.equal(result.errors.includes('frameKind is unsupported'), true);
  assert.equal(result.errors.includes('comfort.intensityCeiling must be between 0 and 1'), true);
  assert.equal(result.errors.includes('rendererHints.pressureTarget must be between 0 and 1'), true);
  assert.equal(result.errors.includes('playerFacingText must be null'), true);
});

test('Runtime Readiness validation accepts internal startup reports', () => {
  const result = validateRuntimeReadiness(createRuntimeReadinessReport({
    catalog: loadBundledContentCatalog(),
    gniEndpoint: 'gni://local-dev-placeholder'
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('Runtime Readiness validation rejects malformed internal startup reports', () => {
  const validCapabilities = createRuntimeReadinessReport().capabilities;
  const result = validateRuntimeReadiness({
    schema: 'RuntimeReadinessV1',
    schemaVersion: 1,
    status: 'ready',
    canStartSession: true,
    blockedCount: 0,
    degradedCount: 0,
    platformTargets: ['node_prototype', ''],
    capabilities: { ...validCapabilities, unknown: true },
    contracts: ['SessionFrameV1', ''],
    checks: [{
      id: 'gni.provider',
      status: 'degraded',
      severity: 'optional',
      summary: 'GNI waits.',
      details: {},
      errors: []
    }],
    privateNotes: 'do not store',
    playerFacingText: 'Ready'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'runtimeReadiness.privateNotes is not allowed',
    'platformTargets[1] must be a non-empty string',
    'contracts[1] must be a non-empty string',
    'capabilities.unknown is not allowed',
    'playerFacingText must be null'
  ]);
});

test('session bundle validation checks optional covenant and Passage context', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.5,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { awakened: true },
    archetypeVector: { Seeker: 1 },
    sessionCovenant: {
      ...createSessionCovenant(),
      intensityCeiling: 3
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionCovenant.intensityCeiling must be between 0 and 1'
  ]);
});

test('GNI directive validation catches unsafe provider output before normalization', () => {
  const result = validateDirective({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: { garden: 9 },
    symbolEchoes: ['mirror', ''],
    pacingDelta: { noise: 1 }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamWeightDeltas.garden must be between -0.95 and 2',
    'pacingDelta.noise is not allowed',
    'symbolEchoes[1] must be a non-empty string'
  ]);
});

test('GNI request and bridge result validation accept provider-ready contracts', () => {
  const request = {
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
      selectedDream: { id: 'garden' },
      archetypeVector: { Seeker: 1 }
    }
  };
  const bridgeResult = {
    schema: 'GniBridgeResultV1',
    status: 'directive_ready',
    source: 'provider',
    request,
    rawResponse: { dreamWeightDeltas: { garden: 0.2 } },
    directive: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { garden: 0.2 },
      symbolEchoes: [],
      maskPressure: {},
      pacingDelta: {}
    },
    firebreakTrace: validFirebreakTrace(),
    errors: []
  };

  assert.deepEqual(validateGniProcessingRequest(request), { valid: true, errors: [] });
  assert.deepEqual(validateGniBridgeResult(bridgeResult), { valid: true, errors: [] });
});

test('GNI Firebreak trace validation accepts redacted suppression counts', () => {
  assert.deepEqual(validateGniFirebreakTrace(validFirebreakTrace()), { valid: true, errors: [] });

  const result = validateGniFirebreakTrace({
    ...validFirebreakTrace(),
    ceiling: 3,
    boundaryTags: ['pursuit', ''],
    suppressedCounts: {
      ...validFirebreakTrace().suppressedCounts,
      symbolEchoes: -1,
      rawToken: 1
    },
    rawPrompt: 'do not store'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'firebreakTrace.rawPrompt is not allowed',
    'ceiling must be between 0 and 2',
    'boundaryTags[1] must be a non-empty string',
    'suppressedCounts.rawToken is not allowed',
    'suppressedCounts.symbolEchoes must be a non-negative integer'
  ]);
});

test('Dreamer profile and memory context validation accept redacted hidden memory', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one'
  });
  profile.recordSession({
    sessionBundle: {
      schema: 'SessionBundleV1',
      schemaVersion: 1,
      sessionId: 'session-one',
      dominantArchetype: 'Seeker',
      coherence: 0.6,
      vibeState: 'calm_hopeful_boundless_bright_warm',
      recentSymbols: ['portal'],
      recentActions: ['open_portal'],
      roomConfigSnapshot: { portalOpen: true },
      selectedDream: { id: 'garden', symbolicTags: ['growth'] },
      archetypeVector: { Seeker: 1 }
    }
  });

  const snapshot = profile.snapshot();
  const context = profile.toGniMemoryContext({ slotId: 'slot-a' });

  assert.deepEqual(snapshot.memory.weatherTags, {});
  assert.deepEqual(snapshot.memory.dreadAxes, {});
  assert.deepEqual(context.familiarWeatherTags, []);
  assert.deepEqual(context.familiarDreadAxes, []);
  assert.deepEqual(validateDreamerProfile(snapshot), { valid: true, errors: [] });
  assert.deepEqual(validateDreamerMemoryContext(context), { valid: true, errors: [] });
});

test('Dreamer profile validation rejects raw private memory shapes', () => {
  const result = validateDreamerProfile({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2060-01-01T00:00:00.000Z',
    updatedAt: '2060-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 1,
      symbols: { portal: { count: 0, weight: 1, lastSeenAt: null } },
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
      lastSessionDigest: null,
      rawSpeech: ['I am afraid']
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'memory.rawSpeech is not allowed',
    'memory.symbols.portal.count must be a positive integer'
  ]);
});

test('Dreamer profile validation rejects malformed present weather aggregate memory maps', () => {
  const result = validateDreamerProfile({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2060-01-01T00:00:00.000Z',
    updatedAt: '2060-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 1,
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
      weatherTags: [],
      dreadAxes: { watching: { count: 1, weight: Number.NaN, lastSeenAt: null } },
      lastSessionDigest: null
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'memory.weatherTags must be an object',
    'memory.dreadAxes.watching.weight must be a finite number'
  ]);
});

test('Dreamer profile validation rejects unknown weather aggregate keys', () => {
  const result = validateDreamerProfile({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2060-01-01T00:00:00.000Z',
    updatedAt: '2060-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 1,
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
      weatherTags: {
        mist: { count: 1, weight: 1, lastSeenAt: null },
        raw_childhood_address: { count: 1, weight: 1, lastSeenAt: null }
      },
      dreadAxes: {
        watching: { count: 1, weight: 0.4, lastSeenAt: null },
        privateAxis: { count: 1, weight: 0.8, lastSeenAt: null }
      },
      lastSessionDigest: null
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'memory.weatherTags.raw_childhood_address is not allowed',
    'memory.dreadAxes.privateAxis is not allowed'
  ]);
});

test('Dreamer profile validation accepts old V1 profiles missing weather aggregate memory maps', () => {
  const result = validateDreamerProfile({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2060-01-01T00:00:00.000Z',
    updatedAt: '2060-01-01T00:00:00.000Z',
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
      lastSessionDigest: null
    }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('GNI request validation checks optional Dreamer memory context', () => {
  const result = validateGniProcessingRequest({
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
      archetypeVector: { Seeker: 1 },
      dreamerMemoryContext: {
        schema: 'DreamerMemoryContextV1',
        schemaVersion: 1,
        profileId: null,
        slotId: '',
        saveMode: 'continue',
        sessionCount: 1,
        strongSymbols: [],
        recurringArchetypes: [],
        familiarMasks: [],
        familiarDreamModules: [],
        familiarActions: [],
        familiarPassages: [],
        familiarMotifs: [],
        familiarGestures: [],
        echoThreadIds: [],
        vibeEchoes: [],
        familiarWeatherTags: [],
        familiarDreadAxes: [''],
        lastSessionDigest: null
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamerMemoryContext.slotId is required',
    'payload.dreamerMemoryContext.familiarDreadAxes[0] must be a non-empty string'
  ]);
});

test('Dreamer memory context validation accepts old V1 contexts missing weather lists', () => {
  const result = validateDreamerMemoryContext({
    schema: 'DreamerMemoryContextV1',
    schemaVersion: 1,
    profileId: null,
    slotId: 'slot-a',
    saveMode: 'continue',
    sessionCount: 0,
    strongSymbols: [],
    recurringArchetypes: [],
    familiarMasks: [],
    familiarDreamModules: [],
    familiarActions: [],
    familiarPassages: [],
    familiarMotifs: [],
    familiarGestures: [],
    echoThreadIds: [],
    vibeEchoes: [],
    lastSessionDigest: null
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('Dreamer memory context validation rejects unknown extra fields', () => {
  const result = validateDreamerMemoryContext({
    schema: 'DreamerMemoryContextV1',
    schemaVersion: 1,
    profileId: null,
    slotId: 'slot-a',
    saveMode: 'continue',
    sessionCount: 0,
    strongSymbols: [],
    recurringArchetypes: [],
    familiarMasks: [],
    familiarDreamModules: [],
    familiarActions: [],
    familiarPassages: [],
    familiarMotifs: [],
    familiarGestures: [],
    echoThreadIds: [],
    vibeEchoes: [],
    familiarWeatherTags: [],
    familiarDreadAxes: [],
    lastSessionDigest: null,
    rawWeatherData: { note: 'do not send' }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['dreamerMemoryContext.rawWeatherData is not allowed']);
});

test('Dreamer memory context validation rejects private weather and dread tokens', () => {
  const result = validateDreamerMemoryContext({
    schema: 'DreamerMemoryContextV1',
    schemaVersion: 1,
    profileId: null,
    slotId: 'slot-a',
    saveMode: 'continue',
    sessionCount: 0,
    strongSymbols: [],
    recurringArchetypes: [],
    familiarMasks: [],
    familiarDreamModules: [],
    familiarActions: [],
    familiarPassages: [],
    familiarMotifs: [],
    familiarGestures: [],
    echoThreadIds: [],
    vibeEchoes: [],
    familiarWeatherTags: ['mist', 'raw_childhood_address'],
    familiarDreadAxes: ['watching', 'privateAxis'],
    lastSessionDigest: null
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'familiarWeatherTags[1] must be an allowed weather tag',
    'familiarDreadAxes[1] must be a known dread axis'
  ]);
});

test('save game validation checks optional Dreamer profile payload', () => {
  const result = validateSaveGame({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {},
      dreamerProfile: {
        schema: 'DreamerProfileV1',
        schemaVersion: 1,
        profileId: '',
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
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['payload.dreamerProfile.profileId is required']);
});

test('SaveSlotPlan validation accepts slot mode and redacted memory context', () => {
  const result = validateSaveSlotPlan({
    schema: 'SaveSlotPlanV1',
    schemaVersion: 1,
    slotId: 'slot-a',
    mode: 'new_incarnation',
    incarnationIndex: 2,
    runSeed: 12345,
    crossSaveEchoes: true,
    sourceProfileId: 'dreamer-source',
    profile: validDreamerProfile(),
    dreamerMemoryContext: {
      ...validDreamerMemoryContext(),
      saveMode: 'new_incarnation'
    }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('SessionArc validation accepts hidden pacing state', () => {
  const result = validateSessionArc({
    schema: 'SessionArcV1',
    schemaVersion: 1,
    phase: 'deepening',
    beatCount: 3,
    pressure: 0.42,
    returnReadiness: 0.3,
    continuationSeed: 12345,
    recentBeatRoles: ['entry', 'pressure', 'mirror'],
    boundarySignalCount: 0,
    lastDecision: 'deepen',
    weightOverrides: {
      space_black_hole: 1.24
    }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('DreamSession validation accepts continuous hidden session results', () => {
  const result = validateDreamSession(validDreamSession());

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('DreamSessionCheckpoint validation accepts pause-ready hidden state', () => {
  const result = validateDreamSessionCheckpoint(createDreamSessionCheckpoint(validDreamSession()));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('save game validation checks optional DreamSessionCheckpoint payload', () => {
  const checkpoint = createDreamSessionCheckpoint(validDreamSession());
  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      dreamSessionCheckpoint: {
        ...checkpoint,
        nextBeatIndex: 1,
        isComplete: 'no',
        dreamflowState: {
          schema: 'DreamflowRuntimeStateV1',
          schemaVersion: 1,
          randomState: -1
        }
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamSessionCheckpoint.nextBeatIndex must be completedBeats + 1',
    'payload.dreamSessionCheckpoint.isComplete must be a boolean',
    'payload.dreamSessionCheckpoint.dreamflowState.randomState must be null or an unsigned integer'
  ]);
});

test('save game validation checks optional DreamSession payload', () => {
  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      dreamSession: {
        ...validDreamSession(),
        sessionId: '',
        completedBeats: 4,
        endedBecause: 'lost_inside',
        recentEchoTraces: 'not-an-array'
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamSession.sessionId is required',
    'payload.dreamSession.completedBeats cannot exceed maxBeats',
    'payload.dreamSession.endedBecause is unsupported',
    'payload.dreamSession.completedBeats must equal beats length',
    'payload.dreamSession.recentEchoTraces must be an array'
  ]);
});

test('save game validation checks optional SessionArc payload', () => {
  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      sessionArc: {
        schema: 'SessionArcV1',
        schemaVersion: 1,
        phase: 'trapped',
        beatCount: -1,
        pressure: 2,
        returnReadiness: -0.2,
        continuationSeed: -1,
        recentBeatRoles: ['entry', 'lost'],
        boundarySignalCount: -2,
        lastDecision: 'explain',
        weightOverrides: { garden: -1 }
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.sessionArc.phase is unsupported',
    'payload.sessionArc.beatCount must be a non-negative integer',
    'payload.sessionArc.pressure must be between 0 and 1',
    'payload.sessionArc.returnReadiness must be between 0 and 1',
    'payload.sessionArc.continuationSeed must be a non-negative integer',
    'payload.sessionArc.recentBeatRoles[1] must be entry, pressure, mirror, or return',
    'payload.sessionArc.boundarySignalCount must be a non-negative integer',
    'payload.sessionArc.lastDecision is unsupported',
    'payload.sessionArc.weightOverrides.garden must be between 0.05 and 3'
  ]);
});

test('save game validation checks optional SaveSlotPlan payload', () => {
  const result = validateSaveGame({
    ...validSaveGame(),
    payload: {
      ...validSaveGame().payload,
      saveSlot: {
        schema: 'SaveSlotPlanV1',
        schemaVersion: 1,
        slotId: '',
        mode: 'old_life',
        incarnationIndex: -1,
        runSeed: -4,
        crossSaveEchoes: 'yes',
        sourceProfileId: null,
        profile: validDreamerProfile(),
        dreamerMemoryContext: validDreamerMemoryContext()
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.saveSlot.slotId is required',
    'payload.saveSlot.mode must be fresh, continue, or new_incarnation',
    'payload.saveSlot.incarnationIndex must be a non-negative integer',
    'payload.saveSlot.runSeed must be a non-negative integer',
    'payload.saveSlot.crossSaveEchoes must be a boolean'
  ]);
});

test('GNI contract check report validation accepts endpoint check summaries', () => {
  const result = validateGniContractCheckReport({
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
          selectedDream: { id: 'garden' },
          archetypeVector: { Seeker: 1 }
        }
      }
    },
    response: {
      status: 'directive_ready',
      directive: {
        valid: true,
        errors: [],
        value: {
          schema: 'JungialDirectiveV1',
          schemaVersion: 1,
          dreamWeightDeltas: { garden: 0.2 },
          symbolEchoes: ['threshold'],
          maskPressure: {},
          pacingDelta: {}
        }
      },
      errors: []
    },
    job: null
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('GNI contract check report validation rejects impossible ok reports', () => {
  const result = validateGniContractCheckReport({
    schema: 'GniContractCheckReportV1',
    ok: true,
    endpoint: '',
    request: {
      valid: false,
      errors: [],
      value: {}
    },
    response: {
      status: 'provider_error',
      errors: []
    },
    job: {
      status: 'invalid_job_status',
      polls: 0,
      errors: []
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'endpoint is required',
    'request.errors must include details when request.valid is false',
    'response.errors must include details when status is provider_error',
    'job.polls must be a positive integer when job is present',
    'job.errors must include details when status is invalid_job_status',
    'ok cannot be true when request, response, or job failed'
  ]);
});

test('GNI bridge result validation rejects impossible status envelopes', () => {
  const request = validGniRequest();

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'directive_ready',
    source: 'provider',
    request,
    rawResponse: null,
    directive: null,
    errors: []
  }), {
    valid: false,
    errors: [
      'directive is required when status is directive_ready',
      'rawResponse is required when status is directive_ready'
    ]
  });

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'pending',
    source: 'none',
    request,
    rawResponse: null,
    directive: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: {},
      symbolEchoes: [],
      maskPressure: {},
      pacingDelta: {}
    },
    errors: []
  }), {
    valid: false,
    errors: ['directive must be null unless status is directive_ready']
  });

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'provider_error',
    source: 'provider',
    request,
    rawResponse: null,
    directive: null,
    errors: []
  }), {
    valid: false,
    errors: ['errors must include provider error details']
  });
});

test('GNI provider job metadata validation rejects malformed async handles', () => {
  const request = validGniRequest();

  const bridgeResult = validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'provider_empty',
    source: 'provider',
    request,
    rawResponse: {
      schema: 'GniProviderPendingV1',
      status: 'pending',
      providerJob: { id: '' }
    },
    directive: null,
    providerJob: { id: '', pollAfterMs: -1 },
    errors: []
  });
  const queue = validateGniDirectiveQueue({
    schema: 'GniDirectiveQueueV1',
    pending: [{
      id: 'gni_pending_session-one',
      status: 'pending',
      reason: 'provider_empty',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      providerJob: { id: 'gni-job-001', pollAfterMs: -1 },
      request
    }],
    resolved: []
  });

  assert.deepEqual(bridgeResult.errors, [
    'providerJob.id is required',
    'providerJob.pollAfterMs must be a non-negative integer'
  ]);
  assert.deepEqual(queue.errors, [
    'pending[0].providerJob.pollAfterMs must be a non-negative integer'
  ]);
});

test('GNI directive queue validation accepts pending and resolved envelopes', () => {
  const request = {
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
      selectedDream: { id: 'garden' },
      archetypeVector: { Seeker: 1 }
    }
  };

  const queue = {
    schema: 'GniDirectiveQueueV1',
    pending: [{
      id: 'gni_pending_session-one',
      status: 'pending',
      reason: 'provider_empty',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      request
    }],
    resolved: [{
      id: 'gni_pending_session-one',
      status: 'resolved',
      reason: 'pending',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      resolvedAt: '2080-01-01T00:02:00.000Z',
      request,
      directive: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: { garden: 0.2 },
        symbolEchoes: ['light'],
        maskPressure: {},
        pacingDelta: {}
      }
    }]
  };

  assert.deepEqual(validateGniDirectiveQueue(queue), { valid: true, errors: [] });
});

test('GNI queue process result validation accepts processor output envelopes', () => {
  const queue = {
    schema: 'GniDirectiveQueueV1',
    pending: [],
    resolved: []
  };
  const result = {
    schema: 'GniDirectiveQueueProcessResultV1',
    processed: [{
      id: 'gni_pending_session-one',
      status: 'directive_ready',
      directive: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: { garden: 0.2 },
        symbolEchoes: ['threshold'],
        maskPressure: {},
        pacingDelta: {}
      },
      directiveUpdate: {
        adjustedWeights: { garden: 1.2 },
        symbolFrequency: { threshold: 1 },
        maskPressure: {},
        pacingProfile: { intensity: 0.2, repetition: 0.1, silence: 0.6 }
      },
      errors: []
    }],
    queue,
    architectState: {
      globalDreamWeights: { garden: 1.2 },
      symbolFrequency: { threshold: 1 },
      pacingProfile: { intensity: 0.2, repetition: 0.1, silence: 0.6 },
      futureDreamModuleWeights: {},
      maskPressure: {}
    }
  };

  assert.deepEqual(validateGniQueueProcessResult(result), { valid: true, errors: [] });
});

test('GNI queue process result validation rejects ready entries without directives', () => {
  const result = validateGniQueueProcessResult({
    schema: 'GniDirectiveQueueProcessResultV1',
    processed: [{
      id: 'gni_pending_session-one',
      status: 'directive_ready',
      errors: []
    }],
    queue: {
      schema: 'GniDirectiveQueueV1',
      pending: [],
      resolved: []
    },
    architectState: {}
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'processed[0].directive is required when status is directive_ready'
  ]);
});

test('save game validation rejects malformed trace payloads', () => {
  const result = validateSaveGame({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {},
      trace: {
        schema: 'JungialTraceV1',
        runId: 'trace-one',
        entries: [{
          index: 0,
          at: '',
          type: '',
          payload: {}
        }]
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.trace.entries[0].index must be a positive integer',
    'payload.trace.entries[0].at must be a non-empty string',
    'payload.trace.entries[0].type must be a non-empty string'
  ]);
});

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

function validGniRequest() {
  return {
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
      selectedDream: { id: 'garden' },
      archetypeVector: { Seeker: 1 }
    }
  };
}

function validFirebreakTrace() {
  return {
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
  };
}

function validDreamerProfile() {
  return new DreamerProfile({
    profileId: 'dreamer-source',
    rootSeed: 'root-source',
    createdAt: '2080-01-01T00:00:00.000Z',
    updatedAt: '2080-01-01T00:00:00.000Z',
    consent: {
      profileMemory: true,
      crossSaveEchoes: true
    }
  }).snapshot();
}

function validDreamerMemoryContext() {
  return {
    schema: 'DreamerMemoryContextV1',
    schemaVersion: 1,
    profileId: 'dreamer-source',
    slotId: 'slot-a',
    saveMode: 'continue',
    sessionCount: 1,
    strongSymbols: ['portal'],
    recurringArchetypes: ['Seeker'],
    familiarMasks: [],
    familiarDreamModules: [],
    familiarActions: [],
    familiarPassages: [],
    familiarMotifs: [],
    familiarGestures: [],
    echoThreadIds: [],
    vibeEchoes: [],
    familiarWeatherTags: [],
    familiarDreadAxes: [],
    lastSessionDigest: 'digest-one'
  };
}

function validSessionBundle() {
  return {
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
  };
}

function validSaveGame() {
  return {
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {}
    }
  };
}

function validDreamSession() {
  const runtime = createJungialRuntime({
    seed: 505,
    clock: createDeterministicClock({ startIso: '2080-01-01T00:00:00.000Z' })
  });
  applyPlayerInput({ source: 'system', kind: 'speech', text: 'the word' }, runtime);
  applyPlayerInput({ source: 'system', kind: 'action', name: 'open_portal' }, runtime);

  return runDreamSessionFromRuntime({
    runtime,
    covenant: createSessionCovenant({ toneTags: ['strange'], intensityCeiling: 0.45 }),
    seed: 505,
    maxBeats: 2,
    responses: [
      { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
      { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 }
    ]
  });
}
