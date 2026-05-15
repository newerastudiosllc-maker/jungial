import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SESSION_SHAPE_IDS,
  createSessionCovenantFromShape,
  createSessionShapeSelection,
  listSessionShapes
} from '../src/sessionShape.js';
import { validateSessionShapeSelection } from '../src/contracts.js';

test('session shapes expose bounded tone choices without player-facing mechanics', () => {
  const shapes = listSessionShapes();

  assert.deepEqual(SESSION_SHAPE_IDS, ['quiet_lantern', 'strange_threshold', 'dark_mirror', 'nightmare_veil']);
  assert.equal(shapes.length, 4);
  assert.equal(shapes[0].id, 'quiet_lantern');
  assert.equal(shapes[0].playerFacingText, null);
  assert.equal(JSON.stringify(shapes).includes('score'), false);
  assert.equal(JSON.stringify(shapes).includes('diagnosis'), false);
});

test('session shape selection creates a covenant for gentle or horrific sessions', () => {
  const gentle = createSessionShapeSelection({ shapeId: 'quiet_lantern' });
  const nightmare = createSessionShapeSelection({ shapeId: 'nightmare_veil' });

  assert.equal(gentle.schema, 'SessionShapeSelectionV1');
  assert.equal(gentle.shapeId, 'quiet_lantern');
  assert.equal(gentle.covenant.schema, 'SessionCovenantV1');
  assert.equal(gentle.covenant.intensityCeiling, 0.28);
  assert.equal(gentle.covenant.toneTags.includes('friendly'), true);
  assert.equal(gentle.covenant.hardBoundaryTags.includes('real_world_self_harm'), true);
  assert.equal(gentle.playerFacingText, null);

  assert.equal(nightmare.shapeId, 'nightmare_veil');
  assert.equal(nightmare.covenant.intensityCeiling, 0.78);
  assert.equal(nightmare.covenant.toneTags.includes('horrific'), true);
  assert.equal(nightmare.covenant.allowedPressureTags.includes('shadow'), true);
  assert.deepEqual(validateSessionShapeSelection(nightmare), { valid: true, errors: [] });
});

test('session shape overrides can lower intensity and add boundaries without storing raw input', () => {
  const selection = createSessionShapeSelection({
    shapeId: 'nightmare_veil',
    overrides: {
      intensityCeiling: 0.4,
      hardBoundaryTags: ['body_horror'],
      softBoundaryTags: ['teeth'],
      returnAnchor: { kind: 'image', value: 'small lamp' },
      rawSpeech: 'do not store this'
    }
  });

  assert.equal(selection.covenant.intensityCeiling, 0.4);
  assert.equal(selection.covenant.hardBoundaryTags.includes('real_world_self_harm'), true);
  assert.equal(selection.covenant.hardBoundaryTags.includes('body_horror'), true);
  assert.equal(selection.covenant.softBoundaryTags.includes('teeth'), true);
  assert.deepEqual(selection.covenant.returnAnchor, { kind: 'image', value: 'small lamp' });
  assert.equal(JSON.stringify(selection).includes('do not store this'), false);
  assert.equal(JSON.stringify(selection).includes('rawSpeech'), false);
});

test('unknown session shape falls back to the quiet lantern', () => {
  const selection = createSessionShapeSelection({ shapeId: 'unknown_shape' });
  const covenant = createSessionCovenantFromShape({ shapeId: 'unknown_shape' });

  assert.equal(selection.source, 'fallback');
  assert.equal(selection.shapeId, 'quiet_lantern');
  assert.equal(covenant.intensityCeiling, 0.28);
});
