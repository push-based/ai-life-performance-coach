/**
 * The public surface of the vault mode — what `@docs-mcp/vault` exports (ADR-KI-0058).
 *
 * A sanctioned barrel like the other packages'; no file inside this repository imports
 * from here (asserted by scripts/__tests__/boundary.test.ts).
 */

export { createVault, notePathOf, type Vault } from "./vault.js";
export { resolveVaultRoot, defaultVaultConfigFile, type VaultRootSources, type ResolvedVaultRoot } from "./root.js";
export { classify, RAW_FOLDER, PARA_FOLDERS, PARA_BUCKETS, COACH_ROOT, type ParaBucket, type ParaLocation } from "./para.js";
export { scanVault, readNote, listNotePaths, type VaultNote } from "./scan.js";
export { extractLinks, LinkResolver, type RawLink } from "./links.js";
export { buildVaultGraph, noteResolver, type VaultGraph, type VaultGraphNode, type VaultGraphEdge } from "./graph.js";
export { searchNotes, type NoteHit, type NoteSearchOptions } from "./search.js";
export { type VaultOptions, type NoteWithHistory, type DueReport, type FilingResult } from "./vault.js";
export { SESSIONS_DIR, renderSession, parseSession, loadSessions, sessionPath, type SessionRecord, type SessionItem, type Tier, type Verdict, type InvalidSession } from "./sessions.js";
export { insertCoachId, declaresCoachId } from "./identity.js";
export { histories, type Mastery, type NoteHistory, type HistoryEntry } from "./mastery.js";
export { planSession, type RecordSessionInput, type SessionItemInput, type RecordPlan } from "./record.js";
export { tier2Payload, PAYLOAD_ITEM_KEYS, type Tier2Payload } from "./payload.js";
export { planInit, planCapture, planFileNote, planArchiveProject, safeName, OLD_NOTES, type FilingPlan, type FilingAction } from "./filing.js";
export { listRaw, planConvert, planUnits, extractPdf, renderChapter, renderIndex, chapterFile, pagesOf, RAW_ROOT, RAW_PDF, RAW_TEXT, RAW_CHAPTERS, MAX_UNIT_CHARS, type RawItem, type ConvertPlan, type ConvertOptions, type PdfText, type OutlineEntry, type Unit, type UnitPlan } from "./convert.js";
