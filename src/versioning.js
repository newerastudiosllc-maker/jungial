export const CURRENT_SAVE_VERSION = 1;
export const CURRENT_SESSION_BUNDLE_VERSION = 1;
export const CURRENT_DIRECTIVE_VERSION = 1;

export function wrapSaveGame(payload, { savedAt = new Date().toISOString() } = {}) {
  return {
    schema: 'JungialSaveGame',
    version: CURRENT_SAVE_VERSION,
    savedAt,
    migrations: [],
    payload
  };
}

export function migrateSaveGame(input) {
  if (input?.schema === 'JungialSaveGame' && input.version === CURRENT_SAVE_VERSION) {
    return {
      ...input,
      migrations: [...(input.migrations ?? [])]
    };
  }

  return {
    schema: 'JungialSaveGame',
    version: CURRENT_SAVE_VERSION,
    savedAt: input?.savedAt ?? new Date().toISOString(),
    migrations: ['legacy-unversioned-to-v1'],
    payload: input
  };
}

export function unwrapSaveGame(input) {
  return migrateSaveGame(input).payload;
}
