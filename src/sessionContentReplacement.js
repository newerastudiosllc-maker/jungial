import { createDreamWeather } from './dreamWeather.js';
import { selectPassage } from './passageLattice.js';
import { createSessionCovenant } from './sessionCovenant.js';
import { stableHash } from './stableHash.js';

export function createSessionContentReplacementPlan({
  gateReport = null,
  sessionCovenant = null,
  sessionShapeSelection = null,
  passages = [],
  recentEchoTraces = [],
  dreamerMemoryContext = null,
  architectState = null,
  seed = 0
} = {}) {
  const covenant = createSessionCovenant(sessionCovenant ?? sessionShapeSelection?.covenant ?? {});
  const replacementHints = gateReport?.replacementHints ?? createFallbackHints(covenant);
  const avoidTags = normalizeTags([
    ...(gateReport?.suppressedTags ?? []),
    ...covenant.hardBoundaryTags
  ]);
  const blockedReasons = normalizeStringList(gateReport?.blockedReasons);
  const status = gateReport?.allowed === false ? 'replacement_required' : 'not_needed';
  const base = {
    sourceGateId: stringOrNull(gateReport?.gateId),
    status,
    avoidTags,
    blockedReasons,
    replacementHints
  };

  if (status === 'not_needed') {
    return createPlanEnvelope({
      ...base,
      replacement: {
        passage: null,
        dreamWeather: null,
        maskId: null
      },
      routes: []
    });
  }

  const dreamWeather = createDreamWeather({
    covenant,
    weatherTags: selectReplacementWeatherTags(covenant),
    seed
  });
  const passageSelection = selectPassage({
    passages,
    covenant,
    seed,
    recentEchoTraces,
    dreamerMemoryContext,
    architectState,
    dreamWeather
  });

  return createPlanEnvelope({
    ...base,
    replacement: {
      passage: passageSelection.passage,
      dreamWeather,
      maskId: null
    },
    routes: [
      {
        target: 'passage',
        action: 'replace',
        selectedId: passageSelection.passage.id,
        reason: 'content_gate_blocked'
      },
      {
        target: 'dreamWeather',
        action: 'replace',
        selectedId: dreamWeather.weatherId,
        reason: 'content_gate_blocked'
      }
    ]
  });
}

function createPlanEnvelope({ sourceGateId, status, avoidTags, blockedReasons, replacementHints, replacement, routes }) {
  return {
    schema: 'SessionContentReplacementPlanV1',
    schemaVersion: 1,
    planId: `replacement-plan-${stableHash({
      sourceGateId,
      status,
      avoidTags,
      blockedReasons,
      replacement,
      routes
    }).slice(0, 12)}`,
    sourceGateId,
    status,
    avoidTags,
    blockedReasons,
    replacementHints,
    replacement,
    routes,
    playerFacingText: null
  };
}

function selectReplacementWeatherTags(covenant) {
  const candidateTags = [
    ...covenant.allowedPressureTags,
    ...covenant.toneTags,
    'silence',
    'threshold',
    'soft_lamp'
  ];
  return normalizeTags(candidateTags.filter((tag) => !covenant.hardBoundaryTags.includes(tag))).slice(0, 8);
}

function createFallbackHints(covenant) {
  return {
    preferredToneTags: [...covenant.toneTags],
    allowedPressureTags: [...covenant.allowedPressureTags],
    passageIntensityBand: 'gentle',
    weatherPressure: covenant.intensityCeiling <= 0.35 ? 'low' : 'medium',
    returnAnchorKind: covenant.returnAnchor.kind,
    groundingPreference: covenant.groundingPreference
  };
}

function normalizeTags(tags = []) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean))];
}

function normalizeStringList(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function stringOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
