export class GniHttpProvider {
  constructor({
    endpoint,
    bearerToken = '',
    timeoutMs = 10000,
    fetchImpl = globalThis.fetch
  } = {}) {
    if (!endpoint) {
      throw new Error('GniHttpProvider requires an endpoint');
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('GniHttpProvider requires a fetch implementation');
    }

    this.endpoint = endpoint;
    this.bearerToken = bearerToken;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async processRequest(request) {
    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify(request),
      signal: createTimeoutSignal(this.timeoutMs)
    });

    if (!response.ok) {
      const body = typeof response.text === 'function' ? await response.text() : '';
      throw new Error(`GNI HTTP provider failed with ${response.status}: ${body}`.trim());
    }

    if (response.status === 202) {
      const body = typeof response.json === 'function' ? await response.json() : {};
      return {
        schema: 'GniProviderPendingV1',
        status: 'pending',
        providerJob: normalizeProviderJob(body)
      };
    }

    if (response.status === 204) {
      return null;
    }

    if (typeof response.json !== 'function') {
      throw new Error('GNI HTTP provider response did not expose json()');
    }

    return response.json();
  }

  async pollJob(providerJob) {
    if (!providerJob?.statusUrl) {
      throw new Error('GNI HTTP provider job polling requires providerJob.statusUrl');
    }

    const response = await this.fetchImpl(providerJob.statusUrl, {
      method: 'GET',
      headers: this.#headers(),
      signal: createTimeoutSignal(this.timeoutMs)
    });

    if (!response.ok) {
      const body = typeof response.text === 'function' ? await response.text() : '';
      throw new Error(`GNI HTTP provider job poll failed with ${response.status}: ${body}`.trim());
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
      throw new Error('GNI HTTP provider job response did not expose json()');
    }

    return response.json();
  }

  #headers() {
    const headers = {
      accept: 'application/json',
      'content-type': 'application/json'
    };

    if (this.bearerToken) {
      headers.authorization = `Bearer ${this.bearerToken}`;
    }

    return headers;
  }
}

function normalizeProviderJob(body = {}) {
  const id = body.jobId ?? body.id ?? null;
  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  const job = {
    id: id.trim()
  };

  if (typeof body.statusUrl === 'string' && body.statusUrl.trim().length > 0) {
    job.statusUrl = body.statusUrl.trim();
  }
  if (Number.isFinite(body.pollAfterMs)) {
    job.pollAfterMs = Math.max(0, Math.round(body.pollAfterMs));
  }

  return job;
}

function createTimeoutSignal(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
}
