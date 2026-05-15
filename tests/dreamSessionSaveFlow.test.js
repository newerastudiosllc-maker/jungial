import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createDeterministicClock } from '../src/clock.js';
import { loadGameState } from '../src/persistence.js';
import {
  parseDreamSessionSaveFlowArgs,
  resumeDreamSessionCheckpointRun,
  runDreamSessionCheckpointDemo,
  startDreamSessionCheckpointRun
} from '../src/dreamSessionSaveFlow.js';

test('dream session save flow pauses mid-dream and resumes through final return', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-dream-session-save-flow-'));
  const checkpointPath = join(dir, 'checkpoint.json');
  const finalPath = join(dir, 'final.json');

  try {
    const start = await startDreamSessionCheckpointRun({
      seed: 606,
      savePath: checkpointPath,
      maxBeats: 5,
      checkpointAfterBeats: 2,
      responses: [
        { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
        {
          kind: 'speak',
          gestureTags: ['answered'],
          pressureAccepted: 0.46,
          rawSpeech: 'do not save this first private phrase'
        }
      ],
      clock: createDeterministicClock({ startIso: '2095-01-01T00:00:00.000Z' })
    });
    const checkpointSave = await loadGameState(checkpointPath);
    const checkpointSerialized = JSON.stringify(checkpointSave);

    assert.equal(start.dreamSession.endedBecause, 'checkpoint');
    assert.equal(checkpointSave.dreamSessionCheckpoint.schema, 'DreamSessionCheckpointV1');
    assert.equal(checkpointSave.dreamSessionCheckpoint.completedBeats, 2);
    assert.equal(checkpointSave.journal.entries.length, 0);
    assert.equal(checkpointSave.lastSessionBundle, undefined);
    assert.equal(checkpointSerialized.includes('do not save this first private phrase'), false);
    assert.equal(checkpointSerialized.includes('rawSpeech'), false);

    const resumed = await resumeDreamSessionCheckpointRun({
      savePath: checkpointPath,
      outputPath: finalPath,
      responses: [
        { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
        {
          kind: 'return_anchor',
          gestureTags: ['touched_note'],
          pressureAccepted: 0.2,
          returnAnchorUsed: true,
          rawSpeech: 'do not save this second private phrase'
        }
      ],
      clock: createDeterministicClock({ startIso: '2095-01-02T00:00:00.000Z' })
    });
    const finalSave = await loadGameState(finalPath);
    const finalSerialized = JSON.stringify(finalSave);

    assert.equal(resumed.dreamSession.endedBecause, 'return_anchor');
    assert.equal(resumed.dreamSession.sessionId, start.dreamSession.sessionId);
    assert.equal(finalSave.dreamSessionCheckpoint.isComplete, true);
    assert.equal(finalSave.dreamSessionCheckpoint.completedBeats, 4);
    assert.equal(finalSave.journal.entries.length, 1);
    assert.match(finalSave.journal.entries[0].text, /I returned with/);
    assert.equal(finalSave.lastSessionBundle.schema, 'SessionBundleV1');
    assert.ok(Object.keys(finalSave.architectState.globalDreamWeights).length >= 1);
    assert.equal(finalSave.symbolGrammar.schema, 'SymbolGrammarSnapshotV1');
    assert.equal(finalSerialized.includes('do not save this second private phrase'), false);
    assert.equal(finalSerialized.includes('rawSpeech'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('dream session checkpoint demo writes both save files and reports a transcript', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-dream-session-demo-'));
  const checkpointPath = join(dir, 'checkpoint.json');
  const finalPath = join(dir, 'final.json');

  try {
    const result = await runDreamSessionCheckpointDemo({
      seed: 707,
      checkpointSavePath: checkpointPath,
      finalSavePath: finalPath,
      clock: createDeterministicClock({ startIso: '2096-01-01T00:00:00.000Z' })
    });
    const checkpointSave = await loadGameState(checkpointPath);
    const finalSave = await loadGameState(finalPath);

    assert.equal(result.checkpointSavePath, checkpointPath);
    assert.equal(result.finalSavePath, finalPath);
    assert.match(result.transcript.join('\n'), /Dream session checkpoint saved/);
    assert.match(result.transcript.join('\n'), /Journal of Mirrors/);
    assert.equal(checkpointSave.dreamSessionCheckpoint.isComplete, false);
    assert.equal(finalSave.dreamSessionCheckpoint.isComplete, true);
    assert.equal(finalSave.journal.entries.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resumed dream sessions queue pending GNI work after final return', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-dream-session-gni-pending-'));
  const checkpointPath = join(dir, 'checkpoint.json');
  const finalPath = join(dir, 'final.json');

  try {
    await startDreamSessionCheckpointRun({
      seed: 808,
      savePath: checkpointPath,
      maxBeats: 5,
      checkpointAfterBeats: 2,
      responses: [
        { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
        { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.46 }
      ],
      clock: createDeterministicClock({ startIso: '2098-01-01T00:00:00.000Z' })
    });

    const result = await resumeDreamSessionCheckpointRun({
      savePath: checkpointPath,
      outputPath: finalPath,
      gniProvider: async () => null,
      responses: [
        { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
        {
          kind: 'return_anchor',
          gestureTags: ['touched_note'],
          pressureAccepted: 0.2,
          returnAnchorUsed: true,
          rawSpeech: 'do not send this private return phrase'
        }
      ],
      clock: createDeterministicClock({ startIso: '2098-01-02T00:00:00.000Z' })
    });
    const saved = await loadGameState(finalPath);
    const serialized = JSON.stringify(saved);

    assert.equal(result.gniBridgeResult.status, 'provider_empty');
    assert.equal(saved.pendingGniRequest.schema, 'GniProcessingRequestV1');
    assert.equal(saved.gniBridgeResult.status, 'provider_empty');
    assert.equal(saved.gniQueue.pending.length, 1);
    assert.equal(saved.gniQueue.pending[0].reason, 'provider_empty');
    assert.equal(saved.gniQueue.pending[0].request.payload.sessionId, saved.lastSessionBundle.sessionId);
    assert.equal(saved.appliedGniDirective, null);
    assert.equal(serialized.includes('do not send this private return phrase'), false);
    assert.equal(serialized.includes('rawSpeech'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resumed dream sessions apply ready GNI directives after final return', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-dream-session-gni-directive-'));
  const checkpointPath = join(dir, 'checkpoint.json');
  const finalPath = join(dir, 'final.json');

  try {
    await startDreamSessionCheckpointRun({
      seed: 909,
      savePath: checkpointPath,
      maxBeats: 5,
      checkpointAfterBeats: 2,
      sessionCovenant: { intensityCeiling: 0.8 },
      responses: [
        { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 },
        { kind: 'speak', gestureTags: ['answered'], pressureAccepted: 0.46 }
      ],
      clock: createDeterministicClock({ startIso: '2099-01-01T00:00:00.000Z' })
    });

    const result = await resumeDreamSessionCheckpointRun({
      savePath: checkpointPath,
      outputPath: finalPath,
      sessionCovenant: { intensityCeiling: 0.8 },
      gniResponse: {
        schema: 'JungialDirectiveV1',
        schemaVersion: 1,
        dreamWeightDeltas: { garden: 0.4 },
        symbolEchoes: ['mirror'],
        maskPressure: { double: 0.2 },
        pacingDelta: { repetition: 0.2 }
      },
      responses: [
        { kind: 'wait', gestureTags: ['listened'], pressureAccepted: 0.3 },
        { kind: 'return_anchor', gestureTags: ['touched_note'], pressureAccepted: 0.2, returnAnchorUsed: true }
      ],
      clock: createDeterministicClock({ startIso: '2099-01-02T00:00:00.000Z' })
    });
    const saved = await loadGameState(finalPath);

    assert.equal(result.gniBridgeResult.source, 'provided');
    assert.equal(result.appliedGniDirective.schema, 'JungialDirectiveV1');
    assert.equal(saved.appliedGniDirective.dreamWeightDeltas.garden, 0.4);
    assert.equal(saved.architectState.globalDreamWeights.garden >= 1.4, true);
    assert.equal(saved.architectState.symbolFrequency.mirror, 1);
    assert.equal(saved.gniQueue.pending.length, 0);
    assert.equal(result.directiveUpdate.adjustedWeights.garden, saved.architectState.globalDreamWeights.garden);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('dream session checkpoint CLI args parse save paths and deterministic clock options', () => {
  const options = parseDreamSessionSaveFlowArgs([
    '--seed=909',
    '--checkpoint-save=saves/checkpoint.json',
    '--final-save=saves/final.json',
    '--gni-response=data/mock_gni_directive.json',
    '--emulate-gni',
    '--gni-endpoint=https://gni.local/process',
    '--gni-token-env=TEST_GNI_TOKEN',
    '--gni-timeout-ms=2500',
    '--clock-start=2097-01-01T00:00:00.000Z',
    '--clock-step-ms=250',
    '--json'
  ]);

  assert.deepEqual(options, {
    seed: 909,
    checkpointSavePath: 'saves/checkpoint.json',
    finalSavePath: 'saves/final.json',
    gniResponsePath: 'data/mock_gni_directive.json',
    emulateGni: true,
    gniEndpoint: 'https://gni.local/process',
    gniTokenEnv: 'TEST_GNI_TOKEN',
    gniTimeoutMs: 2500,
    clockStartIso: '2097-01-01T00:00:00.000Z',
    clockStepMs: 250,
    json: true
  });
});
