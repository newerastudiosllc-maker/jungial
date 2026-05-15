import { createSessionCovenant } from './sessionCovenant.js';

const SESSION_SHAPES = Object.freeze([
  {
    id: 'quiet_lantern',
    intensityBand: 'gentle',
    shapeTags: ['friendly', 'safe', 'warm'],
    covenant: {
      toneTags: ['gentle', 'friendly', 'beautiful'],
      intensityCeiling: 0.28,
      hardBoundaryTags: ['body_horror', 'pursuit'],
      softBoundaryTags: ['teeth', 'claustrophobia'],
      allowedPressureTags: ['warmth', 'memory', 'beauty'],
      returnAnchor: { kind: 'image', value: 'the lamp near the note' },
      groundingPreference: 'quiet_room',
      memoryScope: 'session_only'
    }
  },
  {
    id: 'strange_threshold',
    intensityBand: 'strange',
    shapeTags: ['curious', 'liminal', 'unsettled'],
    covenant: {
      toneTags: ['gentle', 'strange', 'curious'],
      intensityCeiling: 0.45,
      hardBoundaryTags: [],
      softBoundaryTags: ['pursuit', 'body_horror'],
      allowedPressureTags: ['unknown', 'shadow', 'invitation'],
      returnAnchor: { kind: 'image', value: 'the note in the Threshold Chamber' },
      groundingPreference: 'quiet_room',
      memoryScope: 'session_only'
    }
  },
  {
    id: 'dark_mirror',
    intensityBand: 'dark',
    shapeTags: ['shadowed', 'cathartic', 'reflective'],
    covenant: {
      toneTags: ['strange', 'dark', 'cathartic'],
      intensityCeiling: 0.62,
      hardBoundaryTags: [],
      softBoundaryTags: ['body_horror', 'pursuit', 'claustrophobia'],
      allowedPressureTags: ['shadow', 'loss', 'transformation', 'reflection'],
      returnAnchor: { kind: 'image', value: 'the Heartlight' },
      groundingPreference: 'quiet_room',
      memoryScope: 'session_only'
    }
  },
  {
    id: 'nightmare_veil',
    intensityBand: 'horrific',
    shapeTags: ['horrific', 'uncanny', 'cathartic'],
    covenant: {
      toneTags: ['dark', 'horrific', 'cathartic'],
      intensityCeiling: 0.78,
      hardBoundaryTags: [],
      softBoundaryTags: ['body_horror', 'pursuit', 'claustrophobia', 'teeth'],
      allowedPressureTags: ['shadow', 'annihilation', 'rebirth', 'unknown', 'watching'],
      returnAnchor: { kind: 'image', value: 'the Heartlight' },
      groundingPreference: 'quiet_room',
      memoryScope: 'session_only'
    }
  }
]);

export const SESSION_SHAPE_IDS = Object.freeze(SESSION_SHAPES.map((shape) => shape.id));

export function listSessionShapes() {
  return SESSION_SHAPES.map((shape) => ({
    schema: 'SessionShapeV1',
    schemaVersion: 1,
    id: shape.id,
    intensityBand: shape.intensityBand,
    shapeTags: [...shape.shapeTags],
    playerFacingText: null
  }));
}

export function createSessionCovenantFromShape(input = {}) {
  return createSessionShapeSelection(input).covenant;
}

export function createSessionShapeSelection({ shapeId = 'quiet_lantern', overrides = {} } = {}) {
  const shape = findShape(shapeId) ?? findShape('quiet_lantern');
  const source = shape.id === shapeId ? 'preset' : 'fallback';
  const covenant = createSessionCovenant(mergeShapeCovenant(shape.covenant, overrides));

  return {
    schema: 'SessionShapeSelectionV1',
    schemaVersion: 1,
    shapeId: shape.id,
    source,
    intensityBand: shape.intensityBand,
    shapeTags: [...shape.shapeTags],
    covenant,
    playerFacingText: null
  };
}

function findShape(shapeId) {
  return SESSION_SHAPES.find((shape) => shape.id === shapeId);
}

function mergeShapeCovenant(base, overrides = {}) {
  const next = {
    toneTags: mergeTags(base.toneTags, overrides.toneTags),
    intensityCeiling: chooseCeiling(base.intensityCeiling, overrides.intensityCeiling),
    hardBoundaryTags: mergeTags(base.hardBoundaryTags, overrides.hardBoundaryTags),
    softBoundaryTags: mergeTags(base.softBoundaryTags, overrides.softBoundaryTags),
    allowedPressureTags: mergeTags(base.allowedPressureTags, overrides.allowedPressureTags),
    returnAnchor: normalizeReturnAnchor(overrides.returnAnchor) ?? base.returnAnchor,
    groundingPreference: normalizeToken(overrides.groundingPreference) || base.groundingPreference,
    memoryScope: overrides.memoryScope === 'profile_aggregate' ? 'profile_aggregate' : base.memoryScope
  };
  return next;
}

function chooseCeiling(base, override) {
  const number = Number(override);
  if (!Number.isFinite(number)) {
    return base;
  }
  return Math.min(base, Math.max(0, number));
}

function mergeTags(base = [], extra = []) {
  return [...new Set([...(base ?? []), ...(Array.isArray(extra) ? extra : [])]
    .map(normalizeToken)
    .filter(Boolean))];
}

function normalizeReturnAnchor(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { kind: 'image', value: trimmed } : null;
  }
  if (typeof value === 'object') {
    const anchorValue = String(value.value ?? '').trim();
    if (!anchorValue) {
      return null;
    }
    return {
      kind: normalizeToken(value.kind) || 'image',
      value: anchorValue
    };
  }
  return null;
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}
