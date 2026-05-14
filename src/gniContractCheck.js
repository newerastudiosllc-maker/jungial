import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { GniAdapter } from './ai.js';
import { validateDirective, validateGniProcessingRequest } from './contracts.js';
import { isGniProviderPendingResponse } from './gniBridge.js';
import { GniHttpProvider } from './gniHttpProvider.js';

export async function checkGniContract({
  endpoint,
  bearerToken = '',
  timeoutMs = 10000,
  request = createDefaultGniContractRequest(),
  pollJob = true,
  maxPolls = 1,
  provider = null
} = {}) {
  const requestValidation = validateGniProcessingRequest(request);
  const report = {
    schema: 'GniContractCheckReportV1',
    ok: false,
    endpoint: endpoint ?? provider?.endpoint ?? null,
    request: {
      valid: requestValidation.valid,
      errors: requestValidation.errors,
      value: request
    },
    response: null,
    job: null
  };

  if (!requestValidation.valid) {
    return report;
  }

  const activeProvider = provider ?? new GniHttpProvider({ endpoint, bearerToken, timeoutMs });

  try {
    const rawResponse = await activeProvider.processRequest(request);
    report.response = contractResponseReport(rawResponse);

    if (report.response.status === 'provider_pending' && pollJob && report.response.providerJob?.statusUrl) {
      report.job = await pollProviderJobForContract({
        provider: activeProvider,
        providerJob: report.response.providerJob,
        maxPolls
      });
    }
  } catch (error) {
    report.response = {
      status: 'provider_error',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }

  report.ok = report.request.valid
    && responseContractOk(report.response)
    && (report.job === null || responseContractOk(report.job));
  return report;
}

export function createDefaultGniContractRequest() {
  return new GniAdapter().createProcessingRequest({
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'contract_check_session',
    dominantArchetype: 'Seeker',
    coherence: 0.6,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['threshold', 'portal'],
    recentActions: ['awaken_heartlight', 'open_portal'],
    roomConfigSnapshot: {
      note: 'the word',
      awakened: true,
      boundaryState: 'boundless',
      portalOpen: true
    },
    selectedDream: {
      id: 'garden',
      name: 'Garden',
      symbolicTags: ['growth', 'innocence', 'fertility', 'beauty']
    },
    archetypeVector: {
      Seeker: 1,
      Creator: 0.4,
      Sage: 0.2
    }
  });
}

export function parseGniContractCheckArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.slice('--endpoint='.length);
    } else if (arg.startsWith('--token-env=')) {
      options.tokenEnv = arg.slice('--token-env='.length);
    } else if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg.startsWith('--max-polls=')) {
      options.maxPolls = Number(arg.slice('--max-polls='.length));
    } else if (arg.startsWith('--request=')) {
      options.requestPath = arg.slice('--request='.length);
    } else if (arg === '--no-poll') {
      options.pollJob = false;
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

async function pollProviderJobForContract({
  provider,
  providerJob,
  maxPolls
}) {
  let lastReport = {
    status: 'provider_pending',
    polls: 0,
    providerJob,
    errors: []
  };

  for (let poll = 1; poll <= Math.max(0, maxPolls); poll += 1) {
    const status = await provider.pollJob(providerJob);
    lastReport = {
      ...contractJobStatusReport(status, providerJob),
      polls: poll
    };
    if (lastReport.status !== 'provider_pending') {
      break;
    }
  }

  return lastReport;
}

function contractResponseReport(rawResponse) {
  if (isGniProviderPendingResponse(rawResponse)) {
    return {
      status: 'provider_pending',
      providerJob: rawResponse.providerJob ?? null,
      errors: rawResponse.providerJob ? [] : ['provider pending response did not include providerJob']
    };
  }
  if (!rawResponse) {
    return {
      status: 'provider_empty',
      errors: []
    };
  }

  const directive = directiveContractReport(rawResponse);
  return {
    status: directive.valid ? 'directive_ready' : 'invalid_directive',
    directive,
    errors: directive.errors
  };
}

function contractJobStatusReport(status, fallbackProviderJob) {
  if (isGniProviderPendingResponse(status)) {
    return {
      status: 'provider_pending',
      providerJob: status.providerJob ?? fallbackProviderJob,
      errors: []
    };
  }

  const state = typeof status?.status === 'string' ? status.status.toLowerCase() : '';
  if (['pending', 'queued', 'processing', 'running', 'accepted'].includes(state)) {
    return {
      status: 'provider_pending',
      providerJob: mergeProviderJob(fallbackProviderJob, status),
      errors: []
    };
  }
  if (['ready', 'complete', 'completed', 'succeeded', 'success'].includes(state)) {
    const directive = directiveContractReport(status.directive ?? status.result ?? status.output);
    return {
      status: directive.valid ? 'directive_ready' : 'invalid_directive',
      providerJob: mergeProviderJob(fallbackProviderJob, status),
      directive,
      errors: directive.errors
    };
  }
  if (['error', 'failed', 'cancelled', 'canceled'].includes(state)) {
    return {
      status: 'provider_error',
      providerJob: mergeProviderJob(fallbackProviderJob, status),
      errors: [status.error ?? status.message ?? `GNI provider job ${state}`]
    };
  }

  const directive = directiveContractReport(status);
  return {
    status: directive.valid ? 'directive_ready' : 'invalid_job_status',
    providerJob: fallbackProviderJob,
    directive,
    errors: directive.valid ? [] : ['job status must be pending, ready, or failed', ...directive.errors]
  };
}

function directiveContractReport(value) {
  const validation = validateDirective(value);
  return {
    valid: validation.valid,
    errors: validation.errors,
    value
  };
}

function responseContractOk(response) {
  if (!response) {
    return false;
  }
  if (response.status === 'directive_ready') {
    return response.directive?.valid === true;
  }
  return ['provider_pending', 'provider_empty'].includes(response.status)
    && (response.errors?.length ?? 0) === 0;
}

function mergeProviderJob(fallbackProviderJob, update = {}) {
  return {
    ...(fallbackProviderJob ?? {}),
    ...(typeof update.jobId === 'string' ? { id: update.jobId } : {}),
    ...(typeof update.id === 'string' ? { id: update.id } : {}),
    ...(typeof update.statusUrl === 'string' ? { statusUrl: update.statusUrl } : {}),
    ...(Number.isFinite(update.pollAfterMs) ? { pollAfterMs: Math.max(0, Math.round(update.pollAfterMs)) } : {})
  };
}

async function loadRequestFromPath(path) {
  if (!path) {
    return createDefaultGniContractRequest();
  }
  return JSON.parse(await readFile(path, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseGniContractCheckArgs(process.argv.slice(2));
  if (!options.endpoint) {
    console.error('Usage: node src/gniContractCheck.js --endpoint=<url> [--token-env=GNI_API_KEY] [--request=<gni_request.json>] [--timeout-ms=10000] [--max-polls=1] [--no-poll] [--json]');
    process.exit(1);
  }

  const tokenEnv = options.tokenEnv ?? 'GNI_API_KEY';
  const report = await checkGniContract({
    endpoint: options.endpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: options.timeoutMs ?? 10000,
    request: await loadRequestFromPath(options.requestPath),
    pollJob: options.pollJob ?? true,
    maxPolls: options.maxPolls ?? 1
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`GNI contract check: ${report.ok ? 'ok' : 'failed'}`);
    console.log(`Endpoint: ${report.endpoint}`);
    console.log(`Request valid: ${report.request.valid}`);
    console.log(`Response status: ${report.response?.status ?? 'none'}`);
    if (report.response?.providerJob) {
      console.log(`Provider job: ${report.response.providerJob.id}`);
    }
    if (report.job) {
      console.log(`Job status after ${report.job.polls} poll(s): ${report.job.status}`);
    }
    const errors = [
      ...(report.request.errors ?? []),
      ...(report.response?.errors ?? []),
      ...(report.job?.errors ?? [])
    ];
    if (errors.length > 0) {
      console.log(`Errors: ${JSON.stringify(errors)}`);
    }
  }

  if (!report.ok) {
    process.exit(1);
  }
}
