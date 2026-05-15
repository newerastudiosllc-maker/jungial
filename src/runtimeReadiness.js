import { fileURLToPath } from 'node:url';

import { loadBundledContentCatalog, normalizeContentCatalog } from './contentCatalog.js';
import { validateProjectContent } from './contentValidator.js';

const SUPPORTED_TARGETS = Object.freeze(['node_prototype', 'ue5', 'vr', 'console', 'browser']);
const RUNTIME_CONTRACTS = Object.freeze([
  'SessionBundleV1',
  'GniProcessingRequestV1',
  'JungialDirectiveV1',
  'GniBridgeResultV1',
  'GniDirectiveQueueV1',
  'SessionCovenantV1',
  'SessionShapeSelectionV1',
  'SessionContentGateV1',
  'FirstListeningRunV1',
  'PassageV1',
  'EchoTraceV1',
  'DreamWeatherV1',
  'WeatherTraceV1',
  'ExperienceDirectiveV1',
  'ThresholdPresentationV1',
  'SessionFrameV1',
  'DreamSessionV1',
  'DreamSessionCheckpointV1',
  'DreamerProfileV1',
  'DreamerMemoryContextV1',
  'JungialSaveGame'
]);

export const RUNTIME_READINESS_CAPABILITIES = Object.freeze([
  'thresholdChamber',
  'firstListening',
  'dreamSession',
  'dreamSessionCheckpoint',
  'dreamWeather',
  'experienceDirector',
  'sessionFrame',
  'sessionContentGate',
  'saveResume',
  'asyncGniQueue',
  'gniFirebreak'
]);

export function createRuntimeReadinessReport({
  catalog = loadBundledContentCatalog(),
  gniEndpoint = 'gni://local-dev-placeholder',
  platformTargets = ['node_prototype']
} = {}) {
  const targets = normalizeStringList(platformTargets, ['node_prototype']);
  const normalizedCatalog = normalizeContentCatalog(catalog);
  const contentValidation = validateProjectContent(normalizedCatalog);
  const checks = [
    createContentCheck(normalizedCatalog, contentValidation),
    createStaticCheck({
      id: 'contract.surface',
      severity: 'required',
      summary: 'Versioned contract documents are available for runtime, GNI, saves, and renderer handoff.',
      details: { contracts: RUNTIME_CONTRACTS.length }
    }),
    createStaticCheck({
      id: 'renderer.handoff',
      severity: 'required',
      summary: 'SessionFrameV1 is available for renderer, audio, haptics, and comfort systems.',
      details: { contract: 'SessionFrameV1' }
    }),
    createStaticCheck({
      id: 'save.resume',
      severity: 'required',
      summary: 'Versioned SaveGame and dream checkpoint contracts are available for suspend and resume.',
      details: { saveSchema: 'JungialSaveGame', checkpointSchema: 'DreamSessionCheckpointV1' }
    }),
    createStaticCheck({
      id: 'async.gni.queue',
      severity: 'required',
      summary: 'Pending GNI work can be persisted and resolved after gameplay continues.',
      details: { contract: 'GniDirectiveQueueV1' }
    }),
    createGniProviderCheck(gniEndpoint),
    createPlatformTargetsCheck(targets)
  ];
  const blockedCount = checks.filter((check) => check.status === 'blocked').length;
  const degradedCount = checks.filter((check) => check.status === 'degraded').length;

  return {
    schema: 'RuntimeReadinessV1',
    schemaVersion: 1,
    status: blockedCount > 0 ? 'blocked' : degradedCount > 0 ? 'degraded' : 'ready',
    canStartSession: blockedCount === 0,
    blockedCount,
    degradedCount,
    platformTargets: targets,
    capabilities: Object.fromEntries(RUNTIME_READINESS_CAPABILITIES.map((key) => [key, true])),
    contracts: [...RUNTIME_CONTRACTS],
    checks,
    playerFacingText: null
  };
}

function createContentCheck(catalog, validation) {
  return {
    id: 'content.catalog',
    status: validation.valid ? 'ready' : 'blocked',
    severity: 'required',
    summary: validation.valid
      ? 'Content catalog can bootstrap the chamber, dreamflow, masks, and Passage lattice.'
      : 'Content catalog must be repaired before a session can start.',
    details: {
      archetypes: catalog.archetypes.length,
      symbols: catalog.symbolLexicon.length,
      toolSigils: catalog.toolSigils.length,
      dreamModules: catalog.dreamModules.length,
      masks: catalog.masks.length,
      passages: catalog.passages.length,
      errors: [...validation.errors]
    },
    errors: [...validation.errors]
  };
}

function createStaticCheck({ id, severity, summary, details }) {
  return {
    id,
    status: 'ready',
    severity,
    summary,
    details,
    errors: []
  };
}

function createGniProviderCheck(endpoint) {
  const value = typeof endpoint === 'string' ? endpoint.trim() : '';
  const mode = value.startsWith('http://') || value.startsWith('https://')
    ? 'http'
    : value === 'gni://local-dev-placeholder'
      ? 'placeholder'
      : value
        ? 'custom'
        : 'missing';
  const ready = mode === 'http' || mode === 'custom';

  return {
    id: 'gni.provider',
    status: ready ? 'ready' : 'degraded',
    severity: 'optional',
    summary: ready
      ? 'GNI provider endpoint is configured behind the bridge.'
      : 'GNI provider is not configured; local emulator, fixtures, or queue persistence can carry prototype play.',
    details: {
      mode,
      endpointConfigured: Boolean(value),
      asyncQueueAvailable: true
    },
    errors: []
  };
}

function createPlatformTargetsCheck(targets) {
  const unsupported = targets.filter((target) => !SUPPORTED_TARGETS.includes(target));

  return {
    id: 'platform.targets',
    status: unsupported.length === 0 ? 'ready' : 'degraded',
    severity: 'optional',
    summary: unsupported.length === 0
      ? 'Requested platform targets map to known prototype and port lanes.'
      : 'Some platform targets are not yet mapped to a known port lane.',
    details: {
      supportedTargets: [...SUPPORTED_TARGETS],
      unsupportedTargets: unsupported
    },
    errors: []
  };
}

function normalizeStringList(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const normalized = value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return normalized.length > 0 ? [...new Set(normalized)] : [...fallback];
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg.startsWith('--gni-endpoint=')) {
      options.gniEndpoint = arg.slice('--gni-endpoint='.length);
    } else if (arg.startsWith('--targets=')) {
      options.platformTargets = arg.slice('--targets='.length).split(',');
    } else if (arg === '--json') {
      options.json = true;
    }
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const report = createRuntimeReadinessReport(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Runtime readiness: ${report.status}`);
    console.log(`Can start session: ${report.canStartSession ? 'yes' : 'no'}`);
    for (const check of report.checks) {
      console.log(`[${check.status}] ${check.id}: ${check.summary}`);
    }
  }
  if (!report.canStartSession) {
    process.exitCode = 1;
  }
}
