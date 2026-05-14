import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { ArchitectState } from './ai.js';
import { callGniProvider } from './gniBridge.js';
import { createDeterministicClock } from './clock.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { GniDirectiveQueue } from './gniQueue.js';
import { loadGameState, saveGameState } from './persistence.js';

export async function processPendingGniQueue({
  queueSnapshot,
  architectState = new ArchitectState(),
  provider = null,
  limit = Infinity,
  clock = null
} = {}) {
  const queue = new GniDirectiveQueue(queueSnapshot);
  const architect = toArchitectState(architectState);
  const processed = [];
  const pendingEntries = queue.snapshot().pending.slice(0, limit);

  for (const entry of pendingEntries) {
    if (!provider) {
      processed.push({
        id: entry.id,
        status: 'no_provider',
        errors: []
      });
      continue;
    }

    try {
      const rawResponse = await callGniProvider(provider, entry.request, entry.request.payload);
      if (!rawResponse) {
        queue.enqueue({ request: entry.request, reason: 'provider_empty', at: nowIso(clock) });
        processed.push({
          id: entry.id,
          status: 'provider_empty',
          errors: []
        });
        continue;
      }

      const resolved = queue.resolve(entry.id, rawResponse, { at: nowIso(clock) });
      const directiveUpdate = resolved.directive ? architect.applyDirective(resolved.directive) : null;
      processed.push({
        id: entry.id,
        status: 'directive_ready',
        directive: resolved.directive,
        directiveUpdate,
        errors: []
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queue.enqueue({ request: entry.request, reason: 'provider_error', at: nowIso(clock) });
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
  clock = null
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
    clock
  });

  const nextState = {
    ...state,
    gniQueue: result.queue,
    architectState: result.architectState,
    lastGniQueueProcessResult: result
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
      : null
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
