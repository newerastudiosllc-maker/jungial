import { SeededRandom } from './random.js';

export const DREAD_BUDGET_AXES = Object.freeze([
  'pursuit',
  'bodyUnease',
  'cosmicDread',
  'disorientation',
  'loss',
  'watching',
  'claustrophobia'
]);

export const WEATHER_TAGS = Object.freeze([
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

const MOODS = Object.freeze(['stillness', 'hush', 'gravity', 'flicker', 'bloom', 'eclipse']);
const PRESSURES = Object.freeze(['low', 'medium', 'heavy', 'storm']);
const COVENANT_CEILINGS = Object.freeze({
  gentle: 0.35,
  curious: 0.5,
  deep: 0.68,
  dark: 0.82
});

export function createDreamWeather(input = {}) {
  const seed = input.seed ?? 0;
  const rng = new SeededRandom(seed);
  const ceiling = resolveCovenantCeiling(input.covenant);
  const hardBoundaries = getHardBoundaries(input.covenant);
  const requestedTags = normalizeTags(input.weatherTags);
  const baseTags = requestedTags.length > 0
    ? requestedTags
    : ['silence', 'threshold'];
  const suppressedTags = normalizeTags([
    ...(input.suppressedTags ?? []),
    ...baseTags.filter((tag) => hardBoundaries.includes(tag))
  ]);
  const weatherTags = uniqueTags([
    'silence',
    'threshold',
    ...baseTags.filter((tag) => WEATHER_TAGS.includes(tag) && !hardBoundaries.includes(tag))
  ]);
  const dreadBudget = normalizeDreadBudget(input.dreadBudget ?? createDefaultDreadBudget(rng, ceiling), ceiling);

  for (const boundary of hardBoundaries) {
    if (DREAD_BUDGET_AXES.includes(boundary)) {
      dreadBudget[boundary] = 0;
      if (!suppressedTags.includes(boundary)) {
        suppressedTags.push(boundary);
      }
    }
  }
  const pressure = selectPressure(ceiling, dreadBudget);

  return {
    schema: 'DreamWeatherV1',
    schemaVersion: 1,
    weatherId: `weather-${String(seed)}`,
    mood: selectMood(weatherTags),
    pressure,
    ceiling,
    dreadBudget,
    weatherTags,
    suppressedTags,
    atmosphere: createAtmosphere({ rng, pressure, ceiling })
  };
}

export function createWeatherTrace({ weather, sourceTags = [], suppressedTags = [], seed = 0 } = {}) {
  const normalizedWeather = weather ?? createDreamWeather({ seed });

  return {
    schema: 'WeatherTraceV1',
    schemaVersion: 1,
    traceId: `weather-trace-${String(seed)}`,
    weatherId: normalizedWeather.weatherId,
    mood: normalizedWeather.mood,
    pressure: normalizedWeather.pressure,
    sourceTags: normalizeTags(sourceTags),
    resultingTags: [...normalizedWeather.weatherTags],
    suppressedTags: uniqueTags([...normalizedWeather.suppressedTags, ...normalizeTags(suppressedTags)]),
    strongestDreadAxis: getStrongestDreadAxis(normalizedWeather.dreadBudget)
  };
}

export function toGniWeatherContext({ dreamWeather, weatherTrace } = {}) {
  const weather = dreamWeather ?? createDreamWeather();
  const traceSuppressedTags = weatherTrace?.suppressedTags ?? [];

  return {
    schema: 'DreamWeatherContextV1',
    schemaVersion: 1,
    weatherTags: [...weather.weatherTags],
    pressure: weather.pressure,
    dreadBudget: { ...weather.dreadBudget },
    suppressedTags: uniqueTags([...weather.suppressedTags, ...normalizeTags(traceSuppressedTags)])
  };
}

export function normalizeDreadBudget(input = {}, ceiling = 0.35) {
  const normalizedCeiling = clamp01(ceiling);

  return Object.fromEntries(DREAD_BUDGET_AXES.map((axis) => [
    axis,
    clampNumber(input?.[axis], 0, normalizedCeiling)
  ]));
}

function createDefaultDreadBudget(rng, ceiling) {
  return Object.fromEntries(DREAD_BUDGET_AXES.map((axis) => [
    axis,
    Number((rng.next() * ceiling * 0.55).toFixed(3))
  ]));
}

function createAtmosphere({ rng, pressure, ceiling }) {
  const pressureIndex = PRESSURES.indexOf(pressure);
  const pressureWeight = pressureIndex < 0 ? 0 : pressureIndex / (PRESSURES.length - 1);

  return {
    lightIntensity: clampNumber(0.72 - pressureWeight * 0.34 + rng.next() * 0.04, 0, 1),
    fogDensity: clampNumber(0.18 + ceiling * 0.36 + rng.next() * 0.04, 0, 1),
    bloom: clampNumber(0.22 + rng.next() * 0.12, 0, 1),
    exposure: clampNumber(0.48 - pressureWeight * 0.18, 0, 1),
    warmth: clampNumber(0.5 + rng.next() * 0.16 - ceiling * 0.08, 0, 1),
    movementDrag: clampNumber(0.12 + ceiling * 0.45, 0, 1)
  };
}

function resolveCovenantCeiling(covenant = {}) {
  const band = normalizeToken(covenant?.intensityBand ?? covenant?.intensity?.band);
  return COVENANT_CEILINGS[band] ?? COVENANT_CEILINGS.gentle;
}

function getHardBoundaries(covenant = {}) {
  return normalizeTags([
    ...(covenant?.hardBoundaries ?? []),
    ...(covenant?.sessionLimits?.hardBoundaries ?? []),
    ...(covenant?.hardBoundaryTags ?? [])
  ]);
}

function selectMood(weatherTags) {
  if (weatherTags.includes('gravity')) {
    return 'gravity';
  }
  if (weatherTags.includes('static')) {
    return 'flicker';
  }
  if (weatherTags.includes('garden')) {
    return 'bloom';
  }
  if (weatherTags.includes('ash') || weatherTags.includes('cold')) {
    return 'eclipse';
  }
  if (weatherTags.includes('distant_voice') || weatherTags.includes('mist')) {
    return 'hush';
  }
  return MOODS[0];
}

function selectPressure(ceiling, dreadBudget) {
  const peak = Math.max(...Object.values(dreadBudget), 0);
  const pressureValue = Math.max(ceiling, peak);

  if (pressureValue > 0.68) {
    return 'storm';
  }
  if (pressureValue > 0.5) {
    return 'heavy';
  }
  if (pressureValue > 0.35) {
    return 'medium';
  }
  return 'low';
}

function getStrongestDreadAxis(dreadBudget) {
  return DREAD_BUDGET_AXES.reduce((strongest, axis) => (
    dreadBudget[axis] > dreadBudget[strongest] ? axis : strongest
  ), DREAD_BUDGET_AXES[0]);
}

function normalizeTags(tags = []) {
  return uniqueTags((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean));
}

function uniqueTags(tags) {
  return [...new Set(tags)];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clampNumber(value, min, max) {
  const number = Number(value);
  const finite = Number.isFinite(number) ? number : min;
  return Number(Math.max(min, Math.min(max, finite)).toFixed(3));
}

function clamp01(value) {
  return clampNumber(value, 0, 1);
}
