export const INTENSITY_BANDS = Object.freeze({
  gentle: 0.25,
  strange: 0.45,
  dark: 0.62,
  horrific: 0.78,
  abyssal: 0.92,
  cathartic: 0.68,
  beautiful: 0.38,
  chaotic: 0.72
});

export const DEFAULT_SESSION_COVENANT = Object.freeze({
  schema: 'SessionCovenantV1',
  schemaVersion: 1,
  mode: 'tonight_shape',
  toneTags: ['gentle', 'strange'],
  intensityCeiling: 0.35,
  hardBoundaryTags: ['real_world_self_harm'],
  softBoundaryTags: [],
  allowedPressureTags: [],
  returnAnchor: { kind: 'image', value: 'the note in the Threshold Chamber' },
  groundingPreference: 'quiet_room',
  memoryScope: 'session_only'
});

export function createSessionCovenant(input = {}) {
  const toneTags = normalizeTags(input.toneTags ?? DEFAULT_SESSION_COVENANT.toneTags);
  const intensityCeiling = input.intensityCeiling
    ?? (input.toneTags ? inferIntensityCeiling(toneTags) : DEFAULT_SESSION_COVENANT.intensityCeiling);
  return {
    schema: 'SessionCovenantV1',
    schemaVersion: 1,
    mode: normalizeMode(input.mode),
    toneTags,
    intensityCeiling: clamp01(intensityCeiling),
    hardBoundaryTags: mergeTags(['real_world_self_harm'], input.hardBoundaryTags),
    softBoundaryTags: normalizeTags(input.softBoundaryTags),
    allowedPressureTags: normalizeTags(input.allowedPressureTags),
    returnAnchor: normalizeReturnAnchor(input.returnAnchor),
    groundingPreference: normalizeToken(input.groundingPreference) || 'quiet_room',
    memoryScope: ['session_only', 'profile_aggregate'].includes(input.memoryScope)
      ? input.memoryScope
      : 'session_only'
  };
}

export function createFirstListeningCovenant({
  spokenTokens = [],
  selectedToneTags = [],
  returnAnchor = null,
  memoryScope = 'session_only'
} = {}) {
  const derived = deriveTagsFromSpeech(spokenTokens);
  return createSessionCovenant({
    mode: 'first_listening',
    toneTags: [...selectedToneTags, ...derived.toneTags],
    softBoundaryTags: derived.softBoundaryTags,
    returnAnchor: returnAnchor ? { kind: 'image', value: returnAnchor } : undefined,
    memoryScope
  });
}

export function createTonightShapeCovenant(input = {}) {
  return createSessionCovenant({
    ...input,
    mode: 'tonight_shape'
  });
}

export function toGniCovenantContext(covenant = createSessionCovenant()) {
  const normalized = createSessionCovenant(covenant);
  return {
    schema: 'SessionCovenantContextV1',
    schemaVersion: 1,
    mode: normalized.mode,
    toneTags: [...normalized.toneTags],
    intensityCeiling: normalized.intensityCeiling,
    hardBoundaryTags: [...normalized.hardBoundaryTags],
    softBoundaryTags: [...normalized.softBoundaryTags],
    allowedPressureTags: [...normalized.allowedPressureTags],
    returnAnchorKind: normalized.returnAnchor.kind,
    groundingPreference: normalized.groundingPreference,
    memoryScope: normalized.memoryScope
  };
}

function deriveTagsFromSpeech(spokenTokens) {
  const text = spokenTokens.join(' ').toLowerCase();
  return {
    toneTags: [
      text.includes('strange') ? 'strange' : null,
      text.includes('dark') ? 'dark' : null,
      text.includes('horror') || text.includes('horrific') ? 'horrific' : null
    ].filter(Boolean),
    softBoundaryTags: [
      text.includes('no teeth') || text.includes('teeth') ? 'teeth' : null,
      text.includes('no chase') || text.includes('chase') ? 'pursuit' : null
    ].filter(Boolean)
  };
}

function inferIntensityCeiling(toneTags) {
  return Math.max(...toneTags.map((tag) => INTENSITY_BANDS[tag] ?? 0.35), 0.35);
}

function normalizeMode(mode) {
  return ['first_listening', 'tonight_shape'].includes(mode) ? mode : 'tonight_shape';
}

function normalizeReturnAnchor(input) {
  if (typeof input === 'string') {
    return { kind: 'image', value: input.trim() || DEFAULT_SESSION_COVENANT.returnAnchor.value };
  }
  if (input && typeof input === 'object') {
    return {
      kind: normalizeToken(input.kind) || 'image',
      value: String(input.value ?? DEFAULT_SESSION_COVENANT.returnAnchor.value).trim()
    };
  }
  return { ...DEFAULT_SESSION_COVENANT.returnAnchor };
}

function mergeTags(required, tags) {
  return normalizeTags([...(required ?? []), ...(tags ?? [])]);
}

function normalizeTags(tags = []) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(Number(value).toFixed(3))));
}
