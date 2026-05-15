const JOURNEY_ROLES = Object.freeze(['entry', 'pressure', 'mirror', 'return']);
const FALLBACK_MODULE_ID = 'threshold_drift';
const FALLBACK_MODULE_NAME = 'Threshold Drift';
const FALLBACK_SYMBOLS = Object.freeze(['threshold', 'silence', 'lamp', 'breath', 'awakening', 'note', 'light']);

export function selectDreamJourney({
  dreamflow,
  archetypeState,
  feelingState,
  roomConfig,
  weightOverrides = {},
  covenant = null,
  sessionCovenant = null
}) {
  const policy = createDreamJourneyPolicy({
    modules: dreamflow?.modules ?? [],
    covenant: covenant ?? sessionCovenant
  });
  const beats = JOURNEY_ROLES.map((role) => {
    const module = selectNextModule({
      dreamflow,
      archetypeState,
      feelingState,
      roomConfig,
      weightOverrides,
      policy
    });
    return {
      role,
      moduleId: module.id,
      moduleName: module.name,
      symbolicTags: [...module.symbolicTags],
      weightBreakdown: module.weightBreakdown
    };
  });
  const symbolTrail = [...new Set(beats.flatMap((beat) => beat.symbolicTags))];

  return {
    schema: 'DreamJourneyV1',
    beats,
    symbolTrail,
    summary: beats.map((beat) => `${beat.role}:${beat.moduleName}`).join(' -> '),
    policy
  };
}

function createDreamJourneyPolicy({ modules = [], covenant = null } = {}) {
  const hardBoundaryTags = normalizeTags([
    'real_world_self_harm',
    ...(covenant?.hardBoundaryTags ?? [])
  ]);
  const boundarySet = createBoundarySet(hardBoundaryTags);
  const suppressedModuleIds = modules
    .filter((module) => moduleCrossesHardBoundary(module, boundarySet))
    .map((module) => module.id)
    .filter(Boolean)
    .sort();
  const allowedModuleCount = Math.max(0, modules.length - suppressedModuleIds.length);

  return {
    schema: 'DreamJourneyPolicyV1',
    schemaVersion: 1,
    hardBoundaryTags,
    suppressedModuleIds,
    fallbackUsed: allowedModuleCount === 0,
    playerFacingText: null
  };
}

function selectNextModule({ dreamflow, archetypeState, feelingState, roomConfig, weightOverrides, policy }) {
  if (policy.fallbackUsed) {
    return selectFallbackModule({ dreamflow, policy });
  }

  const suppressed = new Set(policy.suppressedModuleIds);
  const scored = dreamflow
    .scoreModules({ archetypeState, feelingState, roomConfig, weightOverrides })
    .filter((entry) => !suppressed.has(entry.id));
  const selected = dreamflow.random.pickWeighted(scored, (entry) => entry.weightBreakdown.total);

  return {
    ...selected.item.module,
    weightBreakdown: {
      ...selected.item.weightBreakdown,
      roll: Number(selected.roll.toFixed(5))
    }
  };
}

function selectFallbackModule({ dreamflow, policy }) {
  const fallback = {
    id: FALLBACK_MODULE_ID,
    name: FALLBACK_MODULE_NAME,
    symbolicTags: createFallbackSymbols(policy),
    weightBreakdown: {
      base: 0.05,
      archetype: 0,
      vibe: 0,
      room: 0,
      portal: 0,
      directorMultiplier: 1,
      total: 0.05
    }
  };
  const selected = dreamflow.random.pickWeighted([{ module: fallback, weightBreakdown: fallback.weightBreakdown }], (entry) => entry.weightBreakdown.total);

  return {
    ...selected.item.module,
    weightBreakdown: {
      ...selected.item.weightBreakdown,
      roll: Number(selected.roll.toFixed(5))
    }
  };
}

function createFallbackSymbols(policy) {
  const boundaries = createBoundarySet(policy.hardBoundaryTags);
  const symbols = FALLBACK_SYMBOLS.filter((symbol) => !boundaryHas(boundaries, symbol));
  return symbols.length > 0 ? symbols.slice(0, 2) : ['quiet_fallback'];
}

function moduleCrossesHardBoundary(module, boundarySet) {
  return (module?.symbolicTags ?? []).some((tag) => boundaryHas(boundarySet, tag));
}

function createBoundarySet(tags = []) {
  const set = new Set();
  for (const tag of normalizeTags(tags)) {
    set.add(tag);
    set.add(compactToken(tag));
  }
  return set;
}

function boundaryHas(boundaries, tag) {
  const normalized = normalizeToken(tag);
  return boundaries.has(normalized) || boundaries.has(compactToken(normalized));
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

function compactToken(value) {
  return normalizeToken(value).replace(/_/g, '');
}
