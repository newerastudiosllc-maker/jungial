import test from 'node:test';
import assert from 'node:assert/strict';

import { loadBundledContentCatalog } from '../src/contentCatalog.js';
import { createRuntimeReadinessReport } from '../src/runtimeReadiness.js';
import { validateRuntimeReadiness } from '../src/contracts.js';

test('RuntimeReadinessV1 reports playable startup with optional GNI degradation', () => {
  const report = createRuntimeReadinessReport({
    catalog: loadBundledContentCatalog(),
    gniEndpoint: 'gni://local-dev-placeholder',
    platformTargets: ['node_prototype', 'ue5', 'vr', 'console']
  });

  assert.equal(report.schema, 'RuntimeReadinessV1');
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.status, 'degraded');
  assert.equal(report.canStartSession, true);
  assert.equal(report.blockedCount, 0);
  assert.equal(report.degradedCount, 1);
  assert.deepEqual(report.platformTargets, ['node_prototype', 'ue5', 'vr', 'console']);
  assert.equal(report.capabilities.thresholdChamber, true);
  assert.equal(report.capabilities.sessionFrame, true);
  assert.equal(report.capabilities.asyncGniQueue, true);
  assert.equal(report.contracts.includes('SessionFrameV1'), true);

  const contentCheck = report.checks.find((check) => check.id === 'content.catalog');
  const gniCheck = report.checks.find((check) => check.id === 'gni.provider');
  assert.equal(contentCheck.status, 'ready');
  assert.equal(contentCheck.severity, 'required');
  assert.equal(contentCheck.details.dreamModules, 5);
  assert.equal(gniCheck.status, 'degraded');
  assert.equal(gniCheck.severity, 'optional');
  assert.equal(gniCheck.details.mode, 'placeholder');
  assert.equal(report.playerFacingText, null);
  assert.deepEqual(validateRuntimeReadiness(report), { valid: true, errors: [] });
});

test('RuntimeReadinessV1 blocks startup when required content is invalid', () => {
  const report = createRuntimeReadinessReport({
    catalog: {
      archetypes: ['Seeker'],
      symbolLexicon: [{ id: 'known-symbol' }],
      toolSigils: [],
      dreamModules: [{
        id: 'broken_dream',
        name: 'Broken Dream',
        symbolicTags: ['unknown-symbol'],
        archetypeAffinities: { Unknown: 1 },
        vibeAffinities: {},
        baseWeight: 0
      }],
      masks: [],
      passages: []
    },
    gniEndpoint: 'https://gni.local/process'
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.canStartSession, false);
  assert.equal(report.blockedCount, 1);
  assert.equal(report.degradedCount, 0);
  const contentCheck = report.checks.find((check) => check.id === 'content.catalog');
  assert.equal(contentCheck.status, 'blocked');
  assert.match(contentCheck.details.errors.join('\n'), /unknown symbolic tag/);
  assert.match(contentCheck.details.errors.join('\n'), /positive baseWeight/);
  assert.deepEqual(validateRuntimeReadiness(report), { valid: true, errors: [] });
});

test('RuntimeReadinessV1 stays internal and rejects malformed readiness reports', () => {
  const report = createRuntimeReadinessReport({
    catalog: loadBundledContentCatalog(),
    gniEndpoint: 'https://gni.local/process'
  });

  assert.equal(report.status, 'ready');
  assert.equal(report.degradedCount, 0);
  assert.equal(report.checks.find((check) => check.id === 'gni.provider').details.mode, 'http');

  const invalid = validateRuntimeReadiness({
    ...report,
    status: 'glowing',
    playerFacingText: 'show this to the player',
    checks: [
      {
        id: '',
        status: 'maybe',
        severity: 'required',
        summary: '',
        details: [],
        errors: ['']
      }
    ]
  });

  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.errors, [
    'status must be one of ready, degraded, blocked',
    'checks[0].id is required',
    'checks[0].status must be one of ready, degraded, blocked',
    'checks[0].summary is required',
    'checks[0].details must be an object',
    'checks[0].errors[0] must be a non-empty string',
    'playerFacingText must be null'
  ]);
});
