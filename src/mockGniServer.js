import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { normalizeDirective } from './contracts.js';

export function createMockGniServer({
  host = '127.0.0.1',
  port = 0,
  mode = 'directive',
  directive = {},
  readyAfterPolls = 1
} = {}) {
  let server = null;
  let url = null;
  let nextJobNumber = 1;
  const jobs = new Map();

  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url, url ?? `http://${host}:${port}`);

    if (request.method === 'POST' && requestUrl.pathname === '/gni') {
      const payload = await readJsonBody(request);
      if (!payload || payload.schema !== 'GniProcessingRequestV1') {
        return sendJson(response, 400, {
          error: 'expected GniProcessingRequestV1'
        });
      }

      const normalizedDirective = normalizeDirective(directive);
      if (mode === 'async') {
        const jobId = `gni-job-${String(nextJobNumber).padStart(3, '0')}`;
        nextJobNumber += 1;
        jobs.set(jobId, {
          request: payload,
          directive: normalizedDirective,
          pollCount: 0
        });
        return sendJson(response, 202, {
          jobId,
          statusUrl: `${url}/jobs/${jobId}`,
          pollAfterMs: 0
        });
      }

      return sendJson(response, 200, normalizedDirective);
    }

    if (request.method === 'GET' && requestUrl.pathname.startsWith('/jobs/')) {
      const jobId = requestUrl.pathname.slice('/jobs/'.length);
      const job = jobs.get(jobId);
      if (!job) {
        return sendJson(response, 404, {
          error: 'job not found'
        });
      }
      job.pollCount += 1;

      if (job.pollCount < Math.max(1, readyAfterPolls)) {
        return sendJson(response, 200, {
          schema: 'GniProviderJobStatusV1',
          status: 'pending',
          jobId,
          statusUrl: `${url}/jobs/${jobId}`,
          pollAfterMs: 0
        });
      }

      return sendJson(response, 200, {
        schema: 'GniProviderJobStatusV1',
        status: 'ready',
        jobId,
        directive: job.directive
      });
    }

    return sendJson(response, 404, {
      error: 'not found'
    });
  }

  return {
    get url() {
      return url;
    },
    async start() {
      if (server) {
        return this;
      }
      server = createServer((request, response) => {
        handleRequest(request, response).catch((error) => {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error)
          });
        });
      });
      await new Promise((resolve) => server.listen(port, host, resolve));
      const address = server.address();
      url = `http://${address.address}:${address.port}`;
      return this;
    },
    async stop() {
      if (!server) {
        return;
      }
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      server = null;
      url = null;
    }
  };
}

export function parseMockGniServerArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--host=')) {
      options.host = arg.slice('--host='.length);
    } else if (arg.startsWith('--port=')) {
      options.port = Number(arg.slice('--port='.length));
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length);
    } else if (arg.startsWith('--directive=')) {
      options.directivePath = arg.slice('--directive='.length);
    } else if (arg.startsWith('--ready-after-polls=')) {
      options.readyAfterPolls = Number(arg.slice('--ready-after-polls='.length));
    }
  }
  return options;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json'
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseMockGniServerArgs(process.argv.slice(2));
  const directive = options.directivePath
    ? JSON.parse(await readFile(options.directivePath, 'utf8'))
    : {
        dreamWeightDeltas: { white_void: 0.1 },
        symbolEchoes: ['threshold'],
        pacingDelta: { silence: 0.05 }
      };
  const mock = createMockGniServer({
    host: options.host,
    port: options.port ?? 8787,
    mode: options.mode ?? 'directive',
    directive,
    readyAfterPolls: options.readyAfterPolls ?? 1
  });

  await mock.start();
  console.log(`Mock GNI server listening at ${mock.url}/gni`);
}
