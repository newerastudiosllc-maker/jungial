import { normalizeDirective } from './contracts.js';

export class GniDirectiveQueue {
  constructor(snapshot = {}) {
    this.pending = (snapshot.pending ?? []).map((entry) => clone(entry));
    this.resolved = (snapshot.resolved ?? []).map((entry) => clone(entry));
  }

  enqueue({ request, reason = 'pending', at = null, providerJob = null } = {}) {
    const id = pendingIdFor(request);
    const existing = this.pending.find((entry) => entry.id === id);

    if (existing) {
      existing.reason = reason;
      existing.updatedAt = at;
      existing.attempts += 1;
      existing.providerJob = providerJob ? clone(providerJob) : existing.providerJob ?? null;
      return clone(existing);
    }

    const entry = {
      id,
      status: 'pending',
      reason,
      attempts: 1,
      createdAt: at,
      updatedAt: at,
      providerJob: providerJob ? clone(providerJob) : null,
      request: clone(request)
    };
    this.pending.push(entry);
    return clone(entry);
  }

  resolve(id, rawDirective, { at = null } = {}) {
    const index = this.pending.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return {
        status: 'missing',
        id,
        directive: null
      };
    }

    const [pending] = this.pending.splice(index, 1);
    const resolved = {
      ...pending,
      status: 'resolved',
      resolvedAt: at,
      directive: normalizeDirective(rawDirective)
    };
    this.resolved.push(resolved);

    return {
      status: 'resolved',
      id,
      directive: clone(resolved.directive)
    };
  }

  snapshot() {
    return {
      schema: 'GniDirectiveQueueV1',
      pending: this.pending.map((entry) => clone(entry)),
      resolved: this.resolved.map((entry) => clone(entry))
    };
  }
}

function pendingIdFor(request) {
  const sessionId = request?.payload?.sessionId ?? 'unknown';
  return `gni_pending_${sessionId}`;
}

function clone(value) {
  return structuredClone(value);
}
