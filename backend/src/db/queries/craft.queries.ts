import type {
  CraftFile,
  CraftFileData,
  CraftFileVersion,
  CraftStatus,
  SaveCraftFileRequest,
} from '@foldify/shared';
import { db } from '../index.ts';

/**
 * SQL only — see products.queries.ts for the rules.
 *
 * A craft file is a sheet plus an ordered fold list, stored as one row whose
 * `data` column is the CraftFileData JSON. SQLite never looks inside it; the
 * shape is validated at the route boundary and parsed back here.
 *
 * Every save also appends a row to craft_file_versions, so a project keeps the
 * history an author can look back through and restore from.
 */

interface CraftFileRow {
  id: string;
  name: string;
  version: number;
  tutorial_id: number | null;
  status: string;
  data: string;
  created_at: string;
  updated_at: string;
}

interface CraftFileVersionRow {
  id: number;
  craft_file_id: string;
  revision: number;
  name: string;
  data: string;
  created_at: string;
}

/** The history endpoint returns at most this many revisions, newest first. */
const MAX_VERSIONS_RETURNED = 30;

/** A blob that will not parse is a real fault — see mapCraftFile. */
function parseCraftData(json: string, describe: string): CraftFileData {
  try {
    return JSON.parse(json) as CraftFileData;
  } catch (err) {
    throw new Error(`${describe} holds unparseable JSON in its data column: ${String(err)}`);
  }
}

function mapCraftFile(row: CraftFileRow): CraftFile {
  // Returning a blank sheet on a bad blob would quietly destroy the author's
  // work on the next save, so the parse failure is raised instead.
  const data = parseCraftData(row.data, `Craft file ${row.id}`);

  return {
    id: row.id,
    name: row.name,
    version: 1,
    tutorialId: row.tutorial_id,
    status: row.status as CraftStatus,
    data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCraftFileVersion(row: CraftFileVersionRow): CraftFileVersion {
  return {
    id: row.id,
    craftFileId: row.craft_file_id,
    revision: row.revision,
    name: row.name,
    data: parseCraftData(row.data, `Craft file ${row.craft_file_id} revision ${row.revision}`),
    createdAt: row.created_at,
  };
}

const SELECT_CRAFT_FILES = `
  SELECT id, name, version, tutorial_id, status, data, created_at, updated_at
  FROM craft_files
`;

const SELECT_CRAFT_FILE_VERSIONS = `
  SELECT id, craft_file_id, revision, name, data, created_at
  FROM craft_file_versions
`;

/** Every craft file, newest first, for the Craft Maker's file list. */
export function listCraftFiles(): CraftFile[] {
  const rows = db
    .prepare(`${SELECT_CRAFT_FILES} ORDER BY updated_at DESC, created_at DESC`)
    .all() as CraftFileRow[];

  return rows.map(mapCraftFile);
}

export function getCraftFileById(id: string): CraftFile | null {
  const row = db.prepare(`${SELECT_CRAFT_FILES} WHERE id = ?`).get(id) as CraftFileRow | undefined;
  return row === undefined ? null : mapCraftFile(row);
}

/** The fold attached to one tutorial, or null when nobody has authored it yet. */
export function getCraftFileForTutorial(tutorialId: number): CraftFile | null {
  const row = db
    .prepare(`${SELECT_CRAFT_FILES} WHERE tutorial_id = ?`)
    .get(tutorialId) as CraftFileRow | undefined;

  return row === undefined ? null : mapCraftFile(row);
}

/**
 * Points a tutorial's steps at the craft file that now owns their fold, or
 * clears them when the file is detached. Keeps tutorial_steps.craft_file_id in
 * step with craft_files.tutorial_id — the two are written together or not at
 * all, which is why every caller runs this inside its own transaction.
 */
function stampTutorialSteps(tutorialId: number, craftFileId: string | null): void {
  db.prepare('UPDATE tutorial_steps SET craft_file_id = ? WHERE tutorial_id = ?').run(
    craftFileId,
    tutorialId,
  );
}

/**
 * Appends the snapshot for one save. MAX(revision) + 1 is read inside the
 * caller's transaction, the way appendTutorialStep numbers its steps, so two
 * concurrent saves cannot land on the same revision.
 */
function appendCraftFileVersion(craftFileId: string, name: string, data: string): void {
  const { next } = db
    .prepare(
      `SELECT COALESCE(MAX(revision), 0) + 1 AS next FROM craft_file_versions WHERE craft_file_id = ?`,
    )
    .get(craftFileId) as { next: number };

  db.prepare(
    `INSERT INTO craft_file_versions (craft_file_id, revision, name, data)
     VALUES (@craftFileId, @revision, @name, @data)`,
  ).run({ craftFileId, revision: next, name, data });
}

export function insertCraftFile(id: string, input: SaveCraftFileRequest): CraftFile {
  const tutorialId = input.tutorialId ?? null;
  const data = JSON.stringify(input.data);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO craft_files (id, name, version, tutorial_id, status, data)
       VALUES (@id, @name, 1, @tutorialId, @status, @data)`,
    ).run({ id, name: input.name, tutorialId, status: input.status ?? 'draft', data });

    appendCraftFileVersion(id, input.name, data);

    if (tutorialId !== null) stampTutorialSteps(tutorialId, id);
  })();

  const created = getCraftFileById(id);
  if (created === null) throw new Error('Craft file insert succeeded but the row could not be read back.');
  return created;
}

/**
 * Full replace of name/tutorialId/data, and of status when one is sent — an
 * absent status leaves the fold where it is in its lifecycle. Returns null when
 * there is no such file.
 */
export function updateCraftFile(id: string, input: SaveCraftFileRequest): CraftFile | null {
  const existing = getCraftFileById(id);
  if (existing === null) return null;

  const tutorialId = input.tutorialId ?? null;
  const data = JSON.stringify(input.data);

  db.transaction(() => {
    db.prepare(
      `UPDATE craft_files
       SET name = @name, tutorial_id = @tutorialId, status = @status, data = @data,
           updated_at = datetime('now')
       WHERE id = @id`,
    ).run({ id, name: input.name, tutorialId, status: input.status ?? existing.status, data });

    appendCraftFileVersion(id, input.name, data);

    // Reassignment: the tutorial this fold has just left keeps no stale pointer.
    if (existing.tutorialId !== null && existing.tutorialId !== tutorialId) {
      stampTutorialSteps(existing.tutorialId, null);
    }
    if (tutorialId !== null) stampTutorialSteps(tutorialId, id);
  })();

  return getCraftFileById(id);
}

/** Hard delete — a fold has no orders hanging off it, so there is nothing to preserve. */
export function deleteCraftFile(id: string): void {
  const existing = getCraftFileById(id);

  db.transaction(() => {
    if (existing !== null && existing.tutorialId !== null) {
      stampTutorialSteps(existing.tutorialId, null);
    }
    db.prepare('DELETE FROM craft_files WHERE id = ?').run(id);
  })();
}

/** A project's history, newest revision first and capped so the response stays small. */
export function listCraftFileVersions(craftFileId: string): CraftFileVersion[] {
  const rows = db
    .prepare(`${SELECT_CRAFT_FILE_VERSIONS} WHERE craft_file_id = ? ORDER BY revision DESC LIMIT ?`)
    .all(craftFileId, MAX_VERSIONS_RETURNED) as CraftFileVersionRow[];

  return rows.map(mapCraftFileVersion);
}

export function getCraftFileVersion(craftFileId: string, revision: number): CraftFileVersion | null {
  const row = db
    .prepare(`${SELECT_CRAFT_FILE_VERSIONS} WHERE craft_file_id = ? AND revision = ?`)
    .get(craftFileId, revision) as CraftFileVersionRow | undefined;

  return row === undefined ? null : mapCraftFileVersion(row);
}

/**
 * Copies a revision's name and data back onto the craft file. The restore is
 * itself a save, so it appends a new revision — going back is undoable, and the
 * history never loses what the file held before it.
 */
export function restoreCraftFileVersion(craftFileId: string, revision: number): CraftFile | null {
  const existing = getCraftFileById(craftFileId);
  const version = getCraftFileVersion(craftFileId, revision);
  if (existing === null || version === null) return null;

  return updateCraftFile(craftFileId, {
    name: version.name,
    tutorialId: existing.tutorialId,
    status: existing.status,
    data: version.data,
  });
}
