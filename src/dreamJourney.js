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

export function toGniDreamJourneyContext(dreamJourney = null) {
  const policy = dreamJourney?.policy ?? {};

  return {
    schema: 'DreamJourneyContextV1',
    schemaVersion: 1,
    symbolTrail: normalizeTags(dreamJourney?.symbolTrail ?? []),
    suppressedModuleIds: normalizeStringList(policy.suppressedModuleIds),
    replacementRoutes: normalizeReplacementRoutes(policy.replacementRoutes),
    fallbackUsed: Boolean(policy.fallbackUsed)
  };
}

export function toDreamJourneyTracePolicy(dreamJourney = null) {
  const context = toGniDreamJourneyContext(dreamJourney);

  return {
    suppressedModuleIds: context.suppressedModuleIds,
    replacementRoutes: context.replacementRoutes,
    fallbackUsed: context.fallbackUsed
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
    replacementRoutes: [],
    fallbackUsed: allowedModuleCount === 0,
    playerFacingText: null
  };
}

function selectNextModule({ dreamflow, archetypeState, feelingState, roomConfig, weightOverrides, policy }) {
  const suppressed = new Set(policy.suppressedModuleIds);
  const scored = dreamflow.scoreModules({ archetypeState, feelingState, roomConfig, weightOverrides });
  const selected = dreamflow.random.pickWeighted(scored, (entry) => entry.weightBreakdown.total);

  if (selected.item && suppressed.has(selected.item.id)) {
    return selectReplacementModule({
      dreamflow,
      scored,
      blockedEntry: selected.item,
      policy,
      suppressed
    });
  }

  return {
    ...selected.item.module,
    weightBreakdown: {
      ...selected.item.weightBreakdown,
      roll: Number(selected.roll.toFixed(5))
    }
  };
}

function selectReplacementModule({ dreamflow, scored, blockedEntry, policy, suppressed }) {
  if (policy.fallbackUsed) {
    const fallback = selectFallbackModule({ dreamflow, policy });
    recordReplacementRoute(policy, createReplacementRoute({
      blockedEntry,
      selectedModule: fallback,
      policy
    }));
    return fallback;
  }

  const allowedEntries = scored.filter((entry) => !suppressed.has(entry.id));
  const replacementEntry = selectSymbolCompatibleReplacement({ allowedEntries, blockedEntry, policy })
    ?? dreamflow.random.pickWeighted(allowedEntries, (entry) => entry.weightBreakdown.total).item;
  const replacement = {
    ...replacementEntry.module,
    weightBreakdown: {
      ...replacementEntry.weightBreakdown,
      roll: 0
    }
  };

  recordReplacementRoute(policy, createReplacementRoute({
    blockedEntry,
    selectedModule: replacement,
    policy
  }));

  return replacement;
}

function selectSymbolCompatibleReplacement({ allowedEntries, blockedEntry, policy }) {
  const sourceTags = safeSourceTags(blockedEntry.module, policy);
  if (sourceTags.length === 0) {
    return null;
  }

  const ranked = allowedEntries
    .map((entry) => ({
      entry,
      carriedTags: carriedTagsFor(entry.module, sourceTags)
    }))
    .filter((candidate) => candidate.carriedTags.length > 0)
    .sort((left, right) => {
      const compatibility = right.carriedTags.length - left.carriedTags.length;
      if (compatibility !== 0) {
        return compatibility;
      }
      const weight = right.entry.weightBreakdown.total - left.entry.weightBreakdown.total;
      if (weight !== 0) {
        return weight;
      }
      return left.entry.id.localeCompare(right.entry.id);
    });

  return ranked[0]?.entry ?? null;
}

function createReplacementRoute({ blockedEntry, selectedModule, policy }) {
  return {
    target: 'dreamModule',
    action: 'replace',
    blockedId: blockedEntry.id,
    selectedId: selectedModule.id,
    carriedTags: carriedTagsFor(selectedModule, safeSourceTags(blockedEntry.module, policy)),
    suppressedTags: suppressedTagsFor(blockedEntry.module, policy),
    reason: 'dream_journey_boundary_reroute'
  };
}

function recordReplacementRoute(policy, route) {
  const key = JSON.stringify(route);
  const exists = policy.replacementRoutes.some((existing) => JSON.stringify(existing) === key);
  if (!exists) {
    policy.replacementRoutes.push(route);
  }
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

function safeSourceTags(module, policy) {
  const boundaries = createBoundarySet(policy.hardBoundaryTags);
  return (module?.symbolicTags ?? []).filter((tag) => !boundaryHas(boundaries, tag));
}

function suppressedTagsFor(module, policy) {
  const boundaries = createBoundarySet(policy.hardBoundaryTags);
  return normalizeTags((module?.symbolicTags ?? []).filter((tag) => boundaryHas(boundaries, tag)));
}

function carriedTagsFor(module, sourceTags) {
  const sourceByToken = new Map(sourceTags.map((tag) => [normalizeToken(tag), tag]));
  const carried = [];
  for (const tag of module?.symbolicTags ?? []) {
    const sourceTag = sourceByToken.get(normalizeToken(tag));
    if (sourceTag) {
      carried.push(sourceTag);
    }
  }
  return [...new Set(carried)];
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

function normalizeReplacementRoutes(routes = []) {
  return (Array.isArray(routes) ? routes : [])
    .map((route) => ({
      blockedId: stringOrEmpty(route?.blockedId),
      selectedId: stringOrEmpty(route?.selectedId),
      carriedTags: normalizeTags(route?.carriedTags),
      suppressedTags: normalizeTags(route?.suppressedTags),
      reason: stringOrEmpty(route?.reason)
    }))
    .filter((route) => route.blockedId && route.selectedId && route.reason);
}

function normalizeStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
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

function stringOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}
