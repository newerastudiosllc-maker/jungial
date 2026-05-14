import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createSystemClock } from './clock.js';

export class TraceRecorder {
  constructor({ clock = createSystemClock(), runId = clock.nextId('trace') } = {}) {
    this.clock = clock;
    this.runId = runId;
    this.entries = [];
  }

  record(type, payload = {}) {
    const entry = {
      index: this.entries.length + 1,
      at: this.clock.nowIso(),
      type,
      payload: sanitizePayload(payload)
    };
    this.entries.push(entry);
    return entry;
  }

  snapshot() {
    return {
      schema: 'JungialTraceV1',
      runId: this.runId,
      entries: this.entries.map((entry) => ({
        index: entry.index,
        at: entry.at,
        type: entry.type,
        payload: structuredClone(entry.payload)
      }))
    };
  }
}

export async function writeTrace(path, traceSnapshot) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(traceSnapshot, null, 2)}\n`, 'utf8');
}

function sanitizePayload(payload) {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }
  return structuredClone(payload);
}
