import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createDeterministicClock } from './clock.js';
import { GniHttpProvider } from './gniHttpProvider.js';
import { processSavedGniQueue } from './gniQueueProcessor.js';
import { loadGameState } from './persistence.js';
import { createMockGniServer } from './mockGniServer.js';
import { runSimulation } from './simulation.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const defaultDirective = Object.freeze({
  dreamWeightDeltas: {
    garden: 0.3
  },
  symbolEchoes: ['threshold'],
  pacingDelta: {
    silence: 0.05
  }
});

export async function runAsyncGniSmoke({
  seed = 777,
  savePath = join(root, 'saves', 'async-gni-smoke-session.json'),
  directive = defaultDirective,
  clock = createDeterministicClock({ startIso: '2060-03-01T00:00:00.000Z', stepMs: 1000 })
} = {}) {
  const mock = createMockGniServer({
    mode: 'async',
    directive
  });

  try {
    await mock.start();
    const provider = new GniHttpProvider({
      endpoint: `${mock.url}/gni`,
      timeoutMs: 5000
    });

    const simulation = await runSimulation({
      seed,
      savePath,
      gniProvider: provider,
      clock
    });
    const initialSave = await loadGameState(savePath);
    const queueProcess = await processSavedGniQueue({
      savePath,
      provider,
      clock
    });
    const finalSave = await loadGameState(savePath);

    return {
      schema: 'AsyncGniSmokeResultV1',
      mockEndpoint: `${mock.url}/gni`,
      savePath,
      simulation,
      initialSave,
      queueProcess,
      finalSave
    };
  } finally {
    await mock.stop();
  }
}

export function parseAsyncGniSmokeArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      options.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--save=')) {
      options.savePath = arg.slice('--save='.length);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseAsyncGniSmokeArgs(process.argv.slice(2));
  const clock = options.clockStartIso
    ? createDeterministicClock({
        startIso: options.clockStartIso,
        stepMs: options.clockStepMs ?? 1000
      })
    : undefined;
  const result = await runAsyncGniSmoke({
    seed: options.seed,
    savePath: options.savePath,
    clock
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const processed = result.queueProcess.processed.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Mock async GNI endpoint: ${result.mockEndpoint}`);
    console.log(`Initial queue pending: ${result.initialSave.gniQueue.pending.length}`);
    console.log(`Queue process status counts: ${JSON.stringify(processed)}`);
    console.log(`Final queue pending: ${result.finalSave.gniQueue.pending.length}`);
    console.log(`Final queue resolved: ${result.finalSave.gniQueue.resolved.length}`);
    console.log(`Saved session JSON to ${result.savePath}.`);
  }
}
