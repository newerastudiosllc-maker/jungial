import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { ArchetypeState } from './archetype.js';
import { FeelingState } from './feeling.js';
import { ThresholdChamber } from './thresholdChamber.js';
import { DreamflowGenerator } from './dreamflow.js';
import { WitnessState, ArchitectState, GniAdapter } from './ai.js';
import { JournalOfMirrors } from './library.js';
import { MaskRegistry } from './masks.js';
import { saveGameState } from './persistence.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export async function runSimulation({
  seed = 777,
  savePath = join(root, 'saves', 'latest-session.json'),
  gniResponse = null
} = {}) {
  const archetypes = new ArchetypeState();
  const feeling = new FeelingState();
  const chamber = new ThresholdChamber();
  const witness = new WitnessState({ archetypeState: archetypes, feelingState: feeling, room: chamber });
  const architect = new ArchitectState();
  const dreamflow = new DreamflowGenerator({ seed });
  const journal = new JournalOfMirrors();
  const masks = new MaskRegistry({ seed });
  const gni = new GniAdapter({ endpoint: 'gni://local-dev-placeholder' });

  const transcript = [];
  transcript.push('Threshold Chamber: silent, dim, confined.');
  transcript.push(`A small note waits: "${chamber.note}".`);

  chamber.receiveInput({
    kind: 'speech',
    text: 'the word',
    archetypes,
    feeling
  });
  transcript.push('The Heartlight opens. Tools become visible.');

  witness.observeAction('open_portal', ['Seeker'], ['portal']);
  chamber.openPortal('key_of_portals');
  transcript.push('The Key of Portals turns without sound.');

  const selectedDream = dreamflow.selectNext({
    archetypeState: archetypes,
    feelingState: feeling,
    roomConfig: chamber.snapshot()
  });
  transcript.push(`Dreamflow selects: ${selectedDream.name}.`);

  const mask = masks.selectEligibleMask(archetypes);
  if (mask) {
    transcript.push(`A presence gathers: ${mask.name}.`);
  }

  const entry = journal.writeReturnEntry({
    symbols: selectedDream.symbolicTags,
    actions: archetypes.recentActions(),
    dominantArchetype: archetypes.dominantArchetype(),
    vibeState: feeling.vibeState
  });
  transcript.push(`Journal of Mirrors: ${entry.text}`);

  const bundle = witness.toSessionBundle({ selectedDream });
  const architectUpdate = architect.update(bundle);
  const gniRequest = gni.createProcessingRequest(bundle);
  transcript.push(`Architect updates ${Object.keys(architectUpdate.adjustedWeights).length} dream weight(s).`);
  transcript.push(`GNI request prepared as ${gniRequest.contract.inputFormat} -> ${gniRequest.contract.outputFormat}.`);

  const appliedGniDirective = gniResponse ? gni.parseDirective(gniResponse) : null;
  const directiveUpdate = appliedGniDirective ? architect.applyDirective(appliedGniDirective) : null;
  if (appliedGniDirective) {
    transcript.push(`GNI directive applied: ${Object.keys(appliedGniDirective.dreamWeightDeltas).length} dream delta(s).`);
  }

  await saveGameState(savePath, {
    room: chamber.snapshot(),
    archetypeState: archetypes.snapshot(),
    feelingState: feeling.snapshot(),
    journal: journal.snapshot(),
    architectState: architect.snapshot(),
    lastSessionBundle: bundle,
    pendingGniRequest: gniRequest,
    appliedGniDirective
  });
  transcript.push(`Saved session JSON to ${savePath}.`);

  return {
    transcript,
    selectedDream,
    entry,
    architectUpdate,
    directiveUpdate,
    gniRequest,
    appliedGniDirective,
    savePath
  };
}

export function parseSimulationArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      options.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--save=')) {
      options.savePath = arg.slice('--save='.length);
    } else if (arg.startsWith('--gni-response=')) {
      options.gniResponsePath = arg.slice('--gni-response='.length);
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseSimulationArgs(process.argv.slice(2));
  const gniResponse = options.gniResponsePath
    ? JSON.parse(await readFile(options.gniResponsePath, 'utf8'))
    : null;
  const result = await runSimulation({
    seed: options.seed,
    savePath: options.savePath,
    gniResponse
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of result.transcript) {
      console.log(line);
    }
  }
}
