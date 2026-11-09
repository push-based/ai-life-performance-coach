/**
 * The public surface of the vault mode — what `@docs-mcp/vault` exports (ADR-KI-0058).
 *
 * A sanctioned barrel like the other packages'; no file inside this repository imports
 * from here (asserted by scripts/__tests__/boundary.test.ts).
 */

export { createVault, notePathOf, type Vault } from "./vault.js";
export { resolveVaultRoot, defaultVaultConfigFile, type VaultRootSources, type ResolvedVaultRoot } from "./root.js";
export { classify, RAW_FOLDER, PARA_FOLDERS, PARA_BUCKETS, COACH_ROOT, PLANS_ROOT, type ParaBucket, type ParaLocation } from "./para.js";
export { scanVault, readNote, listNotePaths, type VaultNote } from "./scan.js";
export { extractLinks, LinkResolver, type RawLink } from "./links.js";
export { buildVaultGraph, noteResolver, type VaultGraph, type VaultGraphNode, type VaultGraphEdge } from "./graph.js";
export { searchNotes, searchPassages, type NoteHit, type NoteSearchOptions, type PassageHit, type PassageSearchOptions } from "./search.js";
export { applyMark, pageSection, editPageContent, setPageSummary, setChapterSummary, chapterSummaryOf, type MarkOp, type Section, type EditResult } from "./distill.js";
export { bookProgress, chapterProgress, citations, sourceOf, type Citations, planMarkRead, planSummary, summaryOf, withoutSummaries, READ_KEY, READING_STAGES, type BookProgress, type ChapterProgress, type PageProgress, type PageMark, type ChapterState, type ReadingStage, type WritePlan } from "./distill.js";
export { planConcept, conceptOf, checkPassages, locateQuote, fold, renderConcept, CONCEPT_TYPE, CONCEPTS_FOLDER, MAX_ASSERTIONS, MAX_BUZZWORDS, MAX_PASSAGES, MIN_QUOTE_CHARS, type ConceptInput, type ConceptPlan, type ConceptFields, type Passage, type PassageCheck } from "./concept.js";
export { type HarvestResult, type WriteOutcome, type Versions, type VaultOptions, type NoteWithHistory, type DueReport, type FilingResult, type WriteResult, type RawListing, type PublicEdit } from "./vault.js";
export { SESSIONS_DIR, renderSession, parseSession, loadSessions, sessionPath, bySessionDate, SESSION_KINDS, ELABORATION_KINDS, type SessionRecord, type SessionItem, type SessionKind, type ItemVerdict, type GenerateDetail, type Elaboration, type TeachDetail, type TeachTurn, type Tier, type Verdict, type InvalidSession } from "./sessions.js";
export { insertCoachId, declaresCoachId, insertKey, declaresKey } from "./identity.js";
export { histories, type Mastery, type NoteHistory, type HistoryEntry } from "./mastery.js";
export { planSession, type RecordSessionInput, type SessionItemInput, type RecordPlan } from "./record.js";
export { tier2Payload, PAYLOAD_ITEM_KEYS, PAYLOAD_OPTIONAL_KEYS, type Tier2Payload } from "./payload.js";
export { planInit, planCapture, planFileNote, planArchiveProject, keepSuggestions, RESOURCE_PACKETS, safeName, OLD_NOTES, type FilingPlan, type FilingAction, type KeepSuggestion, type ArchiveOptions, type InitOptions } from "./filing.js";
export { listRaw, planConvert, planUnits, extractPdf, renderChapter, renderIndex, chapterFile, pagesOf, RAW_ROOT, RAW_PDF, RAW_TEXT, RAW_CHAPTERS, MAX_UNIT_CHARS, type RawItem, type ConvertPlan, type ConvertOptions, type PdfText, type OutlineEntry, type Unit, type UnitPlan } from "./convert.js";
export { planning, parseTasks, planOf, PLAN_LEVELS, STATUSES, SIZE_WEIGHTS, WORKSTREAMS_FOLDER, PACKETS_FOLDER, type Planning, type Project, type Workstream, type Area, type Plan, type PlanRef, type PlanLevel, type Task, type OwnedTask, type Habit, type Owner, type Status, type Size, type Priority } from "./planning.js";
export { planPeriod, planDays, executeWrites, versionOf, versionsOf, staleNotes, nextPeriod, previousPeriod, periodAt, periodOf, isoWeekOf, planPathOf, templateFor, TEMPLATES, TEMPLATES_FOLDER, templatePath, type Period, type PlanPeriodInput, type PlanPeriodPlan, type GoalInput, type AdHocInput, type ScheduleInput, type NoteEdit, type DayInput, type PlanDaysPlan, type TaskFields } from "./plans.js";
export { updateTasks, addTasks, addHabits, setFrontmatter, editNote, createWorkstream, type EditPlan, type TaskAddress, type TaskUpdate, type TaskChanges, type NewTask, type AddTasksInput, type NewHabit, type AddHabitsInput, type FrontmatterValue, type EditNoteInput, type CreateWorkstreamInput } from "./note-edits.js";
export { TaskLine, FIELD_ORDER, PRIORITY_EMOJI, isRecurrence, type Field } from "./task-line.js";
export { rollOver, type RollOverPlan } from "./rollover.js";
export { reviewPeriod, type PeriodReview, type HabitReview, type GoalReview, type GoalStatus, type Effort, type ProjectEffort } from "./review.js";
export { harvestWorkstream, resetChecklist, isPacket, PACKET_TYPE, type HarvestPlan, type PacketInput, type Candidate } from "./harvest.js";
export { habitDays, isHabitDue, habitKey, parseHabits, HABITS_HEADING, HABIT_RULES, type HabitDefinition } from "./habits.js";
export { plansView, rowOf, type PlansView, type Row, type Cell, type TaskRef, type GoalNode } from "./plansview.js";
export { CLIMB_STEPS, climbOf, conceptBooks, groupsOf, groupOf, topicOf, teachGate, sharesRun, interleave, queueKey, structureOf, structureErrors, readingEntries, storedClimb, setFrontmatterLines, VERBATIM_RUN_WORDS, MIN_ATTEMPT_WORDS, SPACING_DAYS, READING_NOTES_TYPE, STRUCTURE_TYPE, GUIDELINE_TYPE, type ClimbStep, type ClimbSteps, type ConceptClimb, type StepEvidence, type Structure, type StructureGroup, type ReadingEntry } from "./climb.js";
export { addReadingNotes, writeStructure, saveGuideline, climbs, rebuildClimbs, listTopics, extendConcept, type TopicListing, type ExtendConceptInput, type ExtendConceptPlan, READING_NOTES_FOLDER, STRUCTURES_FOLDER, type ReadingNotesInput, type ReadingNotesPlan, type StructureInput, type StructurePlan, type GuidelineInput, type GuidelinePlan, type ClimbWritePlan } from "./climb-writes.js";
