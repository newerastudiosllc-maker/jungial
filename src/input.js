const AWAKEN_ACTIONS = new Set(['speak_word', 'awaken_threshold', 'threshold_word']);
const INPUT_SOURCES = new Set(['system', 'speech', 'microphone', 'keyboard', 'controller', 'vr']);

const TOOL_INTENTS = Object.freeze({
  key_of_portals: {
    intent: 'open_portal',
    actionName: 'open_portal',
    archetypes: ['Seeker'],
    symbols: ['portal']
  },
  glyph_quill: {
    intent: 'use_tool',
    actionName: 'use_glyph_quill',
    archetypes: ['Sage', 'Creator'],
    symbols: ['reflection']
  },
  mirror_lens: {
    intent: 'use_tool',
    actionName: 'use_mirror_lens',
    archetypes: ['Shadow', 'Sage'],
    symbols: ['mirror', 'reflection']
  },
  lamp_of_forms: {
    intent: 'use_tool',
    actionName: 'use_lamp_of_forms',
    archetypes: ['Creator'],
    symbols: ['light', 'mirror']
  }
});

export function normalizePlayerInput(input = {}) {
  const source = normalizeSource(input.source ?? (input.kind === 'speech' ? 'speech' : 'system'));
  const actionName = input.name ?? input.actionName ?? null;
  const toolId = input.toolId ?? (input.kind === 'tool' ? input.id : null);
  const explicitIntent = input.intent ?? null;

  if (explicitIntent === 'awaken_threshold' || AWAKEN_ACTIONS.has(actionName) || speaksWord(input.text)) {
    return createIntent({
      source,
      intent: 'awaken_threshold',
      text: input.text ?? 'the word',
      actionName: actionName ?? explicitIntent ?? null,
      toolId: null,
      archetypes: ['Creator', 'Seeker'],
      symbols: ['threshold', 'silence', 'light']
    });
  }

  const toolIntent = TOOL_INTENTS[toolId] ?? null;
  if (toolIntent) {
    return createIntent({
      source,
      intent: toolIntent.intent,
      text: input.text ?? '',
      actionName: actionName ?? toolIntent.actionName,
      toolId,
      archetypes: input.archetypes ?? toolIntent.archetypes,
      symbols: input.symbols ?? toolIntent.symbols
    });
  }

  if (explicitIntent === 'open_portal' || actionName === 'open_portal') {
    return createIntent({
      source,
      intent: 'open_portal',
      text: input.text ?? '',
      actionName: actionName ?? 'open_portal',
      toolId: 'key_of_portals',
      archetypes: input.archetypes ?? ['Seeker'],
      symbols: input.symbols ?? ['portal']
    });
  }

  return createIntent({
    source,
    intent: explicitIntent ?? 'observe',
    text: input.text ?? '',
    actionName,
    toolId,
    archetypes: input.archetypes ?? [],
    symbols: input.symbols ?? []
  });
}

export function applyPlayerInput(input, runtime) {
  return applyPlayerIntent(normalizePlayerInput(input), runtime);
}

export function applyPlayerIntent(intent, runtime) {
  if (intent.intent === 'awaken_threshold') {
    const room = runtime.chamber.receiveInput({
      kind: 'speech',
      text: intent.text || 'the word',
      archetypes: runtime.archetypes,
      feeling: runtime.feeling
    });
    return createApplication({ intent, applied: room.awakened, room });
  }

  if (intent.intent === 'open_portal') {
    runtime.witness.observeAction(intent.actionName ?? 'open_portal', intent.archetypes, intent.symbols);
    const room = runtime.chamber.openPortal(intent.toolId ?? 'key_of_portals');
    return createApplication({ intent, applied: room.portalOpen, room });
  }

  if (intent.intent === 'use_tool' && intent.toolId) {
    runtime.witness.observeAction(intent.actionName ?? `use_${intent.toolId}`, intent.archetypes, intent.symbols);
    const room = runtime.chamber.useTool(intent.toolId);
    return createApplication({ intent, applied: true, room });
  }

  if (intent.actionName) {
    runtime.witness.observeAction(intent.actionName, intent.archetypes, intent.symbols);
    return createApplication({ intent, applied: true, room: runtime.chamber.snapshot() });
  }

  if (intent.text || intent.symbols.length > 0) {
    runtime.witness.observeSpeech(intent.text, intent.symbols);
    return createApplication({ intent, applied: true, room: runtime.chamber.snapshot() });
  }

  return createApplication({ intent, applied: false, room: runtime.chamber.snapshot() });
}

function createIntent({
  source,
  intent,
  text,
  actionName,
  toolId,
  archetypes,
  symbols
}) {
  return {
    schema: 'JungialInputIntentV1',
    source,
    kind: 'intent',
    intent,
    text,
    actionName,
    toolId,
    archetypes: [...archetypes],
    symbols: [...symbols],
    requiresMicrophone: source === 'microphone'
  };
}

function createApplication({ intent, applied, room }) {
  return {
    schema: 'JungialInputApplicationV1',
    applied,
    intent,
    room
  };
}

function speaksWord(text) {
  return typeof text === 'string' && text.trim().toLowerCase().includes('the word');
}

function normalizeSource(source) {
  return INPUT_SOURCES.has(source) ? source : 'system';
}
