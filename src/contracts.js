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
const SESSION_ARC_PHASES = Object.freeze(['opening', 'deepening', 'distorting', 'mirroring', 'softening', 'returning']);
const SESSION_ARC_DECISIONS = Object.freeze(['deepen', 'distort', 'mirror', 'soften', 'return']);
const SESSION_ARC_ROLES = Object.freeze(['entry', 'pressure', 'mirror', 'return']);
const DREAM_SESSION_END_REASONS = Object.freeze(['max_beats', 'checkpoint', 'return_anchor', 'return_available']);
const RUNTIME_READINESS_STATUSES = Object.freeze(['ready', 'degraded', 'blocked']);
const RUNTIME_READINESS_SEVERITIES = Object.freeze(['required', 'optional']);
const RUNTIME_READINESS_CAPABILITIES = Object.freeze([
  'thresholdChamber',
  'firstListening',
  'dreamSession',
  'dreamSessionCheckpoint',
  'dreamWeather',
  'experienceDirector',
  'sessionFrame',
  'sessionContentGate',
  'sessionContentReplacement',
  'saveResume',
  'asyncGniQueue',
  'gniFirebreak'
]);
const SESSION_SHAPE_IDS = Object.freeze(['quiet_lantern', 'strange_threshold', 'dark_mirror', 'nightmare_veil']);
const SESSION_SHAPE_INTENSITY_BANDS = Object.freeze(['gentle', 'strange', 'dark', 'horrific']);
const DREAM_JOURNEY_WEIGHT_KEYS = Object.freeze([
  'base',
  'archetype',
  'vibe',
  'room',
  'portal',
  'directorMultiplier',
  'total',
  'roll'
]);

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

export function validateThresholdPresentation(presentation) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'room',
    'note',
    'heartlight',
    'portal',
    'toolSigils',
    'forms',
    'atmosphere',
    'dreamAtmosphere'
  ];

  if (presentation?.schema !== 'ThresholdPresentationV1') {
    errors.push('schema must be ThresholdPresentationV1');
  }
  errors.push(...validateKnownKeys(presentation, allowedKeys, 'thresholdPresentation'));
  for (const key of ['room', 'note', 'heartlight', 'portal', 'toolSigils', 'atmosphere']) {
    if (!isObject(presentation?.[key])) {
      errors.push(`${key} must be an object`);
    }
  }
  if (!Array.isArray(presentation?.forms)) {
    errors.push('forms must be an array');
  }
  const dreamAtmosphereValidation = validateDreamAtmospherePresentation(presentation?.dreamAtmosphere);
  if (!dreamAtmosphereValidation.valid) {
    errors.push(...prefixNestedErrors(
      dreamAtmosphereValidation.errors,
      'dreamAtmosphere',
      'dreamAtmosphere'
    ));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionFrame(frame) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'frameId',
    'frameIndex',
    'frameKind',
    'presentation',
    'experienceDirective',
    'comfort',
    'rendererHints',
    'debug',
    'playerFacingText'
  ];
  const frameKinds = ['threshold_silent', 'threshold_awake', 'threshold_portal', 'dream', 'return'];

  if (frame?.schema !== 'SessionFrameV1') {
    errors.push('schema must be SessionFrameV1');
  }
  if (frame?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(frame, allowedKeys, 'sessionFrame'));
  if (!isNonEmptyString(frame?.frameId)) {
    errors.push('frameId is required');
  }
  if (!isNonNegativeInteger(frame?.frameIndex)) {
    errors.push('frameIndex must be a non-negative integer');
  }
  if (!frameKinds.includes(frame?.frameKind)) {
    errors.push('frameKind is unsupported');
  }
  const presentationValidation = validateThresholdPresentation(frame?.presentation);
  if (!presentationValidation.valid) {
    errors.push(...prefixNestedErrors(presentationValidation.errors, 'presentation', 'thresholdPresentation'));
  }
  const directiveValidation = validateExperienceDirective(frame?.experienceDirective);
  if (!directiveValidation.valid) {
    errors.push(...prefixNestedErrors(directiveValidation.errors, 'experienceDirective', 'experienceDirective'));
  }
  errors.push(...validateSessionFrameComfort(frame?.comfort));
  errors.push(...validateSessionFrameRendererHints(frame?.rendererHints));
  errors.push(...validateSessionFrameDebug(frame?.debug));
  if (frame?.playerFacingText !== null) {
    errors.push('playerFacingText must be null');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateRuntimeReadiness(report) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'status',
    'canStartSession',
    'blockedCount',
    'degradedCount',
    'platformTargets',
    'capabilities',
    'contracts',
    'checks',
    'playerFacingText'
  ];

  if (report?.schema !== 'RuntimeReadinessV1') {
    errors.push('schema must be RuntimeReadinessV1');
  }
  if (report?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(report, allowedKeys, 'runtimeReadiness'));
  if (!RUNTIME_READINESS_STATUSES.includes(report?.status)) {
    errors.push(`status must be one of ${RUNTIME_READINESS_STATUSES.join(', ')}`);
  }
  if (typeof report?.canStartSession !== 'boolean') {
    errors.push('canStartSession must be a boolean');
  }
  if (!isNonNegativeInteger(report?.blockedCount)) {
    errors.push('blockedCount must be a non-negative integer');
  }
  if (!isNonNegativeInteger(report?.degradedCount)) {
    errors.push('degradedCount must be a non-negative integer');
  }
  errors.push(...validateStringList(report?.platformTargets, 'platformTargets'));
  errors.push(...validateStringList(report?.contracts, 'contracts'));
  errors.push(...validateRuntimeReadinessCapabilities(report?.capabilities));
  if (!Array.isArray(report?.checks)) {
    errors.push('checks must be an array');
  } else {
    report.checks.forEach((check, index) => {
      errors.push(...validateRuntimeReadinessCheck(check, `checks[${index}]`));
    });
  }
  if (report?.playerFacingText !== null) {
    errors.push('playerFacingText must be null');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamAtmospherePresentation(dreamAtmosphere) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'weatherId',
    'mood',
    'pressure',
    'weatherTags',
    'lighting',
    'fog',
    'audio',
    'haptics',
    'movement',
    'comfort'
  ];

  if (!isObject(dreamAtmosphere)) {
    return {
      valid: false,
      errors: ['dreamAtmosphere must be an object']
    };
  }
  if (dreamAtmosphere.schema !== 'DreamAtmospherePresentationV1') {
    errors.push('schema must be DreamAtmospherePresentationV1');
  }
  if (dreamAtmosphere.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(dreamAtmosphere, allowedKeys, 'dreamAtmosphere'));
  if (!(dreamAtmosphere.weatherId === null || isNonEmptyString(dreamAtmosphere.weatherId))) {
    errors.push('weatherId must be a non-empty string or null');
  }
  if (!DREAM_WEATHER_MOODS.includes(dreamAtmosphere.mood)) {
    errors.push(`mood must be one of ${DREAM_WEATHER_MOODS.join(', ')}`);
  }
  if (!DREAM_WEATHER_PRESSURES.includes(dreamAtmosphere.pressure)) {
    errors.push(`pressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  errors.push(...validateWeatherTagList(dreamAtmosphere.weatherTags, 'weatherTags'));
  errors.push(...validatePresentationNumberMap(dreamAtmosphere.lighting, 'lighting'));
  errors.push(...validatePresentationNumberMap(dreamAtmosphere.fog, 'fog'));
  errors.push(...validatePresentationNumberMap(dreamAtmosphere.audio, 'audio'));
  errors.push(...validatePresentationHaptics(dreamAtmosphere.haptics));
  errors.push(...validatePresentationNumberMap(dreamAtmosphere.movement, 'movement'));
  errors.push(...validatePresentationComfort(dreamAtmosphere.comfort));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamerMemoryContext(context) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'profileId',
    'slotId',
    'saveMode',
    'sessionCount',
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
    'familiarDreadAxes',
    'lastSessionDigest'
  ];
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
    'vibeEchoes'
  ];

  if (context?.schema !== 'DreamerMemoryContextV1') {
    errors.push('schema must be DreamerMemoryContextV1');
  }
  if (context?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(context, allowedKeys, 'dreamerMemoryContext'));
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
  for (const key of ['familiarWeatherTags', 'familiarDreadAxes']) {
    if (context?.[key] !== undefined) {
      if (key === 'familiarWeatherTags') {
        errors.push(...validateWeatherTagList(context[key], key));
      } else {
        errors.push(...validateDreadAxisList(context[key], key));
      }
    }
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
    if (profile.memory.weatherTags !== undefined) {
      errors.push(...validateMemoryMap(profile.memory.weatherTags, 'memory.weatherTags'));
      errors.push(...validateKnownKeys(profile.memory.weatherTags, [...ALLOWED_WEATHER_TAGS], 'memory.weatherTags'));
    }
    if (profile.memory.dreadAxes !== undefined) {
      errors.push(...validateMemoryMap(profile.memory.dreadAxes, 'memory.dreadAxes'));
      errors.push(...validateKnownKeys(profile.memory.dreadAxes, DREAD_BUDGET_AXES, 'memory.dreadAxes'));
    }
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

export function validateSessionShapeSelection(selection) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'shapeId',
    'source',
    'intensityBand',
    'shapeTags',
    'covenant',
    'playerFacingText'
  ];

  if (selection?.schema !== 'SessionShapeSelectionV1') {
    errors.push('schema must be SessionShapeSelectionV1');
  }
  if (selection?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(selection, allowedKeys, 'sessionShapeSelection'));
  if (!SESSION_SHAPE_IDS.includes(selection?.shapeId)) {
    errors.push(`shapeId must be one of ${SESSION_SHAPE_IDS.join(', ')}`);
  }
  if (!['preset', 'fallback'].includes(selection?.source)) {
    errors.push('source must be preset or fallback');
  }
  if (!SESSION_SHAPE_INTENSITY_BANDS.includes(selection?.intensityBand)) {
    errors.push(`intensityBand must be one of ${SESSION_SHAPE_INTENSITY_BANDS.join(', ')}`);
  }
  errors.push(...validateStringList(selection?.shapeTags, 'shapeTags'));
  const covenantValidation = validateSessionCovenant(selection?.covenant);
  if (!covenantValidation.valid) {
    errors.push(...prefixNestedErrors(covenantValidation.errors, 'covenant', 'covenant'));
  }
  if (selection?.playerFacingText !== null) {
    errors.push('playerFacingText must be null');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionContentGate(gate) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'gateId',
    'allowed',
    'sessionShapeId',
    'intensityCeiling',
    'checked',
    'suppressedTags',
    'warnings',
    'blockedReasons',
    'replacementHints',
    'playerFacingText'
  ];

  if (gate?.schema !== 'SessionContentGateV1') {
    errors.push('schema must be SessionContentGateV1');
  }
  if (gate?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(gate, allowedKeys, 'sessionContentGate'));
  if (!isNonEmptyString(gate?.gateId)) {
    errors.push('gateId is required');
  }
  if (typeof gate?.allowed !== 'boolean') {
    errors.push('allowed must be a boolean');
  }
  if (!isNullableString(gate?.sessionShapeId)) {
    errors.push('sessionShapeId must be a string or null');
  } else if (typeof gate.sessionShapeId === 'string' && !SESSION_SHAPE_IDS.includes(gate.sessionShapeId)) {
    errors.push(`sessionShapeId must be one of ${SESSION_SHAPE_IDS.join(', ')} or null`);
  }
  errors.push(...validateNumberBetween(gate?.intensityCeiling, 'intensityCeiling', 0, 1));
  errors.push(...validateSessionContentGateChecked(gate?.checked));
  errors.push(...validateStringList(gate?.suppressedTags, 'suppressedTags'));
  errors.push(...validateStringList(gate?.warnings, 'warnings'));
  errors.push(...validateStringList(gate?.blockedReasons, 'blockedReasons'));
  errors.push(...validateSessionContentGateReplacementHints(gate?.replacementHints));
  if (gate?.playerFacingText !== null) {
    errors.push('playerFacingText must be null');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionContentReplacementPlan(plan) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'planId',
    'sourceGateId',
    'status',
    'avoidTags',
    'blockedReasons',
    'replacementHints',
    'replacement',
    'routes',
    'playerFacingText'
  ];

  if (plan?.schema !== 'SessionContentReplacementPlanV1') {
    errors.push('schema must be SessionContentReplacementPlanV1');
  }
  if (plan?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(plan, allowedKeys, 'sessionContentReplacementPlan'));
  if (!isNonEmptyString(plan?.planId)) {
    errors.push('planId is required');
  }
  if (!isNullableString(plan?.sourceGateId)) {
    errors.push('sourceGateId must be a string or null');
  }
  if (!['not_needed', 'replacement_required'].includes(plan?.status)) {
    errors.push('status must be not_needed or replacement_required');
  }
  errors.push(...validateStringList(plan?.avoidTags, 'avoidTags'));
  errors.push(...validateStringList(plan?.blockedReasons, 'blockedReasons'));
  errors.push(...validateSessionContentGateReplacementHints(plan?.replacementHints));
  errors.push(...validateSessionContentReplacement(plan?.replacement));
  errors.push(...validateSessionContentReplacementRoutes(plan?.routes));
  if (plan?.playerFacingText !== null) {
    errors.push('playerFacingText must be null');
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

export function validateListeningBeat(beat, label = 'listeningBeat') {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'beatId',
    'symbolicObjectId',
    'responseKind',
    'gestureTags',
    'motifTags',
    'pressureAccepted',
    'boundarySignals'
  ];

  if (beat?.schema !== 'ListeningBeatV1') {
    errors.push(`${label === 'listeningBeat' ? 'schema' : `${label}.schema`} must be ListeningBeatV1`);
  }
  if (beat?.schemaVersion !== 1) {
    errors.push(`${label === 'listeningBeat' ? 'schemaVersion' : `${label}.schemaVersion`} must be 1`);
  }
  errors.push(...validateKnownKeys(beat, allowedKeys, label));
  if (!isNonEmptyString(beat?.beatId)) {
    errors.push(`${label === 'listeningBeat' ? 'beatId' : `${label}.beatId`} is required`);
  }
  if (!isNonEmptyString(beat?.symbolicObjectId)) {
    errors.push(`${label === 'listeningBeat' ? 'symbolicObjectId' : `${label}.symbolicObjectId`} is required`);
  }
  if (!isNonEmptyString(beat?.responseKind)) {
    errors.push(`${label === 'listeningBeat' ? 'responseKind' : `${label}.responseKind`} is required`);
  }
  for (const key of ['gestureTags', 'motifTags', 'boundarySignals']) {
    errors.push(...validateStringList(beat?.[key], label === 'listeningBeat' ? key : `${label}.${key}`));
  }
  errors.push(...validateNumberBetween(
    beat?.pressureAccepted,
    label === 'listeningBeat' ? 'pressureAccepted' : `${label}.pressureAccepted`,
    0,
    1
  ));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateFirstListeningRun(run) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'seed',
    'beats',
    'derivedToneTags',
    'intensityHint',
    'returnAnchorHint',
    'redactedSummary'
  ];

  if (run?.schema !== 'FirstListeningRunV1') {
    errors.push('schema must be FirstListeningRunV1');
  }
  if (run?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(run, allowedKeys, 'firstListeningRun'));
  if (!Number.isFinite(run?.seed)) {
    errors.push('seed must be a number');
  }
  if (!Array.isArray(run?.beats)) {
    errors.push('beats must be an array');
  } else {
    run.beats.forEach((beat, index) => {
      const beatValidation = validateListeningBeat(beat, `beats[${index}]`);
      if (!beatValidation.valid) {
        errors.push(...beatValidation.errors);
      }
    });
  }
  errors.push(...validateStringList(run?.derivedToneTags, 'derivedToneTags'));
  errors.push(...validateNumberBetween(run?.intensityHint, 'intensityHint', 0, 1));
  if (!isObject(run?.returnAnchorHint)) {
    errors.push('returnAnchorHint must be an object');
  } else {
    if (!isNonEmptyString(run.returnAnchorHint.kind)) {
      errors.push('returnAnchorHint.kind is required');
    }
    if (!isNonEmptyString(run.returnAnchorHint.value)) {
      errors.push('returnAnchorHint.value is required');
    }
    errors.push(...validateKnownKeys(run.returnAnchorHint, ['kind', 'value'], 'returnAnchorHint'));
  }
  if (!isNonEmptyString(run?.redactedSummary)) {
    errors.push('redactedSummary is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateExperienceDirective(directive) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'directiveId',
    'seed',
    'nextMove',
    'suggestedRole',
    'pressureTarget',
    'returnReadiness',
    'toneTags',
    'weatherTagBias',
    'dreamWeightOverrides',
    'pacingBias',
    'maskPressure',
    'returnAnchorKind',
    'returnAnchorValue',
    'reasonCodes'
  ];

  if (directive?.schema !== 'ExperienceDirectiveV1') {
    errors.push('schema must be ExperienceDirectiveV1');
  }
  if (directive?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(directive, allowedKeys, 'experienceDirective'));
  if (!isNonEmptyString(directive?.directiveId)) {
    errors.push('directiveId is required');
  }
  if (!Number.isFinite(directive?.seed)) {
    errors.push('seed must be a number');
  }
  if (!SESSION_ARC_DECISIONS.includes(directive?.nextMove)) {
    errors.push(`nextMove must be one of ${SESSION_ARC_DECISIONS.join(', ')}`);
  }
  if (!SESSION_ARC_ROLES.includes(directive?.suggestedRole)) {
    errors.push(`suggestedRole must be one of ${SESSION_ARC_ROLES.join(', ')}`);
  }
  errors.push(...validateNumberBetween(directive?.pressureTarget, 'pressureTarget', 0, 1));
  errors.push(...validateNumberBetween(directive?.returnReadiness, 'returnReadiness', 0, 1));
  errors.push(...validateStringList(directive?.toneTags, 'toneTags'));
  errors.push(...validateWeatherTagList(directive?.weatherTagBias, 'weatherTagBias'));
  errors.push(...validateOptionalNumberMap(directive?.dreamWeightOverrides, 'dreamWeightOverrides', {
    min: 0.05,
    max: 3
  }));
  errors.push(...validateOptionalNumberMap(directive?.pacingBias, 'pacingBias', {
    min: -1,
    max: 1,
    allowedKeys: ['intensity', 'repetition', 'silence']
  }));
  for (const key of ['intensity', 'repetition', 'silence']) {
    if (!Number.isFinite(directive?.pacingBias?.[key])) {
      errors.push(`pacingBias.${key} must be a finite number`);
    }
  }
  errors.push(...validateOptionalNumberMap(directive?.maskPressure, 'maskPressure', {
    min: -1,
    max: 1
  }));
  if (!isNonEmptyString(directive?.returnAnchorKind)) {
    errors.push('returnAnchorKind is required');
  }
  if (!isNonEmptyString(directive?.returnAnchorValue)) {
    errors.push('returnAnchorValue is required');
  }
  errors.push(...validateStringList(directive?.reasonCodes, 'reasonCodes'));

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

export function validateGniFirebreakTrace(trace) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'source',
    'changed',
    'ceiling',
    'boundaryTags',
    'suppressedCounts',
    'clampCounts'
  ];

  if (trace?.schema !== 'GniFirebreakTraceV1') {
    errors.push('schema must be GniFirebreakTraceV1');
  }
  if (trace?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(trace, allowedKeys, 'firebreakTrace'));
  if (!['provided', 'provider', 'emulator', 'queue'].includes(trace?.source)) {
    errors.push('source must be provided, provider, emulator, or queue');
  }
  if (typeof trace?.changed !== 'boolean') {
    errors.push('changed must be a boolean');
  }
  errors.push(...validateNumberBetween(trace?.ceiling, 'ceiling', 0, 2));
  errors.push(...validateStringList(trace?.boundaryTags, 'boundaryTags'));
  errors.push(...validateCountMap(trace?.suppressedCounts, 'suppressedCounts', [
    'fields',
    'dreamWeightDeltas',
    'symbolEchoes',
    'maskPressure',
    'pacingDelta'
  ]));
  errors.push(...validateCountMap(trace?.clampCounts, 'clampCounts', [
    'dreamWeightDeltas',
    'maskPressure',
    'pacingDelta'
  ]));

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
  if (result?.firebreakTrace !== undefined && result.firebreakTrace !== null) {
    const firebreakValidation = validateGniFirebreakTrace(result.firebreakTrace);
    if (!firebreakValidation.valid) {
      errors.push(...firebreakValidation.errors.map((error) => `firebreakTrace.${error}`));
    }
  }
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

export function validateTraceSummary(summary) {
  const errors = [];

  if (summary?.schema !== 'JungialTraceSummaryV1') {
    errors.push('schema must be JungialTraceSummaryV1');
  }
  if (!isNonEmptyString(summary?.runId)) {
    errors.push('runId is required');
  }
  if (!isObject(summary?.eventCounts)) {
    errors.push('eventCounts must be an object');
  } else {
    for (const [key, value] of Object.entries(summary.eventCounts)) {
      if (!isNonNegativeInteger(value)) {
        errors.push(`eventCounts.${key} must be a non-negative integer`);
      }
    }
  }
  if (!isNullableString(summary?.journeySummary)) {
    errors.push('journeySummary must be a string or null');
  }
  errors.push(...validateStringList(summary?.symbolTrail, 'symbolTrail'));
  for (const key of ['gniRequestCount', 'gniQueuedRequestCount', 'gniDirectiveCount']) {
    if (!isNonNegativeInteger(summary?.[key])) {
      errors.push(`${key} must be a non-negative integer`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateFixtureManifest(manifest) {
  const errors = [];

  if (manifest?.schema !== 'JungialContractFixtureManifestV1') {
    errors.push('schema must be JungialContractFixtureManifestV1');
  }
  if (!Number.isFinite(manifest?.seed)) {
    errors.push('seed must be a number');
  }
  if (!isNonEmptyString(manifest?.clockStartIso)) {
    errors.push('clockStartIso is required');
  }
  errors.push(...validateStringList(manifest?.files, 'files'));
  if (!/^[a-f0-9]{64}$/.test(manifest?.hash ?? '')) {
    errors.push('hash must be a 64-character lowercase hex string');
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

export function validateSaveSlotPlan(plan) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'slotId',
    'mode',
    'incarnationIndex',
    'runSeed',
    'crossSaveEchoes',
    'sourceProfileId',
    'profile',
    'dreamerMemoryContext'
  ];

  if (plan?.schema !== 'SaveSlotPlanV1') {
    errors.push('schema must be SaveSlotPlanV1');
  }
  if (plan?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(plan, allowedKeys, 'saveSlot'));
  if (!isNonEmptyString(plan?.slotId)) {
    errors.push('slotId is required');
  }
  if (!['fresh', 'continue', 'new_incarnation'].includes(plan?.mode)) {
    errors.push('mode must be fresh, continue, or new_incarnation');
  }
  if (!isNonNegativeInteger(plan?.incarnationIndex)) {
    errors.push('incarnationIndex must be a non-negative integer');
  }
  if (!isNonNegativeInteger(plan?.runSeed)) {
    errors.push('runSeed must be a non-negative integer');
  }
  if (typeof plan?.crossSaveEchoes !== 'boolean') {
    errors.push('crossSaveEchoes must be a boolean');
  }
  if (!isNullableString(plan?.sourceProfileId)) {
    errors.push('sourceProfileId must be a string or null');
  }
  if (!isObject(plan?.profile)) {
    errors.push('profile must be an object');
  } else {
    const profileValidation = validateDreamerProfile(plan.profile);
    if (!profileValidation.valid) {
      errors.push(...profileValidation.errors.map((error) => `profile.${error}`));
    }
  }
  if (!isObject(plan?.dreamerMemoryContext)) {
    errors.push('dreamerMemoryContext must be an object');
  } else {
    const memoryValidation = validateDreamerMemoryContext(plan.dreamerMemoryContext);
    if (!memoryValidation.valid) {
      errors.push(...memoryValidation.errors.map((error) => `dreamerMemoryContext.${error}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionArc(arc) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'phase',
    'beatCount',
    'pressure',
    'returnReadiness',
    'continuationSeed',
    'recentBeatRoles',
    'boundarySignalCount',
    'lastDecision',
    'weightOverrides'
  ];

  if (arc?.schema !== 'SessionArcV1') {
    errors.push('schema must be SessionArcV1');
  }
  if (arc?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(arc, allowedKeys, 'sessionArc'));
  if (!SESSION_ARC_PHASES.includes(arc?.phase)) {
    errors.push('phase is unsupported');
  }
  if (!isNonNegativeInteger(arc?.beatCount)) {
    errors.push('beatCount must be a non-negative integer');
  }
  errors.push(...validateNumberBetween(arc?.pressure, 'pressure', 0, 1));
  errors.push(...validateNumberBetween(arc?.returnReadiness, 'returnReadiness', 0, 1));
  if (!isNonNegativeInteger(arc?.continuationSeed)) {
    errors.push('continuationSeed must be a non-negative integer');
  }
  errors.push(...validateArcRoleList(arc?.recentBeatRoles, 'recentBeatRoles'));
  if (!isNonNegativeInteger(arc?.boundarySignalCount)) {
    errors.push('boundarySignalCount must be a non-negative integer');
  }
  if (!SESSION_ARC_DECISIONS.includes(arc?.lastDecision)) {
    errors.push('lastDecision is unsupported');
  }
  errors.push(...validateOptionalNumberMap(arc?.weightOverrides, 'weightOverrides', { min: 0.05, max: 3 }));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSessionArcDirective(directive) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'decision',
    'suggestedRole',
    'pressureDelta',
    'returnAvailable',
    'weightOverrides'
  ];

  if (directive?.schema !== 'SessionArcDirectiveV1') {
    errors.push('schema must be SessionArcDirectiveV1');
  }
  if (directive?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(directive, allowedKeys, 'arcDirective'));
  if (!SESSION_ARC_DECISIONS.includes(directive?.decision)) {
    errors.push('decision is unsupported');
  }
  if (!SESSION_ARC_ROLES.includes(directive?.suggestedRole)) {
    errors.push('suggestedRole must be entry, pressure, mirror, or return');
  }
  errors.push(...validateNumberBetween(directive?.pressureDelta, 'pressureDelta', -1, 1));
  if (typeof directive?.returnAvailable !== 'boolean') {
    errors.push('returnAvailable must be a boolean');
  }
  errors.push(...validateOptionalNumberMap(directive?.weightOverrides, 'weightOverrides', { min: 0.05, max: 3 }));

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamSession(session) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'sessionId',
    'seed',
    'maxBeats',
    'completedBeats',
    'endedBecause',
    'beats',
    'finalSessionArc',
    'recentEchoTraces',
    'dreamflowState',
    'finalDreamWeather',
    'finalSelectedDream'
  ];

  if (session?.schema !== 'DreamSessionV1') {
    errors.push('schema must be DreamSessionV1');
  }
  if (session?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(session, allowedKeys, 'dreamSession'));
  if (!isNonEmptyString(session?.sessionId)) {
    errors.push('sessionId is required');
  }
  if (!(typeof session?.seed === 'string' || Number.isFinite(session?.seed))) {
    errors.push('seed must be a string or number');
  }
  if (!Number.isInteger(session?.maxBeats) || session.maxBeats < 1 || session.maxBeats > 24) {
    errors.push('maxBeats must be an integer between 1 and 24');
  }
  if (!isNonNegativeInteger(session?.completedBeats)) {
    errors.push('completedBeats must be a non-negative integer');
  } else if (Number.isInteger(session?.maxBeats) && session.completedBeats > session.maxBeats) {
    errors.push('completedBeats cannot exceed maxBeats');
  }
  if (!DREAM_SESSION_END_REASONS.includes(session?.endedBecause)) {
    errors.push('endedBecause is unsupported');
  }
  if (!Array.isArray(session?.beats)) {
    errors.push('beats must be an array');
  } else {
    if (isNonNegativeInteger(session?.completedBeats) && session.completedBeats !== session.beats.length) {
      errors.push('completedBeats must equal beats length');
    }
    session.beats.forEach((beat, index) => {
      const beatValidation = validateDreamSessionBeat(beat, index);
      if (!beatValidation.valid) {
        errors.push(...beatValidation.errors);
      }
    });
  }

  if (!isObject(session?.finalSessionArc)) {
    errors.push('finalSessionArc must be an object');
  } else {
    errors.push(...validateOptionalNestedContract(
      session.finalSessionArc,
      'finalSessionArc',
      validateSessionArc
    ));
  }
  if (!Array.isArray(session?.recentEchoTraces)) {
    errors.push('recentEchoTraces must be an array');
  } else {
    session.recentEchoTraces.forEach((trace, index) => {
      const traceValidation = validateEchoTrace(trace);
      if (!traceValidation.valid) {
        errors.push(...prefixNestedErrors(traceValidation.errors, `recentEchoTraces[${index}]`, 'echoTrace'));
      }
    });
  }
  if (!isObject(session?.dreamflowState)) {
    errors.push('dreamflowState must be an object');
  } else {
    const flowValidation = validateDreamflowRuntimeState(session.dreamflowState);
    if (!flowValidation.valid) {
      errors.push(...flowValidation.errors);
    }
  }
  if (!hasOwn(session, 'finalDreamWeather')) {
    errors.push('finalDreamWeather is required');
  } else if (session?.finalDreamWeather !== null) {
    errors.push(...validateOptionalNestedContract(
      session.finalDreamWeather,
      'finalDreamWeather',
      validateDreamWeather
    ));
  }
  if (!hasOwn(session, 'finalSelectedDream')) {
    errors.push('finalSelectedDream is required');
  } else if (session?.finalSelectedDream !== null) {
    const selectedValidation = validateSelectedDream(session.finalSelectedDream, 'finalSelectedDream');
    if (!selectedValidation.valid) {
      errors.push(...selectedValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamSessionCheckpoint(checkpoint) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'sessionId',
    'seed',
    'maxBeats',
    'completedBeats',
    'nextBeatIndex',
    'endedBecause',
    'isComplete',
    'beats',
    'finalSessionArc',
    'recentEchoTraces',
    'dreamflowState',
    'finalDreamWeather',
    'finalSelectedDream'
  ];

  if (checkpoint?.schema !== 'DreamSessionCheckpointV1') {
    errors.push('schema must be DreamSessionCheckpointV1');
  }
  if (checkpoint?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(checkpoint, allowedKeys, 'dreamSessionCheckpoint'));
  if (!isNonEmptyString(checkpoint?.sessionId)) {
    errors.push('sessionId is required');
  }
  if (!(typeof checkpoint?.seed === 'string' || Number.isFinite(checkpoint?.seed))) {
    errors.push('seed must be a string or number');
  }
  if (!Number.isInteger(checkpoint?.maxBeats) || checkpoint.maxBeats < 1 || checkpoint.maxBeats > 24) {
    errors.push('maxBeats must be an integer between 1 and 24');
  }
  if (!isNonNegativeInteger(checkpoint?.completedBeats)) {
    errors.push('completedBeats must be a non-negative integer');
  }
  if (checkpoint?.nextBeatIndex !== (checkpoint?.completedBeats ?? -2) + 1) {
    errors.push('nextBeatIndex must be completedBeats + 1');
  }
  if (!DREAM_SESSION_END_REASONS.includes(checkpoint?.endedBecause)) {
    errors.push('endedBecause is unsupported');
  }
  if (typeof checkpoint?.isComplete !== 'boolean') {
    errors.push('isComplete must be a boolean');
  }
  if (typeof checkpoint?.isComplete === 'boolean' && DREAM_SESSION_END_REASONS.includes(checkpoint?.endedBecause)) {
    const expectedComplete = checkpoint.endedBecause !== 'checkpoint';
    if (checkpoint.isComplete !== expectedComplete) {
      errors.push('isComplete must match endedBecause');
    }
  }
  if (!Array.isArray(checkpoint?.beats)) {
    errors.push('beats must be an array');
  } else {
    if (isNonNegativeInteger(checkpoint?.completedBeats) && checkpoint.completedBeats !== checkpoint.beats.length) {
      errors.push('completedBeats must equal beats length');
    }
    checkpoint.beats.forEach((beat, index) => {
      const beatValidation = validateDreamSessionBeat(beat, index);
      if (!beatValidation.valid) {
        errors.push(...beatValidation.errors);
      }
    });
  }
  if (!isObject(checkpoint?.finalSessionArc)) {
    errors.push('finalSessionArc must be an object');
  } else {
    errors.push(...validateOptionalNestedContract(
      checkpoint.finalSessionArc,
      'finalSessionArc',
      validateSessionArc
    ));
  }
  if (!Array.isArray(checkpoint?.recentEchoTraces)) {
    errors.push('recentEchoTraces must be an array');
  } else {
    checkpoint.recentEchoTraces.forEach((trace, index) => {
      const traceValidation = validateEchoTrace(trace);
      if (!traceValidation.valid) {
        errors.push(...prefixNestedErrors(traceValidation.errors, `recentEchoTraces[${index}]`, 'echoTrace'));
      }
    });
  }
  if (!isObject(checkpoint?.dreamflowState)) {
    errors.push('dreamflowState must be an object');
  } else {
    const flowValidation = validateDreamflowRuntimeState(checkpoint.dreamflowState);
    if (!flowValidation.valid) {
      errors.push(...flowValidation.errors);
    }
  }
  if (!hasOwn(checkpoint, 'finalDreamWeather')) {
    errors.push('finalDreamWeather is required');
  } else if (checkpoint?.finalDreamWeather !== null) {
    errors.push(...validateOptionalNestedContract(
      checkpoint.finalDreamWeather,
      'finalDreamWeather',
      validateDreamWeather
    ));
  }
  if (!hasOwn(checkpoint, 'finalSelectedDream')) {
    errors.push('finalSelectedDream is required');
  } else if (checkpoint?.finalSelectedDream !== null) {
    const selectedValidation = validateSelectedDream(checkpoint.finalSelectedDream, 'finalSelectedDream');
    if (!selectedValidation.valid) {
      errors.push(...selectedValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDreamflowRuntimeState(state, label = 'dreamflowState') {
  const errors = [];
  const allowedKeys = ['schema', 'schemaVersion', 'randomState'];

  if (state?.schema !== 'DreamflowRuntimeStateV1') {
    errors.push(`${label}.schema must be DreamflowRuntimeStateV1`);
  }
  if (state?.schemaVersion !== 1) {
    errors.push(`${label}.schemaVersion must be 1`);
  }
  errors.push(...validateKnownKeys(state, allowedKeys, label));
  if (!(state?.randomState === null || (Number.isInteger(state?.randomState) && state.randomState >= 0 && state.randomState <= 0xffffffff))) {
    errors.push(`${label}.randomState must be null or an unsigned integer`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateDreamSessionBeat(beat, index) {
  const errors = [];
  const label = `beats[${index}]`;
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'index',
    'passage',
    'echoTrace',
    'sessionArc',
    'arcDirective',
    'selectedDream',
    'dreamJourney',
    'dreamWeather',
    'weatherTrace',
    'contentGate',
    'contentReplacementPlan',
    'returnAvailable'
  ];

  if (beat?.schema !== 'DreamSessionBeatV1') {
    errors.push(`${label}.schema must be DreamSessionBeatV1`);
  }
  if (beat?.schemaVersion !== 1) {
    errors.push(`${label}.schemaVersion must be 1`);
  }
  errors.push(...validateKnownKeys(beat, allowedKeys, label));
  if (beat?.index !== index + 1) {
    errors.push(`${label}.index must be ${index + 1}`);
  }
  if (typeof beat?.returnAvailable !== 'boolean') {
    errors.push(`${label}.returnAvailable must be a boolean`);
  }

  const passageValidation = validatePassage(beat?.passage);
  if (!passageValidation.valid) {
    errors.push(...prefixNestedErrors(passageValidation.errors, `${label}.passage`, 'passage'));
  }
  const echoValidation = validateEchoTrace(beat?.echoTrace);
  if (!echoValidation.valid) {
    errors.push(...prefixNestedErrors(echoValidation.errors, `${label}.echoTrace`, 'echoTrace'));
  }
  const arcValidation = validateSessionArc(beat?.sessionArc);
  if (!arcValidation.valid) {
    errors.push(...prefixNestedErrors(arcValidation.errors, `${label}.sessionArc`, 'sessionArc'));
  }
  const directiveValidation = validateSessionArcDirective(beat?.arcDirective);
  if (!directiveValidation.valid) {
    errors.push(...prefixNestedErrors(directiveValidation.errors, `${label}.arcDirective`, 'arcDirective'));
  }
  const selectedValidation = validateSelectedDream(beat?.selectedDream, `${label}.selectedDream`);
  if (!selectedValidation.valid) {
    errors.push(...selectedValidation.errors);
  }
  const journeyValidation = validateDreamJourney(beat?.dreamJourney, `${label}.dreamJourney`);
  if (!journeyValidation.valid) {
    errors.push(...journeyValidation.errors);
  }
  const weatherValidation = validateDreamWeather(beat?.dreamWeather);
  if (!weatherValidation.valid) {
    errors.push(...prefixNestedErrors(weatherValidation.errors, `${label}.dreamWeather`, 'dreamWeather'));
  }
  const traceValidation = validateWeatherTrace(beat?.weatherTrace);
  if (!traceValidation.valid) {
    errors.push(...prefixNestedErrors(traceValidation.errors, `${label}.weatherTrace`, 'weatherTrace'));
  }
  const gateValidation = validateSessionContentGate(beat?.contentGate);
  if (!gateValidation.valid) {
    errors.push(...prefixNestedErrors(gateValidation.errors, `${label}.contentGate`, 'sessionContentGate'));
  }
  const replacementValidation = validateSessionContentReplacementPlan(beat?.contentReplacementPlan);
  if (!replacementValidation.valid) {
    errors.push(...prefixNestedErrors(
      replacementValidation.errors,
      `${label}.contentReplacementPlan`,
      'sessionContentReplacementPlan'
    ));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateSelectedDream(selectedDream, label) {
  const errors = [];
  const allowedKeys = ['id', 'name', 'symbolicTags', 'weightBreakdown'];

  if (!isObject(selectedDream)) {
    return {
      valid: false,
      errors: [`${label} must be an object`]
    };
  }
  errors.push(...validateKnownKeys(selectedDream, allowedKeys, label));
  if (!isNonEmptyString(selectedDream.id)) {
    errors.push(`${label}.id is required`);
  }
  if (!isNonEmptyString(selectedDream.name)) {
    errors.push(`${label}.name is required`);
  }
  errors.push(...validateStringList(selectedDream.symbolicTags, `${label}.symbolicTags`));
  errors.push(...validateWeightBreakdown(selectedDream.weightBreakdown, `${label}.weightBreakdown`));

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateDreamJourney(journey, label) {
  const errors = [];
  const allowedKeys = ['schema', 'beats', 'symbolTrail', 'summary', 'policy'];

  if (!isObject(journey)) {
    return {
      valid: false,
      errors: [`${label} must be an object`]
    };
  }
  if (journey.schema !== 'DreamJourneyV1') {
    errors.push(`${label}.schema must be DreamJourneyV1`);
  }
  errors.push(...validateKnownKeys(journey, allowedKeys, label));
  if (!Array.isArray(journey.beats)) {
    errors.push(`${label}.beats must be an array`);
  } else {
    journey.beats.forEach((beat, index) => {
      const beatLabel = `${label}.beats[${index}]`;
      const allowedBeatKeys = ['role', 'moduleId', 'moduleName', 'symbolicTags', 'weightBreakdown'];
      errors.push(...validateKnownKeys(beat, allowedBeatKeys, beatLabel));
      if (!SESSION_ARC_ROLES.includes(beat?.role)) {
        errors.push(`${beatLabel}.role must be entry, pressure, mirror, or return`);
      }
      if (!isNonEmptyString(beat?.moduleId)) {
        errors.push(`${beatLabel}.moduleId is required`);
      }
      if (!isNonEmptyString(beat?.moduleName)) {
        errors.push(`${beatLabel}.moduleName is required`);
      }
      errors.push(...validateStringList(beat?.symbolicTags, `${beatLabel}.symbolicTags`));
      errors.push(...validateWeightBreakdown(beat?.weightBreakdown, `${beatLabel}.weightBreakdown`));
    });
  }
  errors.push(...validateStringList(journey.symbolTrail, `${label}.symbolTrail`));
  if (!isNonEmptyString(journey.summary)) {
    errors.push(`${label}.summary is required`);
  }
  errors.push(...validateDreamJourneyPolicy(journey.policy, `${label}.policy`));

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateDreamJourneyPolicy(policy, label) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'hardBoundaryTags',
    'suppressedModuleIds',
    'replacementRoutes',
    'fallbackUsed',
    'playerFacingText'
  ];

  if (!isObject(policy)) {
    return [`${label} must be an object`];
  }
  errors.push(...validateKnownKeys(policy, allowedKeys, label));
  if (policy.schema !== 'DreamJourneyPolicyV1') {
    errors.push(`${label}.schema must be DreamJourneyPolicyV1`);
  }
  if (policy.schemaVersion !== 1) {
    errors.push(`${label}.schemaVersion must be 1`);
  }
  errors.push(...validateStringList(policy.hardBoundaryTags, `${label}.hardBoundaryTags`));
  errors.push(...validateStringList(policy.suppressedModuleIds, `${label}.suppressedModuleIds`));
  errors.push(...validateDreamJourneyReplacementRoutes(policy.replacementRoutes, `${label}.replacementRoutes`));
  if (typeof policy.fallbackUsed !== 'boolean') {
    errors.push(`${label}.fallbackUsed must be a boolean`);
  }
  if (policy.playerFacingText !== null) {
    errors.push(`${label}.playerFacingText must be null`);
  }
  return errors;
}

function validateDreamJourneyReplacementRoutes(routes, label) {
  const errors = [];
  if (!Array.isArray(routes)) {
    return [`${label} must be an array`];
  }

  routes.forEach((route, index) => {
    const routeLabel = `${label}[${index}]`;
    const allowedKeys = [
      'target',
      'action',
      'blockedId',
      'selectedId',
      'carriedTags',
      'suppressedTags',
      'reason'
    ];
    if (!isObject(route)) {
      errors.push(`${routeLabel} must be an object`);
      return;
    }
    errors.push(...validateKnownKeys(route, allowedKeys, routeLabel));
    if (route.target !== 'dreamModule') {
      errors.push(`${routeLabel}.target must be dreamModule`);
    }
    if (route.action !== 'replace') {
      errors.push(`${routeLabel}.action must be replace`);
    }
    if (!isNonEmptyString(route.blockedId)) {
      errors.push(`${routeLabel}.blockedId is required`);
    }
    if (!isNonEmptyString(route.selectedId)) {
      errors.push(`${routeLabel}.selectedId is required`);
    }
    errors.push(...validateStringList(route.carriedTags, `${routeLabel}.carriedTags`));
    errors.push(...validateStringList(route.suppressedTags, `${routeLabel}.suppressedTags`));
    if (!isNonEmptyString(route.reason)) {
      errors.push(`${routeLabel}.reason is required`);
    }
  });

  return errors;
}

function validateWeightBreakdown(weightBreakdown, label) {
  const errors = [];
  if (!isObject(weightBreakdown)) {
    return [`${label} must be an object`];
  }
  errors.push(...validateKnownKeys(weightBreakdown, DREAM_JOURNEY_WEIGHT_KEYS, label));
  for (const [key, value] of Object.entries(weightBreakdown)) {
    if (!Number.isFinite(value)) {
      errors.push(`${label}.${key} must be a finite number`);
    }
  }
  return errors;
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
    saveGame.payload.thresholdPresentation,
    'payload.thresholdPresentation',
    validateThresholdPresentation
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.dreamerProfile,
    'payload.dreamerProfile',
    validateDreamerProfile
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.saveSlot,
    'payload.saveSlot',
    validateSaveSlotPlan
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionShapeSelection,
    'payload.sessionShapeSelection',
    validateSessionShapeSelection
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionContentGate,
    'payload.sessionContentGate',
    validateSessionContentGate
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionContentReplacementPlan,
    'payload.sessionContentReplacementPlan',
    validateSessionContentReplacementPlan
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionArc,
    'payload.sessionArc',
    validateSessionArc
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.dreamSession,
    'payload.dreamSession',
    validateDreamSession
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.dreamSessionCheckpoint,
    'payload.dreamSessionCheckpoint',
    validateDreamSessionCheckpoint
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
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.firstListeningRun,
    'payload.firstListeningRun',
    validateFirstListeningRun
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.experienceDirective,
    'payload.experienceDirective',
    validateExperienceDirective
  ));
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.sessionFrame,
    'payload.sessionFrame',
    validateSessionFrame
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

function validateSessionContentGateChecked(value) {
  const errors = [];
  const allowedKeys = ['passageId', 'dreamWeatherId', 'dreamJourneySummary', 'maskId'];
  if (!isObject(value)) {
    return ['checked must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'checked'));
  for (const key of allowedKeys) {
    if (!isNullableString(value[key])) {
      errors.push(`checked.${key} must be a string or null`);
    }
  }
  return errors;
}

function validateSessionContentGateReplacementHints(value) {
  const errors = [];
  const allowedKeys = [
    'preferredToneTags',
    'allowedPressureTags',
    'passageIntensityBand',
    'weatherPressure',
    'returnAnchorKind',
    'groundingPreference'
  ];
  if (!isObject(value)) {
    return ['replacementHints must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'replacementHints'));
  errors.push(...validateStringList(value.preferredToneTags, 'replacementHints.preferredToneTags'));
  errors.push(...validateStringList(value.allowedPressureTags, 'replacementHints.allowedPressureTags'));
  if (!['gentle', 'strange', 'dark', 'horrific', 'abyssal', 'cathartic', 'beautiful', 'chaotic'].includes(value.passageIntensityBand)) {
    errors.push('replacementHints.passageIntensityBand is unsupported');
  }
  if (!DREAM_WEATHER_PRESSURES.includes(value.weatherPressure)) {
    errors.push(`replacementHints.weatherPressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  if (!isNonEmptyString(value.returnAnchorKind)) {
    errors.push('replacementHints.returnAnchorKind is required');
  }
  if (!isNonEmptyString(value.groundingPreference)) {
    errors.push('replacementHints.groundingPreference is required');
  }
  return errors;
}

function validateSessionContentReplacement(value) {
  const errors = [];
  const allowedKeys = ['passage', 'dreamWeather', 'maskId'];
  if (!isObject(value)) {
    return ['replacement must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'replacement'));
  if (value.passage !== null) {
    const passageValidation = validatePassage(value.passage);
    if (!passageValidation.valid) {
      errors.push(...prefixNestedErrors(passageValidation.errors, 'replacement.passage', 'passage'));
    }
  }
  if (value.dreamWeather !== null) {
    const weatherValidation = validateDreamWeather(value.dreamWeather);
    if (!weatherValidation.valid) {
      errors.push(...prefixNestedErrors(weatherValidation.errors, 'replacement.dreamWeather', 'dreamWeather'));
    }
  }
  if (!isNullableString(value.maskId)) {
    errors.push('replacement.maskId must be a string or null');
  }
  return errors;
}

function validateSessionContentReplacementRoutes(value) {
  const errors = [];
  const allowedKeys = ['target', 'action', 'selectedId', 'reason'];
  if (!Array.isArray(value)) {
    return ['routes must be an array'];
  }
  value.forEach((route, index) => {
    const label = `routes[${index}]`;
    if (!isObject(route)) {
      errors.push(`${label} must be an object`);
      return;
    }
    errors.push(...validateKnownKeys(route, allowedKeys, label));
    if (!['passage', 'dreamWeather', 'mask'].includes(route.target)) {
      errors.push(`${label}.target must be passage, dreamWeather, or mask`);
    }
    if (!['replace', 'suppress'].includes(route.action)) {
      errors.push(`${label}.action must be replace or suppress`);
    }
    if (!isNullableString(route.selectedId)) {
      errors.push(`${label}.selectedId must be a string or null`);
    }
    if (!isNonEmptyString(route.reason)) {
      errors.push(`${label}.reason is required`);
    }
  });
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

function validateDreadAxisList(value, label) {
  const errors = validateStringList(value, label);
  if (!Array.isArray(value)) {
    return errors;
  }
  value.forEach((item, index) => {
    if (isNonEmptyString(item) && !DREAD_BUDGET_AXES.includes(item)) {
      errors.push(`${label}[${index}] must be a known dread axis`);
    }
  });
  return errors;
}

function validateArcRoleList(value, label) {
  const errors = [];
  if (!Array.isArray(value)) {
    return [`${label} must be an array`];
  }
  value.forEach((entry, index) => {
    if (!SESSION_ARC_ROLES.includes(entry)) {
      errors.push(`${label}[${index}] must be entry, pressure, mirror, or return`);
    }
  });
  return errors;
}

function validateCountMap(value, label, allowedKeys) {
  const errors = [];
  if (!isObject(value)) {
    return [`${label} must be an object`];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, label));
  for (const key of allowedKeys) {
    if (!isNonNegativeInteger(value[key])) {
      errors.push(`${label}.${key} must be a non-negative integer`);
    }
  }
  return errors;
}

function validatePresentationNumberMap(value, label) {
  const errors = [];
  if (!isObject(value)) {
    return [`${label} must be an object`];
  }
  for (const [key, entry] of Object.entries(value)) {
    errors.push(...validateNumberBetween(entry, `${label}.${key}`, 0, 1));
  }
  return errors;
}

function validatePresentationHaptics(value) {
  const errors = [];
  const allowedKeys = ['enabled', 'amplitude', 'pulseRate'];
  if (!isObject(value)) {
    return ['haptics must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'haptics'));
  if (typeof value.enabled !== 'boolean') {
    errors.push('haptics.enabled must be a boolean');
  }
  errors.push(...validateNumberBetween(value.amplitude, 'haptics.amplitude', 0, 1));
  errors.push(...validateNumberBetween(value.pulseRate, 'haptics.pulseRate', 0, 1));
  return errors;
}

function validatePresentationComfort(value) {
  const errors = [];
  const allowedKeys = [
    'ceiling',
    'suddenFlashAllowed',
    'pursuitAllowed',
    'locomotionIntensity',
    'returnAnchorKind'
  ];
  if (!isObject(value)) {
    return ['comfort must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'comfort'));
  errors.push(...validateNumberBetween(value.ceiling, 'comfort.ceiling', 0, 1));
  if (typeof value.suddenFlashAllowed !== 'boolean') {
    errors.push('comfort.suddenFlashAllowed must be a boolean');
  }
  if (typeof value.pursuitAllowed !== 'boolean') {
    errors.push('comfort.pursuitAllowed must be a boolean');
  }
  errors.push(...validateNumberBetween(value.locomotionIntensity, 'comfort.locomotionIntensity', 0, 1));
  if (!isNonEmptyString(value.returnAnchorKind)) {
    errors.push('comfort.returnAnchorKind is required');
  }
  return errors;
}

function validateSessionFrameComfort(value) {
  const errors = [];
  const allowedKeys = [
    'intensityCeiling',
    'returnAvailable',
    'returnAnchorKind',
    'suddenFlashAllowed',
    'pursuitAllowed',
    'hapticsEnabled',
    'locomotionIntensity'
  ];
  if (!isObject(value)) {
    return ['comfort must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'comfort'));
  errors.push(...validateNumberBetween(value.intensityCeiling, 'comfort.intensityCeiling', 0, 1));
  for (const key of ['returnAvailable', 'suddenFlashAllowed', 'pursuitAllowed', 'hapticsEnabled']) {
    if (typeof value[key] !== 'boolean') {
      errors.push(`comfort.${key} must be a boolean`);
    }
  }
  if (!isNonEmptyString(value.returnAnchorKind)) {
    errors.push('comfort.returnAnchorKind is required');
  }
  errors.push(...validateNumberBetween(value.locomotionIntensity, 'comfort.locomotionIntensity', 0, 1));
  return errors;
}

function validateSessionFrameRendererHints(value) {
  const errors = [];
  const allowedKeys = [
    'nextMove',
    'suggestedRole',
    'pressureTarget',
    'returnReadiness',
    'atmosphereMood',
    'weatherPressure',
    'lightingIntensityScale',
    'fogDensity',
    'audioTension',
    'hapticAmplitude',
    'movementDrag'
  ];
  if (!isObject(value)) {
    return ['rendererHints must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'rendererHints'));
  if (!SESSION_ARC_DECISIONS.includes(value.nextMove)) {
    errors.push(`rendererHints.nextMove must be one of ${SESSION_ARC_DECISIONS.join(', ')}`);
  }
  if (!SESSION_ARC_ROLES.includes(value.suggestedRole)) {
    errors.push(`rendererHints.suggestedRole must be one of ${SESSION_ARC_ROLES.join(', ')}`);
  }
  for (const key of [
    'pressureTarget',
    'returnReadiness',
    'lightingIntensityScale',
    'fogDensity',
    'audioTension',
    'hapticAmplitude',
    'movementDrag'
  ]) {
    errors.push(...validateNumberBetween(value[key], `rendererHints.${key}`, 0, 1));
  }
  if (!isNonEmptyString(value.atmosphereMood)) {
    errors.push('rendererHints.atmosphereMood is required');
  }
  if (!DREAM_WEATHER_PRESSURES.includes(value.weatherPressure)) {
    errors.push(`rendererHints.weatherPressure must be one of ${DREAM_WEATHER_PRESSURES.join(', ')}`);
  }
  return errors;
}

function validateSessionFrameDebug(value) {
  const errors = [];
  const allowedKeys = ['eventCount', 'lastEventType'];
  if (!isObject(value)) {
    return ['debug must be an object'];
  }
  errors.push(...validateKnownKeys(value, allowedKeys, 'debug'));
  if (!isNonNegativeInteger(value.eventCount)) {
    errors.push('debug.eventCount must be a non-negative integer');
  }
  if (!isNullableString(value.lastEventType)) {
    errors.push('debug.lastEventType must be a string or null');
  }
  return errors;
}

function validateRuntimeReadinessCapabilities(value) {
  const errors = [];
  if (!isObject(value)) {
    return ['capabilities must be an object'];
  }
  errors.push(...validateKnownKeys(value, RUNTIME_READINESS_CAPABILITIES, 'capabilities'));
  for (const key of RUNTIME_READINESS_CAPABILITIES) {
    if (typeof value[key] !== 'boolean') {
      errors.push(`capabilities.${key} must be a boolean`);
    }
  }
  return errors;
}

function validateRuntimeReadinessCheck(check, label) {
  const errors = [];
  const allowedKeys = ['id', 'status', 'severity', 'summary', 'details', 'errors'];
  if (!isObject(check)) {
    return [`${label} must be an object`];
  }
  errors.push(...validateKnownKeys(check, allowedKeys, label));
  if (!isNonEmptyString(check.id)) {
    errors.push(`${label}.id is required`);
  }
  if (!RUNTIME_READINESS_STATUSES.includes(check.status)) {
    errors.push(`${label}.status must be one of ${RUNTIME_READINESS_STATUSES.join(', ')}`);
  }
  if (!RUNTIME_READINESS_SEVERITIES.includes(check.severity)) {
    errors.push(`${label}.severity must be one of ${RUNTIME_READINESS_SEVERITIES.join(', ')}`);
  }
  if (!isNonEmptyString(check.summary)) {
    errors.push(`${label}.summary is required`);
  }
  if (!isObject(check.details)) {
    errors.push(`${label}.details must be an object`);
  }
  errors.push(...validateStringList(check.errors, `${label}.errors`));
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
  if (entry?.firebreakTrace !== undefined && entry.firebreakTrace !== null) {
    const firebreakValidation = validateGniFirebreakTrace(entry.firebreakTrace);
    if (!firebreakValidation.valid) {
      errors.push(...firebreakValidation.errors.map((error) => `${label}.firebreakTrace.${error}`));
    }
  }

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
  if (entry?.firebreakTrace !== undefined && entry.firebreakTrace !== null) {
    const firebreakValidation = validateGniFirebreakTrace(entry.firebreakTrace);
    if (!firebreakValidation.valid) {
      errors.push(...firebreakValidation.errors.map((error) => `${label}.firebreakTrace.${error}`));
    }
  }

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

function hasOwn(input, key) {
  return isObject(input) && Object.prototype.hasOwnProperty.call(input, key);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function round(value) {
  return Number(value.toFixed(3));
}
