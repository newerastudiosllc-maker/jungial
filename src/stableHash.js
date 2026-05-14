import { createHash } from 'node:crypto';

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

export function stableHash(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortKeys(nested)])
    );
  }
  return value;
}
