import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHETYPES } from '../src/constants.js';
import { validateSessionBundle } from '../src/contracts.js';
import { loadBundledContentCatalog, validateContentCatalog } from '../src/contentCatalog.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('JSON catalogs match runtime constants used by the prototype', async () => {
  const archetypes = await readJson('data/archetypes.json');
  const dreamModules = await readJson('data/dream_modules.json');
  const masks = await readJson('data/masks.json');
  const tools = await readJson('data/tool_sigils.json');

  assert.deepEqual(archetypes.archetypes, ARCHETYPES);
  const catalog = loadBundledContentCatalog();
  const validation = validateContentCatalog(catalog);

  assert.deepEqual(dreamModules.modules.map((module) => module.id), catalog.dreamModules.map((module) => module.id));
  assert.deepEqual(masks.masks.map((mask) => mask.id), catalog.masks.map((mask) => mask.id));
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

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}
