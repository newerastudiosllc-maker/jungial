import { ArchetypeState } from './archetype.js';
import { FeelingState } from './feeling.js';
import { ThresholdChamber } from './thresholdChamber.js';
import { DreamflowGenerator } from './dreamflow.js';
import { WitnessState, ArchitectState, GniAdapter } from './ai.js';
import { JournalOfMirrors } from './library.js';
import { MaskRegistry } from './masks.js';
import { GniDirectiveQueue } from './gniQueue.js';
import { loadBundledContentCatalog, validateContentCatalog } from './contentCatalog.js';
import { createSystemClock } from './clock.js';
import { loadGameState } from './persistence.js';

export function createJungialRuntime({
  seed = Date.now(),
  catalog = loadBundledContentCatalog(),
  gniEndpoint = 'gni://local-dev-placeholder',
  clock = createSystemClock(),
  snapshots = {}
} = {}) {
  const validation = validateContentCatalog(catalog);
  if (!validation.valid) {
    throw new Error(`Invalid content catalog: ${validation.errors.join('; ')}`);
  }

  const archetypes = new ArchetypeState(snapshots.archetypeState, { clock });
  const feeling = new FeelingState(snapshots.feelingState);
  const chamber = new ThresholdChamber({ snapshot: snapshots.room, toolSigils: catalog.toolSigils });
  const witness = new WitnessState({ archetypeState: archetypes, feelingState: feeling, room: chamber, clock });

  return {
    catalog,
    archetypes,
    feeling,
    chamber,
    witness,
    architect: new ArchitectState(snapshots.architectState),
    dreamflow: new DreamflowGenerator({ seed, modules: catalog.dreamModules }),
    journal: new JournalOfMirrors(snapshots.journal, { clock }),
    masks: new MaskRegistry({ seed, masks: catalog.masks }),
    gni: new GniAdapter({ endpoint: gniEndpoint }),
    gniQueue: new GniDirectiveQueue(snapshots.gniQueue),
    clock
  };
}

export async function createJungialRuntimeFromSave(path, options = {}) {
  const state = await loadGameState(path);
  return createJungialRuntime({
    ...options,
    snapshots: {
      ...extractRuntimeSnapshots(state),
      ...(options.snapshots ?? {})
    }
  });
}

export function extractRuntimeSnapshots(state = {}) {
  state = state ?? {};
  return {
    archetypeState: state.archetypeState,
    feelingState: state.feelingState,
    room: state.room,
    architectState: state.architectState,
    journal: state.journal,
    gniQueue: state.gniQueue
  };
}
