import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { validateDirective, validateGniProcessingRequest } from './contracts.js';
import { applyGniFirebreak } from './gniFirebreak.js';
import { callGniProvider, isGniProviderPendingResponse } from './gniBridge.js';
import { createDefaultGniContractRequest } from './gniContractCheck.js';
import { GniEmulator } from './gniEmulator.js';
import { GniHttpProvider } from './gniHttpProvider.js';

export async function compareGniProvider({
  request = createDefaultGniContractRequest(),
  provider = null,
  endpoint = null,
  bearerToken = '',
  timeoutMs = 10000,
  emulatorSeed = 777
} = {}) {
  const requestValidation = validateGniProcessingRequest(request);
  const report = {
    schema: 'GniProviderComparisonReportV1',
    ok: false,
    applied: false,
    endpoint: endpoint ?? provider?.endpoint ?? null,
    request: {
      valid: requestValidation.valid,
      errors: requestValidation.errors,
      value: request
    },
    emulator: null,
    provider: null,
    diff: null
  };

  if (!requestValidation.valid) {
    return report;
  }

  report.emulator = createDirectiveReport({
    source: 'emulator',
    request,
    rawResponse: new GniEmulator({ seed: emulatorSeed }).processSessionBundle(request.payload)
  });

  const activeProvider = provider ?? new GniHttpProvider({ endpoint, bearerToken, timeoutMs });
  try {
    const rawResponse = await callGniProvider(activeProvider, request, request.payload);
    report.provider = createProviderReport({ request, rawResponse });
  } catch (error) {
    report.provider = {
      status: 'provider_error',
      providerJob: null,
      directive: null,
      firebreakTrace: null,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }

  if (report.emulator.status === 'directive_ready' && report.provider.status === 'directive_ready') {
    report.diff = compareDirectives(report.emulator.directive, report.provider.directive);
  }
  report.ok = report.emulator.status === 'directive_ready'
    && ['directive_ready', 'provider_pending', 'provider_empty'].includes(report.provider.status)
    && report.provider.errors.length === 0;

  return report;
}

export function parseGniProviderCompareArgs(args = []) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.slice('--endpoint='.length);
    } else if (arg.startsWith('--token-env=')) {
      options.tokenEnv = arg.slice('--token-env='.length);
    } else if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg.startsWith('--request=')) {
      options.requestPath = arg.slice('--request='.length);
    } else if (arg.startsWith('--emulator-seed=')) {
      options.emulatorSeed = Number(arg.slice('--emulator-seed='.length));
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

function createProviderReport({ request, rawResponse }) {
  if (isGniProviderPendingResponse(rawResponse)) {
    return {
      status: 'provider_pending',
      providerJob: rawResponse.providerJob ?? null,
      directive: null,
      firebreakTrace: null,
      errors: rawResponse.providerJob ? [] : ['provider pending response did not include providerJob']
    };
  }
  if (!rawResponse) {
    return {
      status: 'provider_empty',
      providerJob: null,
      directive: null,
      firebreakTrace: null,
      errors: []
    };
  }

  return createDirectiveReport({ source: 'provider', request, rawResponse });
}

function createDirectiveReport({ source, request, rawResponse }) {
  const firebreak = applyGniFirebreak({ rawDirective: rawResponse, request, source });
  const validation = validateDirective(firebreak.directive);

  return {
    status: validation.valid ? 'directive_ready' : 'invalid_directive',
    providerJob: null,
    directive: firebreak.directive,
    firebreakTrace: firebreak.trace,
    errors: validation.errors
  };
}

function compareDirectives(emulatorDirective, providerDirective) {
  const dreamWeightDeltas = compareNumberMap(
    emulatorDirective.dreamWeightDeltas,
    providerDirective.dreamWeightDeltas
  );
  const maskPressure = compareNumberMap(
    emulatorDirective.maskPressure,
    providerDirective.maskPressure
  );
  const pacingDelta = compareNumberMap(
    emulatorDirective.pacingDelta,
    providerDirective.pacingDelta
  );
  const symbolEchoes = compareStringList(
    emulatorDirective.symbolEchoes,
    providerDirective.symbolEchoes
  );
  const matches = dreamWeightDeltas.matches
    && maskPressure.matches
    && pacingDelta.matches
    && symbolEchoes.matches;

  return {
    matches,
    dreamWeightDeltas,
    symbolEchoes,
    maskPressure,
    pacingDelta
  };
}

function compareNumberMap(emulator = {}, provider = {}) {
  const emulatorKeys = new Set(Object.keys(emulator ?? {}));
  const providerKeys = new Set(Object.keys(provider ?? {}));
  const shared = [...emulatorKeys].filter((key) => providerKeys.has(key)).sort();
  const changed = shared
    .filter((key) => emulator[key] !== provider[key])
    .map((key) => ({ key, emulator: emulator[key], provider: provider[key] }));
  const onlyEmulator = [...emulatorKeys].filter((key) => !providerKeys.has(key)).sort();
  const onlyProvider = [...providerKeys].filter((key) => !emulatorKeys.has(key)).sort();

  return {
    matches: changed.length === 0 && onlyEmulator.length === 0 && onlyProvider.length === 0,
    shared,
    changed,
    onlyEmulator,
    onlyProvider
  };
}

function compareStringList(emulator = [], provider = []) {
  const emulatorSet = new Set(emulator ?? []);
  const providerSet = new Set(provider ?? []);
  const shared = [...emulatorSet].filter((value) => providerSet.has(value)).sort();
  const onlyEmulator = [...emulatorSet].filter((value) => !providerSet.has(value)).sort();
  const onlyProvider = [...providerSet].filter((value) => !emulatorSet.has(value)).sort();

  return {
    matches: onlyEmulator.length === 0 && onlyProvider.length === 0,
    shared,
    onlyEmulator,
    onlyProvider
  };
}

async function loadRequestFromPath(path) {
  if (!path) {
    return createDefaultGniContractRequest();
  }
  return JSON.parse(await readFile(path, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseGniProviderCompareArgs(process.argv.slice(2));
  if (!options.endpoint) {
    console.error('Usage: node src/gniProviderCompare.js --endpoint=<url> [--token-env=GNI_API_KEY] [--request=<gni_request.json>] [--timeout-ms=10000] [--emulator-seed=777] [--json]');
    process.exit(1);
  }

  const tokenEnv = options.tokenEnv ?? 'GNI_API_KEY';
  const report = await compareGniProvider({
    endpoint: options.endpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: options.timeoutMs ?? 10000,
    emulatorSeed: options.emulatorSeed ?? 777,
    request: await loadRequestFromPath(options.requestPath)
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`GNI provider comparison: ${report.ok ? 'ok' : 'failed'}`);
    console.log(`Endpoint: ${report.endpoint}`);
    console.log(`Request valid: ${report.request.valid}`);
    console.log(`Emulator status: ${report.emulator?.status ?? 'none'}`);
    console.log(`Provider status: ${report.provider?.status ?? 'none'}`);
    if (report.diff) {
      console.log(`Directive match: ${report.diff.matches}`);
      console.log(`Dream weight changes: ${report.diff.dreamWeightDeltas.changed.length}`);
      console.log(`Provider-only symbols: ${report.diff.symbolEchoes.onlyProvider.join(', ') || 'none'}`);
      console.log(`Emulator-only symbols: ${report.diff.symbolEchoes.onlyEmulator.join(', ') || 'none'}`);
    }
    const errors = [
      ...(report.request.errors ?? []),
      ...(report.emulator?.errors ?? []),
      ...(report.provider?.errors ?? [])
    ];
    if (errors.length > 0) {
      console.log(`Errors: ${JSON.stringify(errors)}`);
    }
  }

  if (!report.ok) {
    process.exit(1);
  }
}
