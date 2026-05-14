import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { migrateSaveGame, unwrapSaveGame, wrapSaveGame } from './versioning.js';

export async function saveGameState(path, state) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(wrapSaveGame(state), null, 2)}\n`, 'utf8');
}

export async function loadGameState(path, { envelope = false } = {}) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  return envelope ? migrateSaveGame(parsed) : unwrapSaveGame(parsed);
}
