import { createSystemClock } from './clock.js';
import { DreamerProfile } from './dreamerProfile.js';

export const SAVE_SLOT_MODES = Object.freeze(['fresh', 'continue', 'new_incarnation']);

export function prepareSaveSlot({
  profileSnapshot = null,
  slotId = 'default',
  mode = 'continue',
  incarnationIndex = null,
  consent = null,
  clock = createSystemClock(),
  memoryContextLimit = 8
} = {}) {
  const resolvedMode = SAVE_SLOT_MODES.includes(mode) ? mode : 'continue';
  const sourceProfile = profileSnapshot
    ? new DreamerProfile(profileSnapshot, { clock: forkClock(clock) })
    : null;
  const sourceSnapshot = sourceProfile?.snapshot() ?? null;
  const resolvedIndex = resolveIncarnationIndex({
    mode: resolvedMode,
    incarnationIndex,
    sourceSnapshot
  });
  const profile = createActiveProfile({
    mode: resolvedMode,
    sourceSnapshot,
    consent,
    clock: forkClock(clock)
  });
  const activeSnapshot = profile.snapshot();
  const echoProfile = shouldUseCrossSaveEchoes({ mode: resolvedMode, sourceSnapshot })
    ? sourceProfile
    : null;
  const memoryProfile = echoProfile ?? profile;
  const dreamerMemoryContext = memoryProfile.toGniMemoryContext({
    slotId: normalizeSlotId(slotId),
    mode: resolvedMode,
    limit: memoryContextLimit
  });

  return {
    schema: 'SaveSlotPlanV1',
    schemaVersion: 1,
    slotId: normalizeSlotId(slotId),
    mode: resolvedMode,
    incarnationIndex: resolvedIndex,
    runSeed: profile.deriveRunSeed({
      slotId: normalizeSlotId(slotId),
      mode: resolvedMode,
      incarnationIndex: resolvedIndex,
      sessionOrdinal: activeSnapshot.memory.sessionCount
    }),
    crossSaveEchoes: Boolean(echoProfile),
    sourceProfileId: sourceSnapshot?.profileId ?? null,
    profile: activeSnapshot,
    dreamerMemoryContext
  };
}

function createActiveProfile({
  mode,
  sourceSnapshot,
  consent,
  clock
}) {
  if (mode === 'continue' && sourceSnapshot) {
    return new DreamerProfile(mergeProfileConsent(sourceSnapshot, consent), { clock });
  }

  const inheritedConsent = {
    ...(sourceSnapshot?.consent ?? {}),
    ...(consent ?? {})
  };

  if (mode === 'new_incarnation' && sourceSnapshot) {
    return new DreamerProfile({
      rootSeed: sourceSnapshot.rootSeed,
      consent: inheritedConsent
    }, { clock });
  }

  return new DreamerProfile({
    consent: inheritedConsent
  }, { clock });
}

function mergeProfileConsent(snapshot, consent) {
  if (!consent) {
    return snapshot;
  }
  return {
    ...snapshot,
    consent: {
      ...(snapshot.consent ?? {}),
      ...consent
    }
  };
}

function shouldUseCrossSaveEchoes({ mode, sourceSnapshot }) {
  return mode === 'new_incarnation'
    && Boolean(sourceSnapshot?.consent?.crossSaveEchoes);
}

function resolveIncarnationIndex({ mode, incarnationIndex, sourceSnapshot }) {
  if (Number.isInteger(incarnationIndex) && incarnationIndex >= 0) {
    return incarnationIndex;
  }
  if (mode === 'new_incarnation') {
    return (sourceSnapshot?.memory?.sessionCount ?? 0) + 1;
  }
  return 0;
}

function normalizeSlotId(slotId) {
  return typeof slotId === 'string' && slotId.trim().length > 0
    ? slotId.trim()
    : 'default';
}

function forkClock(clock) {
  return clock?.fork?.() ?? clock ?? createSystemClock();
}
