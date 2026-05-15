import { FeelingState } from './feeling.js';
import { createDreamWeather } from './dreamWeather.js';
import { createSessionCovenant } from './sessionCovenant.js';

export function buildThresholdPresentation({ chamber, feeling, dreamWeather = null, sessionCovenant = null } = {}) {
  const chamberSnapshot = snapshotFrom(chamber);
  const feelingState = feeling instanceof FeelingState ? feeling : new FeelingState(feeling);
  const atmosphere = feelingState.toPresentationParams();
  const dreamAtmosphere = buildDreamAtmospherePresentation({ dreamWeather, sessionCovenant });

  return {
    schema: 'ThresholdPresentationV1',
    room: {
      awakened: chamberSnapshot.awakened,
      boundaryState: chamberSnapshot.boundaryState,
      atmosphereState: feelingState.vibeState
    },
    note: {
      text: chamberSnapshot.note,
      visible: true,
      material: chamberSnapshot.awakened ? 'ink_warmed_by_heartlight' : 'dry_ink_in_dim_room'
    },
    heartlight: {
      awake: chamberSnapshot.heartlight?.awake ?? false,
      intensity: chamberSnapshot.heartlight?.intensity ?? 0,
      color: chamberSnapshot.heartlight?.color ?? 'low ember',
      bloom: atmosphere.postProcess.bloom
    },
    portal: {
      open: chamberSnapshot.portalOpen,
      material: chamberSnapshot.portalOpen ? 'threshold_rim_light' : 'dormant_keyhole_shadow'
    },
    toolSigils: {
      visible: (chamberSnapshot.visibleToolSigils ?? []).map((tool) => ({
        id: tool.id,
        name: tool.name,
        effect: tool.effect,
        material: `${tool.id}_sigil_placeholder`
      }))
    },
    forms: (chamberSnapshot.spawnedForms ?? []).map((form) => ({ ...form })),
    atmosphere,
    dreamAtmosphere
  };
}

export function buildDreamAtmospherePresentation({ dreamWeather = null, sessionCovenant = null } = {}) {
  const covenant = createSessionCovenant(sessionCovenant ?? {});
  const weather = dreamWeather ?? createDreamWeather({ covenant });
  const weatherAtmosphere = weather.atmosphere ?? {};
  const pressureWeight = pressureToWeight(weather.pressure);
  const peakPressure = Math.max(...Object.values(weather.dreadBudget ?? {}).map(clamp01), 0);
  const hardBoundaries = new Set(covenant.hardBoundaryTags ?? []);
  const weatherTags = [...new Set(weather.weatherTags ?? [])];

  return {
    schema: 'DreamAtmospherePresentationV1',
    schemaVersion: 1,
    weatherId: weather.weatherId ?? null,
    mood: weather.mood ?? 'stillness',
    pressure: weather.pressure ?? 'low',
    weatherTags,
    lighting: {
      intensityScale: clamp01(weatherAtmosphere.lightIntensity ?? 0.7),
      bloom: clamp01(weatherAtmosphere.bloom ?? 0.2),
      exposure: clamp01(weatherAtmosphere.exposure ?? 0.5),
      flicker: clamp01((weatherTags.includes('static') ? 0.22 : 0) + pressureWeight * 0.18),
      warmth: clamp01(weatherAtmosphere.warmth ?? 0.5)
    },
    fog: {
      density: clamp01(weatherAtmosphere.fogDensity ?? 0.2),
      drift: clamp01(0.12 + pressureWeight * 0.28),
      veil: clamp01(weatherTags.includes('mist') ? 0.55 : pressureWeight * 0.35)
    },
    audio: {
      tension: clamp01(peakPressure),
      reverb: clamp01(0.18 + pressureWeight * 0.32),
      lowPass: clamp01(weatherTags.includes('contained') ? 0.45 : pressureWeight * 0.22),
      silence: clamp01(weatherTags.includes('silence') ? 0.65 : 0.15 + pressureWeight * 0.18)
    },
    haptics: {
      enabled: peakPressure > 0.04 && covenant.intensityCeiling > 0.1,
      amplitude: clamp01(Math.min(covenant.intensityCeiling, peakPressure * 0.7)),
      pulseRate: clamp01(0.08 + pressureWeight * 0.42)
    },
    movement: {
      drag: clamp01(weatherAtmosphere.movementDrag ?? 0.12),
      drift: clamp01(weatherTags.includes('boundless') ? 0.42 : pressureWeight * 0.24),
      steadinessAssist: clamp01(1 - Math.min(covenant.intensityCeiling, peakPressure))
    },
    comfort: {
      ceiling: covenant.intensityCeiling,
      suddenFlashAllowed: covenant.intensityCeiling >= 0.68 && !hardBoundaries.has('flash'),
      pursuitAllowed: !hardBoundaries.has('pursuit'),
      locomotionIntensity: clamp01(Math.min(covenant.intensityCeiling, 0.2 + pressureWeight * 0.55)),
      returnAnchorKind: covenant.returnAnchor?.kind ?? 'image'
    }
  };
}

function snapshotFrom(value) {
  if (typeof value?.snapshot === 'function') {
    return value.snapshot();
  }
  return value ?? {};
}

function pressureToWeight(pressure) {
  return ({
    low: 0.15,
    medium: 0.4,
    heavy: 0.68,
    storm: 0.88
  })[pressure] ?? 0.15;
}

function clamp01(value) {
  const number = Number(value);
  return Number(Math.max(0, Math.min(1, Number.isFinite(number) ? number : 0)).toFixed(3));
}
