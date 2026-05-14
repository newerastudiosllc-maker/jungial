import { GniAdapter } from './ai.js';
import { validateSessionBundle } from './contracts.js';
import { GniEmulator } from './gniEmulator.js';

export class GniBridge {
  constructor({
    adapter = new GniAdapter(),
    provider = null,
    emulatorFactory = (seed) => new GniEmulator({ seed })
  } = {}) {
    this.adapter = adapter;
    this.provider = provider;
    this.emulatorFactory = emulatorFactory;
  }

  async processSessionBundle({
    sessionBundle,
    providedDirective = null,
    emulate = false,
    seed = 777
  } = {}) {
    const validation = validateSessionBundle(sessionBundle);
    if (!validation.valid) {
      return this.#result({
        status: 'invalid_session',
        source: 'none',
        errors: validation.errors
      });
    }

    const request = this.adapter.createProcessingRequest(sessionBundle);

    if (providedDirective) {
      return this.#directiveResult({
        request,
        source: 'provided',
        rawResponse: providedDirective
      });
    }

    if (this.provider) {
      try {
        const rawResponse = await callProvider(this.provider, request, sessionBundle);
        if (!rawResponse) {
          return this.#result({ request, status: 'provider_empty', source: 'provider' });
        }
        return this.#directiveResult({ request, source: 'provider', rawResponse });
      } catch (error) {
        return this.#result({
          request,
          status: 'provider_error',
          source: 'provider',
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    if (emulate) {
      const rawResponse = this.emulatorFactory(seed).processSessionBundle(sessionBundle);
      return this.#directiveResult({ request, source: 'emulator', rawResponse });
    }

    return this.#result({ request, status: 'pending', source: 'none' });
  }

  #directiveResult({ request, source, rawResponse }) {
    return this.#result({
      request,
      status: 'directive_ready',
      source,
      rawResponse,
      directive: this.adapter.parseDirective(rawResponse)
    });
  }

  #result({
    request = null,
    status,
    source,
    rawResponse = null,
    directive = null,
    errors = []
  }) {
    return {
      schema: 'GniBridgeResultV1',
      status,
      source,
      request,
      rawResponse,
      directive,
      errors
    };
  }
}

async function callProvider(provider, request, sessionBundle) {
  if (typeof provider === 'function') {
    return provider(request, sessionBundle);
  }
  if (typeof provider.processRequest === 'function') {
    return provider.processRequest(request);
  }
  if (typeof provider.processSessionBundle === 'function') {
    return provider.processSessionBundle(sessionBundle);
  }
  if (typeof provider.complete === 'function') {
    return provider.complete(request);
  }

  throw new Error('GNI provider must be a function or expose processRequest, processSessionBundle, or complete.');
}
