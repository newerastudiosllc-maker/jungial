import { loadBundledContentCatalog, validateContentCatalog } from './contentCatalog.js';

export function validateProjectContent(catalog = loadBundledContentCatalog()) {
  const errors = [...validateContentCatalog(catalog).errors];
  collectDuplicateIds('toolSigils', catalog.toolSigils, errors);
  collectDuplicateIds('dreamModules', catalog.dreamModules, errors);
  collectDuplicateIds('masks', catalog.masks, errors);

  for (const module of catalog.dreamModules ?? []) {
    if (!Array.isArray(module.symbolicTags) || module.symbolicTags.length === 0) {
      errors.push(`dreamModules.${module.id} must define at least one symbolic tag`);
    }
    if (!Number.isFinite(module.baseWeight) || module.baseWeight <= 0) {
      errors.push(`dreamModules.${module.id} must define positive baseWeight`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function collectDuplicateIds(label, items = [], errors) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${label}.${item.id} is duplicated`);
    }
    seen.add(item.id);
  }
}

if (process.argv[1]?.endsWith('contentValidator.js')) {
  const result = validateProjectContent();
  if (result.valid) {
    console.log('Content catalog valid.');
  } else {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  }
}
