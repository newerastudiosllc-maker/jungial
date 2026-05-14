const DREAD_BUDGET_AXES = Object.freeze([
  'pursuit',
  'bodyUnease',
  'cosmicDread',
  'disorientation',
  'loss',
  'watching',
  'claustrophobia'
]);
const WEATHER_TAGS = Object.freeze([
  'silence',
  'threshold',
  'soft_lamp',
  'mirror',
  'ash',
  'mist',
  'static',
  'gravity',
  'garden',
  'warmth',
  'cold',
  'distant_voice',
  'watching',
  'boundless',
  'contained',
  'pursuit'
]);
const WEATHER_SYMBOLIC_TAGS = Object.freeze([
  'annihilation',
  'rebirth',
  'cosmic_mystery',
  'reflection',
  'shadow',
  'self_observation',
  'safety',
  'memory',
  'hearth',
  'containment',
  'growth',
  'innocence',
  'fertility',
  'beauty',
  'dissolution',
  'void',
  'star',
  'unknown',
  'invitation',
  'door',
  'breath',
  'lamp'
]);
const ALLOWED_WEATHER_TAGS = Object.freeze(new Set([
  ...WEATHER_TAGS,
  ...DREAD_BUDGET_AXES,
  ...WEATHER_SYMBOLIC_TAGS
]));
const DREAM_WEATHER_MOODS = Object.freeze(['stillness', 'hush', 'gravity', 'flicker', 'bloom', 'eclipse']);
const DREAM_WEATHER_PRESSURES = Object.freeze(['low', 'medium', 'heavy', 'storm']);

export function validateSessionBundle(bundle) {
  const errors = [];

  if (bundle?.schema !== 'SessionBundleV1') {
    errors.push('schema must be SessionBundleV1');
  }
  if (bundle?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  if (!isNonEmptyString(bundle?.sessionId)) {
    errors.push('sessionId is required');
  }
  if (!isNonEmptyString(bundle?.dominantArchetype)) {
    errors.push('dominantArchetype is required');
  }
  if (!Number.isFinite(bundle?.coherence)) {
    errors.push('coherence is required');
  }
  if (!isNonEmptyString(bundle?.vibeState)) {
    errors.push('vibeState is required');
  }
  if (!Array.isArray(bundle?.recentSymbols)) {
    errors.push('recentSymbols must be an array');
  }
  if (!Array.isArray(bundle?.recentActions)) {
    errors.push('recentActions must be an array');
  }
  if (!isObject(bundle?.roomConfigSnapshot)) {
    errors.push('roomConfigSnapshot is required');
  }
  if (!isObject(bundle?.archetypeVector)) {
    errors.push('archetypeVector is required');
  }
  if (bundle?.dreamerMemoryContext !== undefined) {
    const memoryValidation = validateDreamerMemoryContext(bundle.dreamerMemoryContext);
    if (!memoryValidation.valid) {
      errors.push(...memoryValidation.errors.map((error) => `dreamerMemoryContext.${error}`));
    }
  }
  if (bundle?.sessionCovenant !== undefined) {
    const covenantValidation = validateSessionCovenant(bundle.sessionCovenant);
    if (!covenantValidation.valid) {
      errors.push(...covenantValidation.errors.map((error) => `sessionCovenant.${error}`));
    }
  }
  if (bundle?.dreamWeatherContext !== undefined) {
    const weatherValidation = validateDreamWeatherContext(bundle.dreamWeatherContext);
    if (!weatherValidation.valid) {
      errors.push(...prefixNestedErrors(weatherValidation.errors, 'dreamWeatherContext', 'dreamWeatherContext'));
    }
  }
  if (bundle?.passageContext !== undefined) {
    if (!isObject(bundle.passageContext)) {
      errors.push('passageContext must be an object');
    } else {
      if (!Array.isArray(bundle.passageContext.recentMotifs)) {
        errors.push('passageContext.recentMotifs must be an array');
      }
      if (!Array.isArray(bundle.passageContext.recentGestureTags)) {
        errors.push('passageContext.recentGestureTags must be an array');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreadBudget(budget) {
  const errors = [];

  errors.push(...validateKnownKeys(budget, DREAD_BUDGET_AXES, 'dreadBudget'));
  for (const axis of DREAD_BUDGET_AXES) {
    errors.push(...validateNumberBetween(budget?.[axis], axis, 0, 1));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamWeather(weather) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'weatherId',
    'mood',
    'pressure',
    'ceiling',
    'dreadBudget',
    'weatherTags',
    'suppressedTags',
    'atmosphere'
  ];
  const atmosphereKeys = ['lightIntensity', 'fogDensity', 'bloom', 'exposure', 'warmth', 'movementDrag'];

  if (weather?.schema !== 'DreamWeatherV1') {
    errors.push('schema must be DreamWeatherV1');
  }
  if (weather?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(weather, allowedKeys, 'dreamWeather'));
  if (!isNonEmptyString(weather?.weatherId)) {
    errors.push('weatherId is required');
  }
  if (!DREAM_WEATHER_MOODS.includes(weather?.mood)) {
    errors.push(`mood must be one of ${DREAM_WEATHER_MOODS.join(', ')}`);
  }
  if (!DREAM_WEATHER_PRESSURES.includes(weather?.pressure)) {
    errors.push(`pressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  errors.push(...validateNumberBetween(weather?.ceiling, 'ceiling', 0, 1));

  const dreadValidation = validateDreadBudget(weather?.dreadBudget);
  if (!dreadValidation.valid) {
    errors.push(...prefixNestedErrors(dreadValidation.errors, 'dreadBudget', 'dreadBudget'));
  }
  errors.push(...validateWeatherTagList(weather?.weatherTags, 'weatherTags'));
  errors.push(...validateWeatherTagList(weather?.suppressedTags, 'suppressedTags'));
  if (!isObject(weather?.atmosphere)) {
    errors.push('atmosphere must be an object');
  } else {
    errors.push(...validateKnownKeys(weather.atmosphere, atmosphereKeys, 'atmosphere'));
    for (const key of atmosphereKeys) {
      errors.push(...validateNumberBetween(weather.atmosphere[key], `atmosphere.${key}`, 0, 1));
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateWeatherTrace(trace) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'traceId',
    'weatherId',
    'mood',
    'pressure',
    'sourceTags',
    'resultingTags',
    'suppressedTags',
    'strongestDreadAxis'
  ];

  if (trace?.schema !== 'WeatherTraceV1') {
    errors.push('schema must be WeatherTraceV1');
  }
  if (trace?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(trace, allowedKeys, 'weatherTrace'));
  if (!isNonEmptyString(trace?.traceId)) {
    errors.push('traceId is required');
  }
  if (!(trace?.weatherId === null || typeof trace?.weatherId === 'string')) {
    errors.push('weatherId must be a string or null');
  }
  if (!DREAM_WEATHER_MOODS.includes(trace?.mood)) {
    errors.push(`mood must be one of ${DREAM_WEATHER_MOODS.join(', ')}`);
  }
  if (!DREAM_WEATHER_PRESSURES.includes(trace?.pressure)) {
    errors.push(`pressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  errors.push(...validateWeatherTagList(trace?.sourceTags, 'sourceTags'));
  errors.push(...validateWeatherTagList(trace?.resultingTags, 'resultingTags'));
  errors.push(...validateWeatherTagList(trace?.suppressedTags, 'suppressedTags'));
  if (!DREAD_BUDGET_AXES.includes(trace?.strongestDreadAxis)) {
    errors.push(`strongestDreadAxis must be one of ${DREAD_BUDGET_AXES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamWeatherContext(context) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'weatherTags',
    'pressure',
    'dreadBudget',
    'suppressedTags'
  ];

  if (context?.schema !== 'DreamWeatherContextV1') {
    errors.push('schema must be DreamWeatherContextV1');
  }
  if (context?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(context, allowedKeys, 'dreamWeatherContext'));
  errors.push(...validateWeatherTagList(context?.weatherTags, 'weatherTags'));
  if (!DREAM_WEATHER_PRESSURES.includes(context?.pressure)) {
    errors.push(`pressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  const dreadValidation = validateDreadBudget(context?.dreadBudget);
  if (!dreadValidation.valid) {
    errors.push(...prefixNestedErrors(dreadValidation.errors, 'dreadBudget', 'dreadBudget'));
  }
  errors.push(...validateWeatherTagList(context?.suppressedTags, 'suppressedTags'));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamerMemoryContext(context) {
  const errors = [];
  const requiredLists = [
    'strongSymbols',
    'recurringArchetypes',
    'familiarMasks',
    'familiarDreamModules',
    'familiarActions',
    'familiarPassages',
    'familiarMotifs',
    'familiarGestures',
    'echoThreadIds',
    'vibeEchoes',
    'familiarWeatherTags',
    'familiarDreadAxes'
  ];

  if (context?.schema !== 'DreamerMemoryContextV1') {
    errors.push('schema must be DreamerMemoryContextV1');
  }
  if (context?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  if (!(context?.profileId === null || isNonEmptyString(context?.profileId))) {
    errors.push('profileId must be a non-empty string or null');
  }
  if (!isNonEmptyString(context?.slotId)) {
    errors.push('slotId is required');
  }
  if (!['fresh', 'continue', 'new_incarnation'].includes(context?.saveMode)) {
    errors.push('saveMode must be fresh, continue, or new_incarnation');
  }
  if (!Number.isInteger(context?.sessionCount) || context.sessionCount < 0) {
    errors.push('sessionCount must be a non-negative integer');
  }
  for (const key of requiredLists) {
    errors.push(...validateStringList(context?.[key], key));
  }
  if (!isNullableString(context?.lastSessionDigest)) {
    errors.push('lastSessionDigest must be a string or null');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamerProfile(profile) {
  const errors = [];

  if (profile?.schema !== 'DreamerProfileV1') {
    errors.push('schema must be DreamerProfileV1');
  }
  if (profile?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  if (!isNonEmptyString(profile?.profileId)) {
    errors.push('profileId is required');
  }
  if (!isNonEmptyString(profile?.rootSeed)) {
    errors.push('rootSeed is required');
  }
  if (!isNonEmptyString(profile?.createdAt)) {
    errors.push('createdAt is required');
  }
  if (!isNonEmptyString(profile?.updatedAt)) {
    errors.push('updatedAt is required');
  }

  if (!isObject(profile?.consent)) {
    errors.push('consent must be an object');
  } else {
    if (typeof profile.consent.profileMemory !== 'boolean') {
      errors.push('consent.profileMemory must be a boolean');
    }
    if (typeof profile.consent.crossSaveEchoes !== 'boolean') {
      errors.push('consent.crossSaveEchoes must be a boolean');
    }
  }

  if (!isObject(profile?.memory)) {
    errors.push('memory must be an object');
  } else {
    const allowedMemoryKeys = [
      'sessionCount',
      'symbols',
      'archetypes',
      'actions',
      'dreamModules',
      'masks',
      'vibeStates',
      'passages',
      'motifs',
      'gestures',
      'echoThreads',
      'weatherTags',
      'dreadAxes',
      'lastSessionDigest'
    ];
    errors.push(...validateKnownKeys(profile.memory, allowedMemoryKeys, 'memory'));
    if (!Number.isInteger(profile.memory.sessionCount) || profile.memory.sessionCount < 0) {
      errors.push('memory.sessionCount must be a non-negative integer');
    }
    errors.push(...validateMemoryMap(profile.memory.symbols, 'memory.symbols'));
    errors.push(...validateMemoryMap(profile.memory.archetypes, 'memory.archetypes'));
    errors.push(...validateMemoryMap(profile.memory.actions, 'memory.actions'));
    errors.push(...validateMemoryMap(profile.memory.dreamModules, 'memory.dreamModules'));
    errors.push(...validateMemoryMap(profile.memory.masks, 'memory.masks'));
    errors.push(...validateMemoryMap(profile.memory.vibeStates, 'memory.vibeStates'));
    errors.push(...validateMemoryMap(profile.memory.passages, 'memory.passages'));
    errors.push(...validateMemoryMap(profile.memory.motifs, 'memory.motifs'));
    errors.push(...validateMemoryMap(profile.memory.gestures, 'memory.gestures'));
    errors.push(...validateMemoryMap(profile.memory.echoThreads, 'memory.echoThreads'));
    errors.push(...validateMemoryMap(profile.memory.weatherTags, 'memory.weatherTags'));
    errors.push(...validateMemoryMap(profile.memory.dreadAxes, 'memory.dreadAxes'));
    if (!isNullableString(profile.memory.lastSessionDigest)) {
      errors.push('memory.lastSessionDigest must be a string or null');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionCovenant(covenant) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'mode',
    'toneTags',
    'intensityCeiling',
    'hardBoundaryTags',
    'softBoundaryTags',
    'allowedPressureTags',
    'returnAnchor',
    'groundingPreference',
    'memoryScope'
  ];

  if (covenant?.schema !== 'SessionCovenantV1') {
    errors.push('schema must be SessionCovenantV1');
  }
  if (covenant?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(covenant, allowedKeys, 'covenant'));
  if (!['first_listening', 'tonight_shape'].includes(covenant?.mode)) {
    errors.push('mode must be first_listening or tonight_shape');
  }
  for (const key of ['toneTags', 'hardBoundaryTags', 'softBoundaryTags', 'allowedPressureTags']) {
    errors.push(...validateStringList(covenant?.[key], key));
  }
  if (!Number.isFinite(covenant?.intensityCeiling) || covenant.intensityCeiling < 0 || covenant.intensityCeiling > 1) {
    errors.push('intensityCeiling must be between 0 and 1');
  }
  if (!isObject(covenant?.returnAnchor)) {
    errors.push('returnAnchor must be an object');
  } else {
    if (!isNonEmptyString(covenant.returnAnchor.kind)) {
      errors.push('returnAnchor.kind is required');
    }
    if (!isNonEmptyString(covenant.returnAnchor.value)) {
      errors.push('returnAnchor.value is required');
    }
  }
  if (!isNonEmptyString(covenant?.groundingPreference)) {
    errors.push('groundingPreference is required');
  }
  if (!['session_only', 'profile_aggregate'].includes(covenant?.memoryScope)) {
    errors.push('memoryScope must be session_only or profile_aggregate');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validatePassage(passage) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'id',
    'motifs',
    'pressureTags',
    'formTags',
    'intensityBand',
    'allowedResponseKinds',
    'returnAnchorTags',
    'variationFamily',
    'baseWeight'
  ];

  if (passage?.schema !== 'PassageV1') {
    errors.push('schema must be PassageV1');
  }
  if (passage?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(passage, allowedKeys, 'passage'));
  if (!isNonEmptyString(passage?.id)) {
    errors.push('id is required');
  }
  for (const key of ['motifs', 'pressureTags', 'formTags', 'allowedResponseKinds', 'returnAnchorTags']) {
    errors.push(...validateStringList(passage?.[key], key));
  }
  if (!['gentle', 'strange', 'dark', 'horrific', 'abyssal'].includes(passage?.intensityBand)) {
    errors.push('intensityBand is unsupported');
  }
  if (!isNonEmptyString(passage?.variationFamily)) {
    errors.push('variationFamily is required');
  }
  if (!Number.isFinite(passage?.baseWeight) || passage.baseWeight <= 0) {
    errors.push('baseWeight must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateEchoTrace(trace) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'passageId',
    'motifsTouched',
    'gestureTags',
    'tempo',
    'pressureAccepted',
    'returnAnchorUsed',
    'boundarySignals',
    'dreamflowDeltas'
  ];

  if (trace?.schema !== 'EchoTraceV1') {
    errors.push('schema must be EchoTraceV1');
  }
  if (trace?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(trace, allowedKeys, 'echoTrace'));
  if (!isNonEmptyString(trace?.passageId)) {
    errors.push('passageId is required');
  }
  for (const key of ['motifsTouched', 'gestureTags', 'boundarySignals']) {
    errors.push(...validateStringList(trace?.[key], key));
  }
  if (!isNonEmptyString(trace?.tempo)) {
    errors.push('tempo is required');
  }
  if (!Number.isFinite(trace?.pressureAccepted) || trace.pressureAccepted < 0 || trace.pressureAccepted > 1) {
    errors.push('pressureAccepted must be between 0 and 1');
  }
  if (typeof trace?.returnAnchorUsed !== 'boolean') {
    errors.push('returnAnchorUsed must be a boolean');
  }
  errors.push(...validateOptionalNumberMap(trace?.dreamflowDeltas, 'dreamflowDeltas', {
    min: -1,
    max: 1
  }));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDirective(directive) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'dreamWeightDeltas',
    'symbolEchoes',
    'maskPressure',
    'pacingDelta'
  ];

  if (directive?.schema !== 'JungialDirectiveV1') {
    errors.push('schema must be JungialDirectiveV1');
  }
  if (directive?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(directive, allowedKeys, 'directive'));
  errors.push(...validateOptionalNumberMap(directive?.dreamWeightDeltas, 'dreamWeightDeltas', {
    min: -0.95,
    max: 2
  }));
  errors.push(...validateOptionalNumberMap(directive?.maskPressure, 'maskPressure', {
    min: -1,
    max: 1
  }));
  errors.push(...validateOptionalNumberMap(directive?.pacingDelta, 'pacingDelta', {
    min: -1,
    max: 1,
    allowedKeys: ['intensity', 'repetition', 'silence']
  }));

  if (directive?.symbolEchoes !== undefined) {
    if (!Array.isArray(directive.symbolEchoes)) {
      errors.push('symbolEchoes must be an array');
    } else {
      directive.symbolEchoes.forEach((symbol, index) => {
        if (typeof symbol !== 'string' || symbol.trim().length === 0) {
          errors.push(`symbolEchoes[${index}] must be a non-empty string`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGniProcessingRequest(request) {
  const errors = [];

  if (request?.schema !== 'GniProcessingRequestV1') {
    errors.push('schema must be GniProcessingRequestV1');
  }
  if (request?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  if (request?.provider !== 'GNI') {
    errors.push('provider must be GNI');
  }
  if (!isNonEmptyString(request?.endpoint)) {
    errors.push('endpoint is required');
  }
  if (!isNonEmptyString(request?.model)) {
    errors.push('model is required');
  }
  if (!isObject(request?.contract)) {
    errors.push('contract is required');
  } else {
    if (request.contract.inputFormat !== 'SessionBundleV1') {
      errors.push('contract.inputFormat must be SessionBundleV1');
    }
    if (request.contract.outputFormat !== 'JungialDirectiveV1') {
      errors.push('contract.outputFormat must be JungialDirectiveV1');
    }
    if (!Array.isArray(request.contract.allowedDirectives)) {
      errors.push('contract.allowedDirectives must be an array');
    }
  }

  const payloadValidation = validateSessionBundle(request?.payload);
  if (!payloadValidation.valid) {
    errors.push(...payloadValidation.errors.map((error) => `payload.${error}`));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGniBridgeResult(result) {
  const errors = [];
  const statuses = ['invalid_session', 'pending', 'provider_empty', 'provider_error', 'directive_ready'];
  const sources = ['none', 'provided', 'provider', 'emulator'];

  if (result?.schema !== 'GniBridgeResultV1') {
    errors.push('schema must be GniBridgeResultV1');
  }
  if (!statuses.includes(result?.status)) {
    errors.push(`status must be one of ${statuses.join(', ')}`);
  }
  if (!sources.includes(result?.source)) {
    errors.push(`source must be one of ${sources.join(', ')}`);
  }
  if (result?.request !== null) {
    const requestValidation = validateGniProcessingRequest(result?.request);
    if (!requestValidation.valid) {
      errors.push(...requestValidation.errors.map((error) => `request.${error}`));
    }
  }
  if (result?.directive !== null) {
    const directiveValidation = validateDirective(result?.directive);
    if (!directiveValidation.valid) {
      errors.push(...directiveValidation.errors.map((error) => `directive.${error}`));
    }
  }
  if (result?.rawResponse !== null && !isObject(result?.rawResponse)) {
    errors.push('rawResponse must be an object or null');
  }
  errors.push(...validateProviderJob(result?.providerJob, 'providerJob'));
  if (!Array.isArray(result?.errors)) {
    errors.push('errors must be an array');
  } else {
    result.errors.forEach((error, index) => {
      if (typeof error !== 'string') {
        errors.push(`errors[${index}] must be a string`);
      }
    });
  }
  if (result?.status === 'directive_ready') {
    if (result?.directive == null) {
      errors.push('directive is required when status is directive_ready');
    }
    if (result?.rawResponse == null) {
      errors.push('rawResponse is required when status is directive_ready');
    }
  } else if (result?.directive !== null) {
    errors.push('directive must be null unless status is directive_ready');
  }
  if (result?.status === 'provider_error' && Array.isArray(result?.errors) && result.errors.length === 0) {
    errors.push('errors must include provider error details');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGniDirectiveQueue(queue) {
  const errors = [];

  if (queue?.schema !== 'GniDirectiveQueueV1') {
    errors.push('schema must be GniDirectiveQueueV1');
  }
  if (!Array.isArray(queue?.pending)) {
    errors.push('pending must be an array');
  } else {
    queue.pending.forEach((entry, index) => {
      errors.push(...validateQueueEntry(entry, `pending[${index}]`, 'pending'));
    });
  }
  if (!Array.isArray(queue?.resolved)) {
    errors.push('resolved must be an array');
  } else {
    queue.resolved.forEach((entry, index) => {
      errors.push(...validateQueueEntry(entry, `resolved[${index}]`, 'resolved'));
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGniQueueProcessResult(result) {
  const errors = [];

  if (result?.schema !== 'GniDirectiveQueueProcessResultV1') {
    errors.push('schema must be GniDirectiveQueueProcessResultV1');
  }
  if (!Array.isArray(result?.processed)) {
    errors.push('processed must be an array');
  } else {
    result.processed.forEach((entry, index) => {
      errors.push(...validateQueueProcessEntry(entry, `processed[${index}]`));
    });
  }

  const queueValidation = validateGniDirectiveQueue(result?.queue);
  if (!queueValidation.valid) {
    errors.push(...queueValidation.errors.map((error) => `queue.${error}`));
  }
  if (!isObject(result?.architectState)) {
    errors.push('architectState must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGniContractCheckReport(report) {
  const errors = [];

  if (report?.schema !== 'GniContractCheckReportV1') {
    errors.push('schema must be GniContractCheckReportV1');
  }
  if (typeof report?.ok !== 'boolean') {
    errors.push('ok must be a boolean');
  }
  if (!isNonEmptyString(report?.endpoint)) {
    errors.push('endpoint is required');
  }

  const requestOk = validateContractCheckRequest(report?.request, errors);
  const responseOk = validateContractCheckEndpointResult(report?.response, 'response', errors, { requirePolls: false });
  const jobOk = report?.job === null
    ? true
    : validateContractCheckEndpointResult(report?.job, 'job', errors, { requirePolls: true });

  if (report?.ok === true && (!requestOk || !responseOk || !jobOk)) {
    errors.push('ok cannot be true when request, response, or job failed');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateTrace(trace) {
  const errors = [];

  if (trace?.schema !== 'JungialTraceV1') {
    errors.push('schema must be JungialTraceV1');
  }
  if (!isNonEmptyString(trace?.runId)) {
    errors.push('runId is required');
  }
  if (!Array.isArray(trace?.entries)) {
    errors.push('entries must be an array');
  } else {
    trace.entries.forEach((entry, index) => {
      const label = `entries[${index}]`;
      if (!Number.isInteger(entry?.index) || entry.index < 1) {
        errors.push(`${label}.index must be a positive integer`);
      }
      if (!isNonEmptyString(entry?.at)) {
        errors.push(`${label}.at must be a non-empty string`);
      }
      if (!isNonEmptyString(entry?.type)) {
        errors.push(`${label}.type must be a non-empty string`);
      }
      if (entry?.payload === undefined) {
        errors.push(`${label}.payload is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateContractCheckRequest(request, errors) {
  if (!isObject(request)) {
    errors.push('request must be an object');
    return false;
  }
  if (typeof request.valid !== 'boolean') {
    errors.push('request.valid must be a boolean');
    return false;
  }
  if (!Array.isArray(request.errors)) {
    errors.push('request.errors must be an array');
  } else if (request.valid === false && request.errors.length === 0) {
    errors.push('request.errors must include details when request.valid is false');
  }
  if (request.valid === true) {
    const requestValidation = validateGniProcessingRequest(request.value);
    if (!requestValidation.valid) {
      errors.push(...requestValidation.errors.map((error) => `request.value.${error}`));
      return false;
    }
  }
  return request.valid === true;
}

function validateContractCheckEndpointResult(result, label, errors, { requirePolls }) {
  const statuses = ['directive_ready', 'provider_pending', 'provider_empty', 'provider_error', 'invalid_directive', 'invalid_job_status'];
  if (!isObject(result)) {
    errors.push(`${label} must be an object or null`);
    return false;
  }
  if (!statuses.includes(result.status)) {
    errors.push(`${label}.status must be one of ${statuses.join(', ')}`);
  }
  if (!Array.isArray(result.errors)) {
    errors.push(`${label}.errors must be an array`);
  }
  if (requirePolls && (!Number.isInteger(result.polls) || result.polls < 1)) {
    errors.push(`${label}.polls must be a positive integer when ${label} is present`);
  }
  if (Array.isArray(result.errors) && ['provider_error', 'invalid_directive', 'invalid_job_status'].includes(result.status) && result.errors.length === 0) {
    errors.push(`${label}.errors must include details when status is ${result.status}`);
  }
  errors.push(...validateProviderJob(result.providerJob, `${label}.providerJob`));

  if (result.status === 'directive_ready') {
    const directiveValidation = validateContractCheckDirectiveReport(result.directive, `${label}.directive`);
    if (!directiveValidation.valid) {
      errors.push(...directiveValidation.errors);
      return false;
    }
  }

  return ['directive_ready', 'provider_pending', 'provider_empty'].includes(result.status)
    && (Array.isArray(result.errors) ? result.errors.length === 0 : false);
}

function validateContractCheckDirectiveReport(directive, label) {
  const errors = [];
  if (!isObject(directive)) {
    return {
      valid: false,
      errors: [`${label} must be an object`]
    };
  }
  if (directive.valid !== true) {
    errors.push(`${label}.valid must be true when status is directive_ready`);
  }
  if (!Array.isArray(directive.errors)) {
    errors.push(`${label}.errors must be an array`);
  }
  const directiveValidation = validateDirective(directive.value);
  if (!directiveValidation.valid) {
    errors.push(...directiveValidation.errors.map((error) => `${label}.value.${error}`));
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSaveGame(saveGame) {
  const errors = [];

  if (saveGame?.schema !== 'JungialSaveGame') {
    errors.push('schema must be JungialSaveGame');
  }
  if (saveGame?.version !== 1) {
    errors.push('version must be 1');
  }
  if (!isNonEmptyString(saveGame?.savedAt)) {
    errors.push('savedAt is required');
  }
  if (!Array.isArray(saveGame?.migrations)) {
    errors.push('migrations must be an array');
  } else {
    saveGame.migrations.forEach((migration, index) => {
      if (typeof migration !== 'string') {
        errors.push(`migrations[${index}] must be a string`);
      }
    });
  }
  if (!isObject(saveGame?.payload)) {
    errors.push('payload must be an object');
    return {
      valid: errors.length === 0,
      errors
    };
  }

  const requiredPayloadObjects = ['room', 'archetypeState', 'feelingState', 'journal', 'architectState'];
  for (const key of requiredPayloadObjects) {
    if (!isObject(saveGame.payload[key])) {
      errors.push(`payload.${key} must be an object`);
    }
  }

  errors.push(...validateOptionalNestedContract(
    saveGame.payload.gniQueue,
    'payload.gniQueue',
    validateGniDirectiveQueue
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.lastSessionBundle,
    'payload.lastSessionBundle',
    validateSessionBundle
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.pendingGniRequest,
    'payload.pendingGniRequest',
    validateGniProcessingRequest
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.gniBridgeResult,
    'payload.gniBridgeResult',
    validateGniBridgeResult
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.appliedGniDirective,
    'payload.appliedGniDirective',
    validateDirective
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.lastGniQueueProcessResult,
    'payload.lastGniQueueProcessResult',
    validateGniQueueProcessResult
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.dreamerProfile,
    'payload.dreamerProfile',
    validateDreamerProfile
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionCovenant,
    'payload.sessionCovenant',
    validateSessionCovenant
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.echoTrace,
    'payload.echoTrace',
    validateEchoTrace
  ));
  if (saveGame.payload.dreamWeather !== undefined) {
    if (!isObject(saveGame.payload.dreamWeather)) {
      errors.push('payload.dreamWeather must be an object');
    } else {
      const weatherValidation = validateDreamWeather(saveGame.payload.dreamWeather);
      if (!weatherValidation.valid) {
        errors.push(...prefixNestedErrors(weatherValidation.errors, 'payload.dreamWeather', 'dreamWeather'));
      }
    }
  }
  if (saveGame.payload.weatherTrace !== undefined) {
    if (!isObject(saveGame.payload.weatherTrace)) {
      errors.push('payload.weatherTrace must be an object');
    } else {
      const traceValidation = validateWeatherTrace(saveGame.payload.weatherTrace);
      if (!traceValidation.valid) {
        errors.push(...prefixNestedErrors(traceValidation.errors, 'payload.weatherTrace', 'weatherTrace'));
      }
    }
  }
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.trace,
    'payload.trace',
    validateTrace
  ));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function normalizeDirective(response) {
  return {
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: normalizeNumberMap(response?.dreamWeightDeltas, {
      min: -0.95,
      max: 2
    }),
    symbolEchoes: normalizeStringList(response?.symbolEchoes),
    maskPressure: normalizeNumberMap(response?.maskPressure, {
      min: -1,
      max: 1
    }),
    pacingDelta: normalizeNumberMap(response?.pacingDelta, {
      min: -1,
      max: 1,
      allowedKeys: ['intensity', 'repetition', 'silence']
    })
  };
}

export function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function validateOptionalNestedContract(value, label, validator) {
  if (value === undefined || value === null) {
    return [];
  }
  const validation = validator(value);
  return validation.valid ? [] : validation.errors.map((error) => `${label}.${error}`);
}

function prefixNestedErrors(errors, label, nestedLabel) {
  return errors.map((error) => {
    const prefix = `${nestedLabel}.`;
    return error.startsWith(prefix)
      ? `${label}.${error.slice(prefix.length)}`
      : `${label}.${error}`;
  });
}

function validateMemoryMap(map, label) {
  const errors = [];
  if (!isObject(map)) {
    return [`${label} must be an object`];
  }
  for (const [key, value] of Object.entries(map)) {
    if (!isObject(value)) {
      errors.push(`${label}.${key} must be an object`);
      continue;
    }
    if (!Number.isInteger(value.count) || value.count < 1) {
      errors.push(`${label}.${key}.count must be a positive integer`);
    }
    if (!Number.isFinite(value.weight)) {
      errors.push(`${label}.${key}.weight must be a finite number`);
    }
    if (!isNullableString(value.lastSeenAt)) {
      errors.push(`${label}.${key}.lastSeenAt must be a string or null`);
    }
  }
  return errors;
}

function validateStringList(value, label) {
  const errors = [];
  if (!Array.isArray(value)) {
    return [`${label} must be an array`];
  }
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${label}[${index}] must be a non-empty string`);
    }
  });
  return errors;
}

function validateWeatherTagList(value, label) {
  const errors = validateStringList(value, label);
  if (!Array.isArray(value)) {
    return errors;
  }
  value.forEach((item, index) => {
    if (isNonEmptyString(item) && !ALLOWED_WEATHER_TAGS.has(item)) {
      errors.push(`${label}[${index}] must be an allowed weather tag`);
    }
  });
  return errors;
}

function validateQueueProcessEntry(entry, label) {
  const errors = [];
  const statuses = ['no_provider', 'provider_empty', 'provider_error', 'directive_ready'];

  if (!isNonEmptyString(entry?.id)) {
    errors.push(`${label}.id is required`);
  }
  if (!statuses.includes(entry?.status)) {
    errors.push(`${label}.status must be one of ${statuses.join(', ')}`);
  }
  if (!Array.isArray(entry?.errors)) {
    errors.push(`${label}.errors must be an array`);
  } else {
    entry.errors.forEach((error, index) => {
      if (typeof error !== 'string') {
        errors.push(`${label}.errors[${index}] must be a string`);
      }
    });
  }

  if (entry?.status === 'directive_ready' && entry?.directive === undefined) {
    errors.push(`${label}.directive is required when status is directive_ready`);
  }
  if (entry?.status === 'provider_error' && Array.isArray(entry?.errors) && entry.errors.length === 0) {
    errors.push(`${label}.errors must include provider error details`);
  }

  if (entry?.directive !== undefined) {
    const directiveValidation = validateDirective(entry.directive);
    if (!directiveValidation.valid) {
      errors.push(...directiveValidation.errors.map((error) => `${label}.directive.${error}`));
    }
  }
  if (entry?.directiveUpdate !== undefined && entry.directiveUpdate !== null && !isObject(entry.directiveUpdate)) {
    errors.push(`${label}.directiveUpdate must be an object or null`);
  }
  errors.push(...validateProviderJob(entry?.providerJob, `${label}.providerJob`));

  return errors;
}

function validateQueueEntry(entry, label, expectedStatus) {
  const errors = [];

  if (!isNonEmptyString(entry?.id)) {
    errors.push(`${label}.id is required`);
  }
  if (entry?.status !== expectedStatus) {
    errors.push(`${label}.status must be ${expectedStatus}`);
  }
  if (!isNonEmptyString(entry?.reason)) {
    errors.push(`${label}.reason is required`);
  }
  if (!Number.isInteger(entry?.attempts) || entry.attempts < 1) {
    errors.push(`${label}.attempts must be a positive integer`);
  }
  if (!isNullableString(entry?.createdAt)) {
    errors.push(`${label}.createdAt must be a string or null`);
  }
  if (!isNullableString(entry?.updatedAt)) {
    errors.push(`${label}.updatedAt must be a string or null`);
  }

  const requestValidation = validateGniProcessingRequest(entry?.request);
  if (!requestValidation.valid) {
    errors.push(...requestValidation.errors.map((error) => `${label}.request.${error}`));
  }
  errors.push(...validateProviderJob(entry?.providerJob, `${label}.providerJob`));

  if (expectedStatus === 'resolved') {
    if (!isNullableString(entry?.resolvedAt)) {
      errors.push(`${label}.resolvedAt must be a string or null`);
    }
    const directiveValidation = validateDirective(entry?.directive);
    if (!directiveValidation.valid) {
      errors.push(...directiveValidation.errors.map((error) => `${label}.directive.${error}`));
    }
  }

  return errors;
}

function validateProviderJob(providerJob, label) {
  const errors = [];
  if (providerJob === undefined || providerJob === null) {
    return errors;
  }
  if (!isObject(providerJob)) {
    return [`${label} must be an object or null`];
  }
  if (!isNonEmptyString(providerJob.id)) {
    errors.push(`${label}.id is required`);
  }
  if (providerJob.statusUrl !== undefined && typeof providerJob.statusUrl !== 'string') {
    errors.push(`${label}.statusUrl must be a string`);
  }
  if (
    providerJob.pollAfterMs !== undefined
    && (!Number.isInteger(providerJob.pollAfterMs) || providerJob.pollAfterMs < 0)
  ) {
    errors.push(`${label}.pollAfterMs must be a non-negative integer`);
  }
  return errors;
}

function validateOptionalNumberMap(input, label, { min, max, allowedKeys = null }) {
  const errors = [];
  if (input === undefined) {
    return errors;
  }
  if (!isObject(input)) {
    return [`${label} must be an object`];
  }
  for (const [key, value] of Object.entries(input)) {
    if (allowedKeys && !allowedKeys.includes(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
    if (!Number.isFinite(value)) {
      errors.push(`${label}.${key} must be a finite number`);
    } else if (value < min || value > max) {
      errors.push(`${label}.${key} must be between ${min} and ${max}`);
    }
  }
  return errors;
}

function validateNumberBetween(value, label, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    return [`${label} must be between ${min} and ${max}`];
  }
  return [];
}

function validateKnownKeys(input, allowedKeys, label) {
  if (!isObject(input)) {
    return [];
  }
  return Object.keys(input)
    .filter((key) => !allowedKeys.includes(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function normalizeNumberMap(input, { min, max, allowedKeys = null }) {
  if (!isObject(input)) {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(input)) {
    if (allowedKeys && !allowedKeys.includes(key)) {
      continue;
    }
    if (!Number.isFinite(value)) {
      continue;
    }
    normalized[key] = round(clampNumber(value, min, max));
  }
  return normalized;
}

function normalizeStringList(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function round(value) {
  return Number(value.toFixed(3));
}
