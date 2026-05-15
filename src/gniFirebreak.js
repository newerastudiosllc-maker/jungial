import { normalizeDirective, clampNumber } from './contracts.js';

const DIRECTIVE_KEYS = Object.freeze([
  'schema',
  'schemaVersion',
  'dreamWeightDeltas',
  'symbolEchoes',
  'maskPressure',
  'pacingDelta'
]);
const PACING_KEYS = Object.freeze(['intensity', 'repetition', 'silence']);
const PRIVATE_TOKEN_PATTERNS = Object.freeze([
  /(^|_)raw($|_)/i,
  /(^|_)private($|_)/i,
  /transcript/i,
  /prompt/i,
  /address/i,
  /diagnosis/i,
  /therapy/i,
  /trauma/i
]);

export function applyGniFirebreak({
  rawDirective = {},
  request = null,
  sessionBundle = null,
  source = 'provider'
} = {}) {
  const context = request?.payload ?? sessionBundle ?? {};
  const boundaryTags = collectBoundaryTags(context);
  const ceiling = resolveIntensityCeiling(context);
  const normalized = normalizeDirective(rawDirective);
  const suppressedCounts = {
    fields: countExtraFields(rawDirective),
    dreamWeightDeltas: 0,
    symbolEchoes: 0,
    maskPressure: 0,
    pacingDelta: countUnsupportedPacing(rawDirective?.pacingDelta)
  };
  const clampCounts = {
    dreamWeightDeltas: 0,
    maskPressure: 0,
    pacingDelta: 0
  };

  const dreamWeightDeltas = filterNumberMap({
    values: normalized.dreamWeightDeltas,
    ceiling,
    boundaryTags,
    suppressedCounts,
    clampCounts,
    label: 'dreamWeightDeltas'
  });
  const maskPressure = filterNumberMap({
    values: normalized.maskPressure,
    ceiling,
    boundaryTags,
    suppressedCounts,
    clampCounts,
    label: 'maskPressure'
  });
  const symbolEchoes = [];
  for (const symbol of normalized.symbolEchoes) {
    if (isSuppressedToken(symbol, boundaryTags)) {
      suppressedCounts.symbolEchoes += 1;
      continue;
    }
    symbolEchoes.push(symbol);
  }
  const pacingDelta = {};
  for (const [key, value] of Object.entries(normalized.pacingDelta)) {
    const clamped = clampNumber(value, -ceiling, ceiling);
    if (clamped !== value) {
      clampCounts.pacingDelta += 1;
    }
    pacingDelta[key] = clamped;
  }

  const directive = normalizeDirective({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas,
    symbolEchoes,
    maskPressure,
    pacingDelta
  });
  const trace = createFirebreakTrace({
    source,
    ceiling,
    boundaryTags,
    suppressedCounts,
    clampCounts
  });

  return {
    directive,
    rawResponse: directive,
    trace
  };
}

function filterNumberMap({
  values,
  ceiling,
  boundaryTags,
  suppressedCounts,
  clampCounts,
  label
}) {
  const output = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    if (isSuppressedToken(key, boundaryTags)) {
      suppressedCounts[label] += 1;
      continue;
    }

    const clamped = clampNumber(value, -ceiling, ceiling);
    if (clamped !== value) {
      clampCounts[label] += 1;
    }
    output[key] = clamped;
  }
  return output;
}

function createFirebreakTrace({
  source,
  ceiling,
  boundaryTags,
  suppressedCounts,
  clampCounts
}) {
  const changed = sumCounts(suppressedCounts) + sumCounts(clampCounts) > 0;
  return {
    schema: 'GniFirebreakTraceV1',
    schemaVersion: 1,
    source,
    changed,
    ceiling,
    boundaryTags: [...boundaryTags].sort(),
    suppressedCounts: { ...suppressedCounts },
    clampCounts: { ...clampCounts }
  };
}

function collectBoundaryTags(context = {}) {
  return new Set([
    ...(context.sessionCovenant?.hardBoundaryTags ?? []),
    ...(context.sessionCovenant?.hardBoundaries ?? []),
    ...(context.dreamWeatherContext?.suppressedTags ?? [])
  ].map(normalizeToken).filter(Boolean));
}

function resolveIntensityCeiling(context = {}) {
  const ceiling = Number(context.sessionCovenant?.intensityCeiling);
  return Number.isFinite(ceiling) ? clampNumber(ceiling, 0, 1) : 2;
}

function countExtraFields(rawDirective) {
  if (!isObject(rawDirective)) {
    return 0;
  }
  return Object.keys(rawDirective).filter((key) => !DIRECTIVE_KEYS.includes(key)).length;
}

function countUnsupportedPacing(pacingDelta) {
  if (!isObject(pacingDelta)) {
    return 0;
  }
  return Object.keys(pacingDelta).filter((key) => !PACING_KEYS.includes(key)).length;
}

function isSuppressedToken(value, boundaryTags) {
  const token = normalizeToken(value);
  if (!token) {
    return true;
  }
  return boundaryTags.has(token) || isPrivateToken(token);
}

function isPrivateToken(token) {
  return PRIVATE_TOKEN_PATTERNS.some((pattern) => pattern.test(token));
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function sumCounts(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
