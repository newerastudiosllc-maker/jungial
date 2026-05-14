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
  if (!Array.isArray(result?.errors)) {
    errors.push('errors must be an array');
  } else {
    result.errors.forEach((error, index) => {
      if (typeof error !== 'string') {
        errors.push(`errors[${index}] must be a string`);
      }
    });
  }

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

function round(value) {
  return Number(value.toFixed(3));
}
