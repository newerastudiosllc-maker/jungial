import { ArchetypeState } from './archetype.js';
import { FeelingState } from './feeling.js';
import { ThresholdChamber } from './thresholdChamber.js';
import { DreamflowGenerator } from './dreamflow.js';
import { WitnessState, ArchitectState, GniAdapter } from './ai.js';
import { JournalOfMirrors } from './library.js';
import { MaskRegistry } from './masks.js';
import { loadBundledContentCatalog, validateContentCatalog } from './contentCatalog.js';

export function createJungialRuntime({
  seed = Date.now(),
  catalog = loadBundledContentCatalog(),
  gniEndpoint = 'gni://local-dev-placeholder'
} = {}) {
  const validation = validateContentCatalog(catalog);
  if (!validation.valid) {
    throw new Error(`Invalid content catalog: ${validation.errors.join('; ')}`);
  }

  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber({ toolSigils: catalog.toolSigils });
  const witness = new WitnessState({ archetypeState: archetypes, feelingState: feeling, room: chamber });

  return {
    catalog,
    archetypes,
    feeling,
    chamber,
    witness,
    architect: new ArchitectState(),
    dreamflow: new DreamflowGenerator({ seed, modules: catalog.dreamModules }),
    journal: new JournalOfMirrors(),
    masks: new MaskRegistry({ seed, masks: catalog.masks }),
    gni: new GniAdapter({ endpoint: gniEndpoint })
  };
}
