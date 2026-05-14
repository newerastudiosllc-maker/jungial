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
