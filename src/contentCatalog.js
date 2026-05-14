import { createRequire } from 'node:module';

import { ARCHETYPES, FEELING_AXES } from './constants.js';

const require = createRequire(import.meta.url);

export function loadBundledContentCatalog() {
  return normalizeContentCatalog({
    archetypes: require('../data/archetypes.json').archetypes,
    toolSigils: require('../data/tool_sigils.json').tool_sigils,
    dreamModules: require('../data/dream_modules.json').modules,
    masks: require('../data/masks.json').masks
  });
}

export function normalizeContentCatalog(raw) {
  return {
    archetypes: [...(raw.archetypes ?? [])],
    toolSigils: (raw.toolSigils ?? []).map((tool) => ({
      id: tool.id,
      name: tool.name,
      effect: tool.effect
    })),
    dreamModules: (raw.dreamModules ?? []).map((module) => ({
      id: module.id,
      name: module.name,
      symbolicTags: [...(module.symbolicTags ?? module.symbolic_tags ?? [])],
      archetypeAffinities: { ...(module.archetypeAffinities ?? module.archetype_affinities ?? {}) },
      vibeAffinities: { ...(module.vibeAffinities ?? module.vibe_affinities ?? {}) },
      baseWeight: module.baseWeight ?? module.base_weight ?? 1
    })),
    masks: (raw.masks ?? []).map((mask) => ({
      id: mask.id,
      name: mask.name,
      archetypeTags: [...(mask.archetypeTags ?? mask.archetype_tags ?? [])],
      material: mask.material ?? mask.visual_material_placeholder,
      dialogueTone: mask.dialogueTone ?? mask.dialogue_tone_placeholder,
      minCoherence: mask.minCoherence ?? mask.min_coherence ?? 0
    }))
  };
}

export function validateContentCatalog(catalog) {
  const normalized = normalizeContentCatalog(catalog);
  const knownArchetypes = new Set(normalized.archetypes.length > 0 ? normalized.archetypes : ARCHETYPES);
  const knownAxes = new Set(FEELING_AXES);
  const errors = [];

  for (const module of normalized.dreamModules) {
    for (const archetype of Object.keys(module.archetypeAffinities)) {
      if (!knownArchetypes.has(archetype)) {
        errors.push(`dreamModules.${module.id} has unknown archetype affinity ${archetype}`);
      }
    }

    for (const axis of Object.keys(module.vibeAffinities)) {
      if (!knownAxes.has(axis)) {
        errors.push(`dreamModules.${module.id} has unknown vibe affinity ${axis}`);
      }
    }
  }

  for (const mask of normalized.masks) {
    for (const archetype of mask.archetypeTags) {
      if (!knownArchetypes.has(archetype)) {
        errors.push(`masks.${mask.id} has unknown archetype tag ${archetype}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
