import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHETYPES } from '../src/constants.js';
import {
  validateDirective,
  validateGniBridgeResult,
  validateGniProcessingRequest,
  validateSessionBundle
} from '../src/contracts.js';
import { loadBundledContentCatalog, validateContentCatalog } from '../src/contentCatalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('JSON catalogs match runtime constants used by the prototype', async () => {
  const archetypes = await readJson('data/archetypes.json');
  const dreamModules = await readJson('data/dream_modules.json');
  const masks = await readJson('data/masks.json');
  const symbols = await readJson('data/symbols.json');
  const tools = await readJson('data/tool_sigils.json');

  assert.deepEqual(archetypes.archetypes, ARCHETYPES);
  const catalog = loadBundledContentCatalog();
  const validation = validateContentCatalog(catalog);

  assert.deepEqual(dreamModules.modules.map((module) => module.id), catalog.dreamModules.map((module) => module.id));
  assert.deepEqual(masks.masks.map((mask) => mask.id), catalog.masks.map((mask) => mask.id));
  assert.deepEqual(symbols.symbols.map((symbol) => symbol.id), catalog.symbolLexicon.map((symbol) => symbol.id));
  assert.deepEqual(tools.tool_sigils.map((tool) => tool.id), catalog.toolSigils.map((tool) => tool.id));
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test('session bundle validation reports missing GNI handoff fields', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    sessionId: 'session-one',
    dominantArchetype: 'Seeker'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'schemaVersion must be 1',
    'coherence is required',
    'vibeState is required',
    'recentSymbols must be an array',
    'recentActions must be an array',
    'roomConfigSnapshot is required',
    'archetypeVector is required'
  ]);
});

test('session bundle validation accepts compact Witness handoff data', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.5,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { awakened: true },
    archetypeVector: { Seeker: 1 }
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('GNI directive validation catches unsafe provider output before normalization', () => {
  const result = validateDirective({
    schema: 'JungialDirectiveV1',
    schemaVersion: 1,
    dreamWeightDeltas: { garden: 9 },
    symbolEchoes: ['mirror', ''],
    pacingDelta: { noise: 1 }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'dreamWeightDeltas.garden must be between -0.95 and 2',
    'pacingDelta.noise is not allowed',
    'symbolEchoes[1] must be a non-empty string'
  ]);
});

test('GNI request and bridge result validation accept provider-ready contracts', () => {
  const request = {
    schema: 'GniProcessingRequestV1',
    schemaVersion: 1,
    provider: 'GNI',
    endpoint: 'gni://local-dev-placeholder',
    model: 'gni-dream-director-dev',
    contract: {
      inputFormat: 'SessionBundleV1',
      outputFormat: 'JungialDirectiveV1',
      allowedDirectives: ['adjust_dream_weights']
    },
    payload: {
      schema: 'SessionBundleV1',
      schemaVersion: 1,
      sessionId: 'session-one',
      dominantArchetype: 'Seeker',
      coherence: 0.6,
      vibeState: 'calm_hopeful_boundless_bright_warm',
      recentSymbols: ['portal'],
      recentActions: ['open_portal'],
      roomConfigSnapshot: { portalOpen: true },
      selectedDream: { id: 'garden' },
      archetypeVector: { Seeker: 1 }
    }
  };
  const bridgeResult = {
    schema: 'GniBridgeResultV1',
    status: 'directive_ready',
    source: 'provider',
    request,
    rawResponse: { dreamWeightDeltas: { garden: 0.2 } },
    directive: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: { garden: 0.2 },
      symbolEchoes: [],
      maskPressure: {},
      pacingDelta: {}
    },
    errors: []
  };

  assert.deepEqual(validateGniProcessingRequest(request), { valid: true, errors: [] });
  assert.deepEqual(validateGniBridgeResult(bridgeResult), { valid: true, errors: [] });
});

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}
