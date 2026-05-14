import test from 'node:test';
import assert from 'node:assert/strict';

import { validateProjectContent } from '../src/contentValidator.js';

test('content validator reports duplicate IDs and missing symbolic tags', () => {
  const result = validateProjectContent({
    archetypes: ['Seeker'],
    symbolLexicon: [
      { id: 'mirror', domain: 'reflection', note: 'Mirror.' },
      { id: 'mirror', domain: 'duplicate', note: 'Duplicate.' }
    ],
    toolSigils: [{ id: 'key', name: 'Key', effect: 'open' }],
    dreamModules: [
      {
        id: 'repeat',
        name: 'Repeat One',
        symbolicTags: [],
        baseWeight: 1,
        archetypeAffinities: {},
        vibeAffinities: {}
      },
      {
        id: 'repeat',
        name: 'Repeat Two',
        symbolicTags: ['mirror'],
        baseWeight: 1,
        archetypeAffinities: {},
        vibeAffinities: {}
      }
    ],
    masks: []
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.includes('symbols.mirror is duplicated'), true);
  assert.equal(result.errors.includes('dreamModules.repeat is duplicated'), true);
  assert.equal(result.errors.includes('dreamModules.repeat must define at least one symbolic tag'), true);
});
