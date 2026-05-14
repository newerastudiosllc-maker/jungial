import { ArchitectState } from './ai.js';
import { callGniProvider } from './gniBridge.js';
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

function toArchitectState(input) {
  if (typeof input?.applyDirective === 'function' && typeof input?.snapshot === 'function') {
    return input;
  }
  return new ArchitectState(input ?? {});
}

function nowIso(clock) {
  return clock?.nowIso?.() ?? null;
}
