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

    if (typeof response.json !== 'function') {
      throw new Error('GNI HTTP provider response did not expose json()');
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

function createTimeoutSignal(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(timeoutMs);
}
