import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UE5 GNI pseudocode documents async provider job polling and queue trace output', async () => {
  const text = await readFile('UE5Port/JungialAiProvider.hpp', 'utf8');

  assert.match(text, /struct FGniProviderJobV1/);
  assert.match(text, /struct FGniFirebreakTraceV1/);
  assert.match(text, /GNI Firebreak/);
  assert.match(text, /PollProviderJob/);
  assert.match(text, /gni\.queue\.processed/);
  assert.match(text, /gni\.firebreak\.applied/);
});

test('UE5 core type pseudocode documents save slot incarnation contracts', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSaveSlotPlanV1/);
  assert.match(text, /Fresh/);
  assert.match(text, /NewIncarnation/);
  assert.match(text, /DreamerMemoryContext/);
});

test('UE5 core type pseudocode documents hidden session arc pacing', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSessionArcV1/);
  assert.match(text, /EJungialSessionArcPhase/);
  assert.match(text, /ReturnReadiness/);
});

test('UE5 core type pseudocode documents continuous dream sessions', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FDreamSessionBeatV1/);
  assert.match(text, /struct FDreamSessionV1/);
  assert.match(text, /struct FDreamJourneyPolicyV1/);
  assert.match(text, /DreamJourneyContext/);
  assert.match(text, /ReplacementRoutes/);
  assert.match(text, /ContentGate/);
  assert.match(text, /ContentReplacementPlan/);
  assert.match(text, /ReturnAvailable/);
});

test('UE5 core type pseudocode documents dream session checkpoints', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FDreamflowRuntimeStateV1/);
  assert.match(text, /struct FDreamSessionCheckpointV1/);
  assert.match(text, /NextBeatIndex/);
});

test('UE5 core type pseudocode documents hidden Experience Director packets', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FExperienceDirectiveV1/);
  assert.match(text, /PressureTarget/);
  assert.match(text, /ReasonCodes/);
});

test('UE5 presentation pseudocode documents renderer session frames', async () => {
  const text = await readFile('UE5Port/JungialPresentationTypes.hpp', 'utf8');

  assert.match(text, /struct FSessionFrameV1/);
  assert.match(text, /FThresholdPresentationV1 Presentation/);
  assert.match(text, /FExperienceDirectiveV1 ExperienceDirective/);
  assert.match(text, /PlayerFacingText must stay empty/);
});

test('UE5 core type pseudocode documents runtime readiness preflight', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FRuntimeReadinessV1/);
  assert.match(text, /CanStartSession/);
  assert.match(text, /content\.catalog/);
  assert.match(text, /gni\.provider/);
});

test('UE5 core type pseudocode documents session shape selections', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSessionShapeSelectionV1/);
  assert.match(text, /quiet_lantern/);
  assert.match(text, /nightmare_veil/);
  assert.match(text, /PlayerFacingText/);
});

test('UE5 core type pseudocode documents session content gate reports', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSessionContentGateV1/);
  assert.match(text, /SuppressedTags/);
  assert.match(text, /ReplacementHints/);
  assert.match(text, /UJungialContentGateSubsystem/);
});

test('UE5 core type pseudocode documents session content replacement plans', async () => {
  const text = await readFile('UE5Port/JungialTypes.hpp', 'utf8');

  assert.match(text, /struct FSessionContentReplacementPlanV1/);
  assert.match(text, /ReplacementRequired/);
  assert.match(text, /Routes/);
  assert.match(text, /UJungialContentReplacementRouter/);
});
