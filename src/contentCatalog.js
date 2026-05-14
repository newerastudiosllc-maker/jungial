import { createRequire } from 'node:module';

import { ARCHETYPES, FEELING_AXES } from './constants.js';

const require = createRequire(import.meta.url);

export function loadBundledContentCatalog() {
  return normalizeContentCatalog({
    archetypes: require('../data/archetypes.json').archetypes,
    toolSigils: require('../data/tool_sigils.json').tool_sigils,
    dreamModules: require('../data/dream_modules.json').modules,
    masks: require('../data/masks.json').masks,
    symbolLexicon: require('../data/symbols.json').symbols,
    passages: require('../data/passages.json').passages
  });
}

export function normalizeContentCatalog(raw) {
  return {
    archetypes: [...(raw.archetypes ?? [])],
    symbolLexicon: (raw.symbolLexicon ?? raw.symbols ?? []).map((symbol) => ({
      id: symbol.id,
      domain: symbol.domain ?? 'uncategorized',
      note: symbol.note ?? ''
    })),
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
    })),
    passages: (raw.passages ?? []).map((passage) => ({
      id: passage.id,
      motifs: [...(passage.motifs ?? [])],
      pressureTags: [...(passage.pressureTags ?? passage.pressure_tags ?? [])],
      formTags: [...(passage.formTags ?? passage.form_tags ?? [])],
      intensityBand: passage.intensityBand ?? passage.intensity_band ?? 'strange',
      allowedResponseKinds: [...(passage.allowedResponseKinds ?? passage.allowed_response_kinds ?? [])],
      returnAnchorTags: [...(passage.returnAnchorTags ?? passage.return_anchor_tags ?? [])],
      variationFamily: passage.variationFamily ?? passage.variation_family ?? '',
      baseWeight: passage.baseWeight ?? passage.base_weight ?? 1
    }))
  };
}

export function validateContentCatalog(catalog) {
  const normalized = normalizeContentCatalog(catalog);
  const knownArchetypes = new Set(normalized.archetypes.length > 0 ? normalized.archetypes : ARCHETYPES);
  const knownAxes = new Set(FEELING_AXES);
  const knownSymbols = new Set(normalized.symbolLexicon.map((symbol) => symbol.id));
  const supportedIntensityBands = new Set(['gentle', 'strange', 'dark', 'horrific', 'abyssal']);
  const errors = [];

  for (const module of normalized.dreamModules) {
    if (knownSymbols.size > 0) {
      for (const symbol of module.symbolicTags) {
        if (!knownSymbols.has(symbol)) {
          errors.push(`dreamModules.${module.id} has unknown symbolic tag ${symbol}`);
        }
      }
    }

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

  for (const passage of normalized.passages) {
    if (knownSymbols.size > 0) {
      for (const motif of passage.motifs) {
        if (!knownSymbols.has(motif)) {
          errors.push(`passages.${passage.id} has unknown motif ${motif}`);
        }
      }
      for (const anchor of passage.returnAnchorTags) {
        if (!knownSymbols.has(anchor)) {
          errors.push(`passages.${passage.id} has unknown return anchor ${anchor}`);
        }
      }
    }
    if (!supportedIntensityBands.has(passage.intensityBand)) {
      errors.push(`passages.${passage.id} has unsupported intensity band ${passage.intensityBand}`);
    }
    if (!passage.variationFamily) {
      errors.push(`passages.${passage.id} variationFamily is required`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
