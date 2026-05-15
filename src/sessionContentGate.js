import { createSessionCovenant } from './sessionCovenant.js';
import { stableHash } from './stableHash.js';

const INTENSITY_BAND_CEILINGS = Object.freeze({
  gentle: 0.25,
  strange: 0.45,
  dark: 0.62,
  horrific: 0.78,
  abyssal: 0.92,
  cathartic: 0.68,
  beautiful: 0.38,
  chaotic: 0.72
});

const WEATHER_PRESSURE_CEILINGS = Object.freeze({
  low: 0.35,
  medium: 0.5,
  heavy: 0.68,
  storm: 1
});

const DREAD_BUDGET_AXES = Object.freeze([
  'pursuit',
  'bodyUnease',
  'cosmicDread',
  'disorientation',
  'loss',
  'watching',
  'claustrophobia'
]);

const DREAD_AXIS_BY_COMPACT_TOKEN = Object.freeze(new Map(
  DREAD_BUDGET_AXES.map((axis) => [compactToken(axis), axis])
));

export function createSessionContentGateReport({
  sessionCovenant = null,
  sessionShapeSelection = null,
  passage = null,
  dreamWeather = null,
  dreamJourney = null,
  mask = null
} = {}) {
  const covenant = createSessionCovenant(sessionCovenant ?? sessionShapeSelection?.covenant ?? {});
  const hardBoundaries = createBoundarySet(covenant.hardBoundaryTags);
  const softBoundaries = createBoundarySet(covenant.softBoundaryTags);
  const allowedPressureTags = new Set(normalizeTags(covenant.allowedPressureTags));
  const blockedReasons = [];
  const warnings = [];
  const suppressedTags = new Set(normalizeTags(dreamWeather?.suppressedTags));

  checkPassage({ passage, covenant, hardBoundaries, softBoundaries, allowedPressureTags, blockedReasons, warnings, suppressedTags });
  checkDreamWeather({ dreamWeather, covenant, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags });
  checkDreamJourney({ dreamJourney, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags });
  checkMask({ mask, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags });

  const checked = {
    passageId: stringOrNull(passage?.id),
    dreamWeatherId: stringOrNull(dreamWeather?.weatherId),
    dreamJourneySummary: stringOrNull(dreamJourney?.summary),
    maskId: stringOrNull(mask?.id)
  };
  const replacementHints = createReplacementHints(covenant);
  const allowed = blockedReasons.length === 0;
  const gateId = `content-gate-${stableHash({
    sessionShapeId: sessionShapeSelection?.shapeId ?? null,
    intensityCeiling: covenant.intensityCeiling,
    checked,
    blockedReasons,
    warnings,
    suppressedTags: [...suppressedTags].sort()
  }).slice(0, 12)}`;

  return {
    schema: 'SessionContentGateV1',
    schemaVersion: 1,
    gateId,
    allowed,
    sessionShapeId: stringOrNull(sessionShapeSelection?.shapeId),
    intensityCeiling: covenant.intensityCeiling,
    checked,
    suppressedTags: [...suppressedTags].sort(),
    warnings: uniqueStrings(warnings),
    blockedReasons: uniqueStrings(blockedReasons),
    replacementHints,
    playerFacingText: null
  };
}

function checkPassage({ passage, covenant, hardBoundaries, softBoundaries, allowedPressureTags, blockedReasons, warnings, suppressedTags }) {
  if (!passage) {
    warnings.push('passage missing from content gate input');
    return;
  }

  const band = normalizeToken(passage.intensityBand);
  const bandCeiling = INTENSITY_BAND_CEILINGS[band] ?? INTENSITY_BAND_CEILINGS.strange;
  if (bandCeiling > covenant.intensityCeiling + 0.001) {
    blockedReasons.push(`passage.intensityBand.${band} exceeds intensityCeiling ${formatNumber(covenant.intensityCeiling)}`);
  }

  for (const [field, tags] of Object.entries({
    motifs: passage.motifs,
    pressureTags: passage.pressureTags,
    formTags: passage.formTags,
    returnAnchorTags: passage.returnAnchorTags
  })) {
    checkTagList({
      tags,
      label: `passage.${field}`,
      hardBoundaries,
      softBoundaries,
      blockedReasons,
      warnings,
      suppressedTags
    });
  }

  if (allowedPressureTags.size > 0) {
    for (const tag of normalizeTags(passage.pressureTags)) {
      if (!allowedPressureTags.has(tag) && !boundaryHas(hardBoundaries, tag)) {
        warnings.push(`passage.pressureTags.${tag} outside allowedPressureTags`);
      }
    }
  }
}

function checkDreamWeather({ dreamWeather, covenant, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags }) {
  if (!dreamWeather) {
    warnings.push('dreamWeather missing from content gate input');
    return;
  }

  const weatherCeiling = clamp01(dreamWeather.ceiling);
  if (weatherCeiling > covenant.intensityCeiling + 0.001) {
    blockedReasons.push(`dreamWeather.ceiling ${formatNumber(weatherCeiling)} exceeds intensityCeiling ${formatNumber(covenant.intensityCeiling)}`);
  }

  const pressureCeiling = WEATHER_PRESSURE_CEILINGS[normalizeToken(dreamWeather.pressure)] ?? WEATHER_PRESSURE_CEILINGS.medium;
  if (pressureCeiling > covenant.intensityCeiling + 0.12) {
    warnings.push(`dreamWeather.pressure.${normalizeToken(dreamWeather.pressure)} above covenant comfort band`);
  }

  checkTagList({
    tags: dreamWeather.weatherTags,
    label: 'dreamWeather.weatherTags',
    hardBoundaries,
    softBoundaries,
    blockedReasons,
    warnings,
    suppressedTags
  });

  for (const [axis, value] of Object.entries(dreamWeather.dreadBudget ?? {})) {
    const canonicalAxis = normalizeDreadAxis(axis);
    if (!canonicalAxis) {
      continue;
    }
    const normalizedValue = clamp01(value);
    if (boundaryHas(hardBoundaries, canonicalAxis) && normalizedValue > 0) {
      blockedReasons.push(`dreamWeather.dreadBudget.${canonicalAxis} crosses hard boundary`);
      suppressedTags.add(normalizeToken(canonicalAxis));
    }
    if (normalizedValue > covenant.intensityCeiling + 0.001) {
      blockedReasons.push(`dreamWeather.dreadBudget.${canonicalAxis} exceeds intensityCeiling ${formatNumber(covenant.intensityCeiling)}`);
    }
    if (boundaryHas(softBoundaries, canonicalAxis) && normalizedValue > covenant.intensityCeiling * 0.5) {
      warnings.push(`dreamWeather.dreadBudget.${canonicalAxis} touches soft boundary`);
    }
  }
}

function checkDreamJourney({ dreamJourney, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags }) {
  if (!dreamJourney) {
    warnings.push('dreamJourney missing from content gate input');
    return;
  }

  checkTagList({
    tags: dreamJourney.symbolTrail,
    label: 'dreamJourney.symbolTrail',
    hardBoundaries,
    softBoundaries,
    blockedReasons,
    warnings,
    suppressedTags
  });

  for (const [index, beat] of (dreamJourney.beats ?? []).entries()) {
    checkTagList({
      tags: beat?.symbolicTags,
      label: `dreamJourney.beats[${index}].symbolicTags`,
      hardBoundaries,
      softBoundaries,
      blockedReasons,
      warnings,
      suppressedTags
    });
  }
}

function checkMask({ mask, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags }) {
  if (!mask) {
    return;
  }

  checkTagList({
    tags: [
      mask.id,
      ...(mask.archetypeTags ?? []),
      mask.visualMaterial,
      mask.material,
      mask.dialogueTone
    ],
    label: 'mask.tags',
    hardBoundaries,
    softBoundaries,
    blockedReasons,
    warnings,
    suppressedTags
  });
}

function checkTagList({ tags, label, hardBoundaries, softBoundaries, blockedReasons, warnings, suppressedTags }) {
  for (const tag of normalizeTags(tags)) {
    if (boundaryHas(hardBoundaries, tag)) {
      blockedReasons.push(`${label}.${tag} crosses hard boundary`);
      suppressedTags.add(tag);
    } else if (boundaryHas(softBoundaries, tag)) {
      warnings.push(`${label}.${tag} touches soft boundary`);
    }
  }
}

function createReplacementHints(covenant) {
  return {
    preferredToneTags: [...covenant.toneTags],
    allowedPressureTags: [...covenant.allowedPressureTags],
    passageIntensityBand: selectPassageBand(covenant.intensityCeiling),
    weatherPressure: selectWeatherPressure(covenant.intensityCeiling),
    returnAnchorKind: covenant.returnAnchor.kind,
    groundingPreference: covenant.groundingPreference
  };
}

function selectPassageBand(ceiling) {
  const orderedBands = ['gentle', 'strange', 'dark', 'cathartic', 'chaotic', 'horrific', 'abyssal'];
  let selected = orderedBands[0];
  for (const band of orderedBands) {
    if ((INTENSITY_BAND_CEILINGS[band] ?? 1) <= ceiling + 0.001) {
      selected = band;
    }
  }
  return selected;
}

function selectWeatherPressure(ceiling) {
  if (ceiling <= 0.35) {
    return 'low';
  }
  if (ceiling <= 0.5) {
    return 'medium';
  }
  if (ceiling <= 0.68) {
    return 'heavy';
  }
  return 'storm';
}

function normalizeTags(tags = []) {
  return uniqueStrings((Array.isArray(tags) ? tags : [tags])
    .map(normalizeToken)
    .filter(Boolean));
}

function createBoundarySet(tags = []) {
  const set = new Set();
  for (const tag of normalizeTags(tags)) {
    set.add(tag);
    set.add(compactToken(tag));
    const canonicalAxis = normalizeDreadAxis(tag);
    if (canonicalAxis) {
      set.add(normalizeToken(canonicalAxis));
      set.add(compactToken(canonicalAxis));
    }
  }
  return set;
}

function boundaryHas(boundaries, tag) {
  const normalized = normalizeToken(tag);
  return boundaries.has(normalized) || boundaries.has(compactToken(normalized));
}

function normalizeDreadAxis(axis) {
  return DREAD_AXIS_BY_COMPACT_TOKEN.get(compactToken(axis)) ?? null;
}

function compactToken(value) {
  return normalizeToken(value).replace(/_/g, '');
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function stringOrNull(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function clamp01(value) {
  const number = Number(value);
  return Number(Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0)).toFixed(3));
}

function formatNumber(value) {
  return Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
