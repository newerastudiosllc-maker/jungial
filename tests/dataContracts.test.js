import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHETYPES } from '../src/constants.js';
import {
  validateDirective,
  validateEchoTrace,
  validateDreamerMemoryContext,
  validateDreamerProfile,
  validateGniBridgeResult,
  validateGniContractCheckReport,
  validateGniDirectiveQueue,
  validateGniQueueProcessResult,
  validateGniProcessingRequest,
  validatePassage,
  validateSaveGame,
  validateSessionCovenant,
  validateSessionBundle
} from '../src/contracts.js';
import { DreamerProfile } from '../src/dreamerProfile.js';
import { loadBundledContentCatalog, validateContentCatalog } from '../src/contentCatalog.js';
import { createSessionCovenant } from '../src/sessionCovenant.js';

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

test('session covenant validation accepts bounded session preferences', () => {
  const result = validateSessionCovenant(createSessionCovenant({
    toneTags: ['strange', 'dark'],
    intensityCeiling: 0.6,
    hardBoundaryTags: ['body_horror'],
    softBoundaryTags: ['teeth'],
    allowedPressureTags: ['shadow'],
    returnAnchor: { kind: 'image', value: 'small lamp' }
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session covenant validation rejects raw speech fields', () => {
  const result = validateSessionCovenant({
    ...createSessionCovenant(),
    rawSpeech: ['I should not be stored']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['covenant.rawSpeech is not allowed']);
});

test('Passage validation accepts dream-native content contracts', () => {
  const result = validatePassage({
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach', 'speak'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('EchoTrace validation accepts compact symbolic observation', () => {
  const result = validateEchoTrace({
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door', 'breath', 'threshold'],
    gestureTags: ['spoke_before_touching', 'speak'],
    tempo: 'hesitant_then_committed',
    pressureAccepted: 0.42,
    returnAnchorUsed: false,
    boundarySignals: ['long_pause'],
    dreamflowDeltas: {}
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session bundle validation checks optional covenant and Passage context', () => {
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
    archetypeVector: { Seeker: 1 },
    sessionCovenant: {
      ...createSessionCovenant(),
      intensityCeiling: 3
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionCovenant.intensityCeiling must be between 0 and 1'
  ]);
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

test('Dreamer profile and memory context validation accept redacted hidden memory', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one'
  });
  profile.recordSession({
    sessionBundle: {
      schema: 'SessionBundleV1',
      schemaVersion: 1,
      sessionId: 'session-one',
      dominantArchetype: 'Seeker',
      coherence: 0.6,
      vibeState: 'calm_hopeful_boundless_bright_warm',
      recentSymbols: ['portal'],
      recentActions: ['open_portal'],
      roomConfigSnapshot: { portalOpen: true },
      selectedDream: { id: 'garden', symbolicTags: ['growth'] },
      archetypeVector: { Seeker: 1 }
    }
  });

  assert.deepEqual(validateDreamerProfile(profile.snapshot()), { valid: true, errors: [] });
  assert.deepEqual(validateDreamerMemoryContext(profile.toGniMemoryContext({ slotId: 'slot-a' })), { valid: true, errors: [] });
});

test('Dreamer profile validation rejects raw private memory shapes', () => {
  const result = validateDreamerProfile({
    schema: 'DreamerProfileV1',
    schemaVersion: 1,
    profileId: 'dreamer-one',
    rootSeed: 'root-seed-one',
    createdAt: '2060-01-01T00:00:00.000Z',
    updatedAt: '2060-01-01T00:00:00.000Z',
    consent: { profileMemory: true, crossSaveEchoes: false },
    memory: {
      sessionCount: 1,
      symbols: { portal: { count: 0, weight: 1, lastSeenAt: null } },
      archetypes: {},
      actions: {},
      dreamModules: {},
      masks: {},
      vibeStates: {},
      lastSessionDigest: null,
      rawSpeech: ['I am afraid']
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'memory.rawSpeech is not allowed',
    'memory.symbols.portal.count must be a positive integer'
  ]);
});

test('GNI request validation checks optional Dreamer memory context', () => {
  const result = validateGniProcessingRequest({
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
      archetypeVector: { Seeker: 1 },
      dreamerMemoryContext: {
        schema: 'DreamerMemoryContextV1',
        schemaVersion: 1,
        profileId: null,
        slotId: '',
        saveMode: 'continue',
        sessionCount: 1,
        strongSymbols: [],
        recurringArchetypes: [],
        familiarMasks: [],
        familiarDreamModules: [],
        familiarActions: [],
        vibeEchoes: [],
        lastSessionDigest: null
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.dreamerMemoryContext.slotId is required'
  ]);
});

test('save game validation checks optional Dreamer profile payload', () => {
  const result = validateSaveGame({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {},
      dreamerProfile: {
        schema: 'DreamerProfileV1',
        schemaVersion: 1,
        profileId: '',
        rootSeed: 'root-seed-one',
        createdAt: '2080-01-01T00:00:00.000Z',
        updatedAt: '2080-01-01T00:00:00.000Z',
        consent: { profileMemory: true, crossSaveEchoes: false },
        memory: {
          sessionCount: 0,
          symbols: {},
          archetypes: {},
          actions: {},
          dreamModules: {},
          masks: {},
          vibeStates: {},
          lastSessionDigest: null
        }
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['payload.dreamerProfile.profileId is required']);
});

test('GNI contract check report validation accepts endpoint check summaries', () => {
  const result = validateGniContractCheckReport({
    schema: 'GniContractCheckReportV1',
    ok: true,
    endpoint: 'https://gni.local/process',
    request: {
      valid: true,
      errors: [],
      value: {
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
      }
    },
    response: {
      status: 'directive_ready',
      directive: {
        valid: true,
        errors: [],
        value: {
          schema: 'JungialDirectiveV1',
          schemaVersion: 1,
          dreamWeightDeltas: { garden: 0.2 },
          symbolEchoes: ['threshold'],
          maskPressure: {},
          pacingDelta: {}
        }
      },
      errors: []
    },
    job: null
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('GNI contract check report validation rejects impossible ok reports', () => {
  const result = validateGniContractCheckReport({
    schema: 'GniContractCheckReportV1',
    ok: true,
    endpoint: '',
    request: {
      valid: false,
      errors: [],
      value: {}
    },
    response: {
      status: 'provider_error',
      errors: []
    },
    job: {
      status: 'invalid_job_status',
      polls: 0,
      errors: []
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'endpoint is required',
    'request.errors must include details when request.valid is false',
    'response.errors must include details when status is provider_error',
    'job.polls must be a positive integer when job is present',
    'job.errors must include details when status is invalid_job_status',
    'ok cannot be true when request, response, or job failed'
  ]);
});

test('GNI bridge result validation rejects impossible status envelopes', () => {
  const request = validGniRequest();

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'directive_ready',
    source: 'provider',
    request,
    rawResponse: null,
    directive: null,
    errors: []
  }), {
    valid: false,
    errors: [
      'directive is required when status is directive_ready',
      'rawResponse is required when status is directive_ready'
    ]
  });

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'pending',
    source: 'none',
    request,
    rawResponse: null,
    directive: {
      schema: 'JungialDirectiveV1',
      schemaVersion: 1,
      dreamWeightDeltas: {},
      symbolEchoes: [],
      maskPressure: {},
      pacingDelta: {}
    },
    errors: []
  }), {
    valid: false,
    errors: ['directive must be null unless status is directive_ready']
  });

  assert.deepEqual(validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'provider_error',
    source: 'provider',
    request,
    rawResponse: null,
    directive: null,
    errors: []
  }), {
    valid: false,
    errors: ['errors must include provider error details']
  });
});

test('GNI provider job metadata validation rejects malformed async handles', () => {
  const request = validGniRequest();

  const bridgeResult = validateGniBridgeResult({
    schema: 'GniBridgeResultV1',
    status: 'provider_empty',
    source: 'provider',
    request,
    rawResponse: {
      schema: 'GniProviderPendingV1',
      status: 'pending',
      providerJob: { id: '' }
    },
    directive: null,
    providerJob: { id: '', pollAfterMs: -1 },
    errors: []
  });
  const queue = validateGniDirectiveQueue({
    schema: 'GniDirectiveQueueV1',
    pending: [{
      id: 'gni_pending_session-one',
      status: 'pending',
      reason: 'provider_empty',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      providerJob: { id: 'gni-job-001', pollAfterMs: -1 },
      request
    }],
    resolved: []
  });

  assert.deepEqual(bridgeResult.errors, [
    'providerJob.id is required',
    'providerJob.pollAfterMs must be a non-negative integer'
  ]);
  assert.deepEqual(queue.errors, [
    'pending[0].providerJob.pollAfterMs must be a non-negative integer'
  ]);
});

test('GNI directive queue validation accepts pending and resolved envelopes', () => {
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

  const queue = {
    schema: 'GniDirectiveQueueV1',
    pending: [{
      id: 'gni_pending_session-one',
      status: 'pending',
      reason: 'provider_empty',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      request
    }],
    resolved: [{
      id: 'gni_pending_session-one',
      status: 'resolved',
      reason: 'pending',
      attempts: 1,
      createdAt: null,
      updatedAt: null,
      resolvedAt: '2080-01-01T00:02:00.000Z',
      request,
      directive: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: { garden: 0.2 },
        symbolEchoes: ['light'],
        maskPressure: {},
        pacingDelta: {}
      }
    }]
  };

  assert.deepEqual(validateGniDirectiveQueue(queue), { valid: true, errors: [] });
});

test('GNI queue process result validation accepts processor output envelopes', () => {
  const queue = {
    schema: 'GniDirectiveQueueV1',
    pending: [],
    resolved: []
  };
  const result = {
    schema: 'GniDirectiveQueueProcessResultV1',
    processed: [{
      id: 'gni_pending_session-one',
      status: 'directive_ready',
      directive: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: { garden: 0.2 },
        symbolEchoes: ['threshold'],
        maskPressure: {},
        pacingDelta: {}
      },
      directiveUpdate: {
        adjustedWeights: { garden: 1.2 },
        symbolFrequency: { threshold: 1 },
        maskPressure: {},
        pacingProfile: { intensity: 0.2, repetition: 0.1, silence: 0.6 }
      },
      errors: []
    }],
    queue,
    architectState: {
      globalDreamWeights: { garden: 1.2 },
      symbolFrequency: { threshold: 1 },
      pacingProfile: { intensity: 0.2, repetition: 0.1, silence: 0.6 },
      futureDreamModuleWeights: {},
      maskPressure: {}
    }
  };

  assert.deepEqual(validateGniQueueProcessResult(result), { valid: true, errors: [] });
});

test('GNI queue process result validation rejects ready entries without directives', () => {
  const result = validateGniQueueProcessResult({
    schema: 'GniDirectiveQueueProcessResultV1',
    processed: [{
      id: 'gni_pending_session-one',
      status: 'directive_ready',
      errors: []
    }],
    queue: {
      schema: 'GniDirectiveQueueV1',
      pending: [],
      resolved: []
    },
    architectState: {}
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'processed[0].directive is required when status is directive_ready'
  ]);
});

test('save game validation rejects malformed trace payloads', () => {
  const result = validateSaveGame({
    schema: 'JungialSaveGame',
    version: 1,
    savedAt: '2080-01-01T00:00:00.000Z',
    migrations: [],
    payload: {
      room: {},
      archetypeState: {},
      feelingState: {},
      journal: {},
      architectState: {},
      trace: {
        schema: 'JungialTraceV1',
        runId: 'trace-one',
        entries: [{
          index: 0,
          at: '',
          type: '',
          payload: {}
        }]
      }
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'payload.trace.entries[0].index must be a positive integer',
    'payload.trace.entries[0].at must be a non-empty string',
    'payload.trace.entries[0].type must be a non-empty string'
  ]);
});

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

function validGniRequest() {
  return {
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
}
