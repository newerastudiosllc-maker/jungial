import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { ArchitectState } from './ai.js';
import { callGniProvider, isGniProviderPendingResponse } from './gniBridge.js';
import { createDeterministicClock } from './clock.js';
import { applyGniFirebreak } from './gniFirebreak.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { GniDirectiveQueue } from './gniQueue.js';
import { loadGameState, saveGameState } from './persistence.js';
import { appendTraceEntry } from './trace.js';

export async function processPendingGniQueue({
  queueSnapshot,
  architectState = new ArchitectState(),
  provider = null,
  limit = Infinity,
  clock = null,
  jobFetchImpl = globalThis.fetch,
  jobPollTimeoutMs = 10000
} = {}) {
  const queue = new GniDirectiveQueue(queueSnapshot);
  const architect = toArchitectState(architectState);
  const processed = [];
  const pendingEntries = queue.snapshot().pending.slice(0, limit);

  for (const entry of pendingEntries) {
    try {
      const rawResponse = await resolvePendingEntry({
        entry,
        provider,
        jobFetchImpl,
        jobPollTimeoutMs
      });

      if (rawResponse === noProvider) {
        processed.push({
          id: entry.id,
          status: 'no_provider',
          errors: []
        });
        continue;
      }

      if (isGniProviderPendingResponse(rawResponse)) {
        queue.enqueue({
          request: entry.request,
          reason: 'provider_empty',
          at: nowIso(clock),
          providerJob: rawResponse.providerJob
        });
        processed.push({
          id: entry.id,
          status: 'provider_empty',
          providerJob: rawResponse.providerJob ?? null,
          errors: []
        });
        continue;
      }
      if (!rawResponse) {
        queue.enqueue({
          request: entry.request,
          reason: 'provider_empty',
          at: nowIso(clock),
          providerJob: entry.providerJob
        });
        processed.push({
          id: entry.id,
          status: 'provider_empty',
          providerJob: entry.providerJob ?? null,
          errors: []
        });
        continue;
      }

      const firebreak = applyGniFirebreak({
        rawDirective: rawResponse,
        request: entry.request,
        source: 'queue'
      });
      const resolved = queue.resolve(entry.id, firebreak.directive, {
        at: nowIso(clock),
        firebreakTrace: firebreak.trace
      });
      const directiveUpdate = resolved.directive ? architect.applyDirective(resolved.directive) : null;
      processed.push({
        id: entry.id,
        status: 'directive_ready',
        directive: resolved.directive,
        directiveUpdate,
        providerJob: entry.providerJob ?? null,
        firebreakTrace: firebreak.trace,
        errors: []
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queue.enqueue({
        request: entry.request,
        reason: 'provider_error',
        at: nowIso(clock),
        providerJob: entry.providerJob
      });
      processed.push({
        id: entry.id,
        status: 'provider_error',
        errors: [message]
      });
    }
  }

  return {
    schema: 'GniDirectiveQueueProcessResultV1',
    processed,
    queue: queue.snapshot(),
    architectState: architect.snapshot()
  };
}

export async function processSavedGniQueue({
  savePath,
  outputPath = savePath,
  provider = null,
  limit = Infinity,
  clock = null,
  jobFetchImpl = globalThis.fetch,
  jobPollTimeoutMs = 10000
} = {}) {
  if (!savePath) {
    throw new Error('processSavedGniQueue requires savePath');
  }

  const state = await loadGameState(savePath);
  const result = await processPendingGniQueue({
    queueSnapshot: state.gniQueue,
    architectState: state.architectState,
    provider,
    limit,
    clock,
    jobFetchImpl,
    jobPollTimeoutMs
  });

  let nextTrace = appendTraceEntry(state.trace, 'gni.queue.processed', summarizeQueueProcessForTrace(result), {
    clock: clock ?? undefined
  });
  for (const entry of result.processed) {
    if (entry.firebreakTrace?.changed) {
      nextTrace = appendTraceEntry(nextTrace, 'gni.firebreak.applied', {
        id: entry.id,
        source: entry.firebreakTrace.source,
        suppressedCounts: entry.firebreakTrace.suppressedCounts,
        clampCounts: entry.firebreakTrace.clampCounts,
        boundaryTags: entry.firebreakTrace.boundaryTags
      }, {
        clock: clock ?? undefined
      });
    }
  }

  const nextState = {
    ...state,
    gniQueue: result.queue,
    architectState: result.architectState,
    lastGniQueueProcessResult: result,
    trace: nextTrace
  };

  await saveGameState(outputPath, nextState, { clock });
  return {
    ...result,
    savePath: outputPath
  };
}

export function parseGniQueueProcessorArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--save=')) {
      options.savePath = arg.slice('--save='.length);
    } else if (arg.startsWith('--out=')) {
      options.outputPath = arg.slice('--out='.length);
    } else if (arg.startsWith('--gni-endpoint=')) {
      options.gniEndpoint = arg.slice('--gni-endpoint='.length);
    } else if (arg.startsWith('--gni-response=')) {
      options.gniResponsePath = arg.slice('--gni-response='.length);
    } else if (arg.startsWith('--gni-token-env=')) {
      options.gniTokenEnv = arg.slice('--gni-token-env='.length);
    } else if (arg.startsWith('--gni-timeout-ms=')) {
      options.gniTimeoutMs = Number(arg.slice('--gni-timeout-ms='.length));
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length));
    } else if (arg.startsWith('--clock-start=')) {
      options.clockStartIso = arg.slice('--clock-start='.length);
    } else if (arg.startsWith('--clock-step-ms=')) {
      options.clockStepMs = Number(arg.slice('--clock-step-ms='.length));
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

export function createGniQueueProviderFromOptions(options = {}) {
  if (!options.gniEndpoint) {
    return null;
  }

  const tokenEnv = options.gniTokenEnv ?? 'GNI_API_KEY';
  return new GniHttpProvider({
    endpoint: options.gniEndpoint,
    bearerToken: process.env[tokenEnv] ?? '',
    timeoutMs: options.gniTimeoutMs ?? 10000
  });
}

export async function loadGniQueueProviderFromOptions(options = {}) {
  if (options.gniResponsePath) {
    const directive = JSON.parse(await readFile(options.gniResponsePath, 'utf8'));
    return async () => structuredClone(directive);
  }

  return createGniQueueProviderFromOptions(options);
}

function toArchitectState(input) {
  if (typeof input?.applyDirective === 'function' && typeof input?.snapshot === 'function') {
    return input;
  }
  return new ArchitectState(input ?? {});
}

function nowIso(clock) {
  return clock?.nowIso?.() ?? null;
}

function summarizeQueueProcessForTrace(result) {
  return {
    processed: result.processed.map((entry) => ({
      id: entry.id,
      status: entry.status,
      providerJob: entry.providerJob ?? null
    })),
    statusCounts: result.processed.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] ?? 0) + 1;
      return acc;
    }, {}),
    pendingCount: result.queue.pending.length,
    resolvedCount: result.queue.resolved.length
  };
}

const noProvider = Symbol('noProvider');

async function resolvePendingEntry({
  entry,
  provider,
  jobFetchImpl,
  jobPollTimeoutMs
}) {
  if (entry.providerJob?.statusUrl) {
    return pollProviderJobStatus(entry.providerJob, {
      provider,
      fetchImpl: jobFetchImpl,
      timeoutMs: jobPollTimeoutMs
    });
  }

  if (!provider) {
    return noProvider;
  }

  return callGniProvider(provider, entry.request, entry.request.payload);
}

async function pollProviderJobStatus(providerJob, {
  provider = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000
} = {}) {
  const status = typeof provider?.pollJob === 'function'
    ? await provider.pollJob(providerJob)
    : await fetchProviderJobStatus(providerJob, { fetchImpl, timeoutMs });

  return normalizeProviderJobStatus(status, providerJob);
}

async function fetchProviderJobStatus(providerJob, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('GNI provider job polling requires a fetch implementation');
  }
  if (!providerJob?.statusUrl) {
    throw new Error('GNI provider job polling requires providerJob.statusUrl');
  }

  const response = await fetchImpl(providerJob.statusUrl, {
    method: 'GET',
    headers: {
      accept: 'application/json'
    },
    signal: createTimeoutSignal(timeoutMs)
  });

  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`GNI provider job poll failed with ${response.status}: ${body}`.trim());
  }

  if (response.status === 202 || response.status === 204) {
    return {
      schema: 'GniProviderJobStatusV1',
      status: 'pending',
      jobId: providerJob.id,
      providerJob
    };
  }

  if (typeof response.json !== 'function') {
    throw new Error('GNI provider job response did not expose json()');
  }

  return response.json();
}

function normalizeProviderJobStatus(status, fallbackProviderJob) {
  if (isGniProviderPendingResponse(status)) {
    return status;
  }
  if (!status) {
    return {
      schema: 'GniProviderPendingV1',
      status: 'pending',
      providerJob: fallbackProviderJob
    };
  }

  const state = typeof status.status === 'string' ? status.status.toLowerCase() : '';
  if (['pending', 'queued', 'processing', 'running', 'accepted'].includes(state)) {
    return {
      schema: 'GniProviderPendingV1',
      status: 'pending',
      providerJob: mergeProviderJob(fallbackProviderJob, status.providerJob ?? status)
    };
  }
  if (['ready', 'complete', 'completed', 'succeeded', 'success'].includes(state)) {
    const directive = status.directive ?? status.result ?? status.output ?? null;
    if (!directive) {
      throw new Error('GNI provider job reported ready without a directive');
    }
    return directive;
  }
  if (['error', 'failed', 'cancelled', 'canceled'].includes(state)) {
    throw new Error(status.error ?? status.message ?? `GNI provider job ${state}`);
  }

  return status;
}

function mergeProviderJob(fallbackProviderJob, update = {}) {
  const merged = {
    ...(fallbackProviderJob ?? {})
  };

  const id = update.jobId ?? update.id;
  if (typeof id === 'string' && id.trim().length > 0) {
    merged.id = id.trim();
  }
  if (typeof update.statusUrl === 'string' && update.statusUrl.trim().length > 0) {
    merged.statusUrl = update.statusUrl.trim();
  }
  if (Number.isFinite(update.pollAfterMs)) {
    merged.pollAfterMs = Math.max(0, Math.round(update.pollAfterMs));
  }

  return merged;
}

function createTimeoutSignal(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseGniQueueProcessorArgs(process.argv.slice(2));
  if (!options.savePath) {
    console.error('Usage: node src/gniQueueProcessor.js --save=<save.json> [--out=<save.json>] [--gni-response=<directive.json>] [--gni-endpoint=<url>] [--gni-token-env=GNI_API_KEY] [--limit=1] [--clock-start=<iso>] [--clock-step-ms=1000] [--json]');
    process.exit(1);
  }

  const result = await processSavedGniQueue({
    savePath: options.savePath,
    outputPath: options.outputPath ?? options.savePath,
    provider: await loadGniQueueProviderFromOptions(options),
    limit: options.limit ?? Infinity,
    clock: options.clockStartIso
      ? createDeterministicClock({ startIso: options.clockStartIso, stepMs: options.clockStepMs ?? 1000 })
      : null,
    jobPollTimeoutMs: options.gniTimeoutMs ?? 10000
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const counts = result.processed.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Processed ${result.processed.length} pending GNI request(s).`);
    console.log(`Status counts: ${JSON.stringify(counts)}`);
    console.log(`Saved session JSON to ${result.savePath}.`);
  }
}
