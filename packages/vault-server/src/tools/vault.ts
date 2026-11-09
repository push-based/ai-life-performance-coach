/**
 * The vault server's tool registry (ADR-KI-0058 Decision 8): its own factory, so the
 * maintainer and consumer servers never list a vault tool and the vault server never
 * lists a corpus tool.
 */

import type { ToolDef } from "../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";

import { listNotesTool } from "./vault/list-notes.js";
import { readNoteTool } from "./vault/read-note.js";
import { searchNotesTool } from "./vault/search-notes.js";
import { vaultGraphTool } from "./vault/vault-graph.js";
import { dueForReviewTool } from "./vault/due-for-review.js";
import { tier2PayloadTool } from "./vault/tier2-payload.js";
import { recordSessionTool } from "./vault/record-session.js";
import { initVaultTool, captureTool, fileNoteTool, archiveProjectTool } from "./vault/filing-tools.js";
import { listRawTool, convertRawTool } from "./vault/raw-tools.js";
import { findPassagesTool, markedPassagesTool, createConceptTool } from "./vault/concept-tools.js";
import { readingProgressTool, markReadTool, writeSummaryTool } from "./vault/reading-tools.js";
import { planningOverviewTool, planPeriodTool, planDaysTool, rollOverTool, reviewPeriodTool, harvestWorkstreamTool } from "./vault/planning-tools.js";
import { climbTool, rebuildClimbTool, addReadingNotesTool, writeStructureTool, listTopicsTool, saveGuidelineTool, extendConceptTool } from "./vault/climb-tools.js";
import { updateTaskTool, addTasksTool, addHabitsTool, setFrontmatterTool, editNoteTool, createWorkstreamTool } from "./vault/note-edit-tools.js";

export function createVaultTools(vault: Vault): ToolDef[] {
  return [
    listNotesTool(vault),
    readNoteTool(vault),
    searchNotesTool(vault),
    vaultGraphTool(vault),
    dueForReviewTool(vault),
    tier2PayloadTool(vault),
    recordSessionTool(vault),
    initVaultTool(vault),
    captureTool(vault),
    fileNoteTool(vault),
    archiveProjectTool(vault),
    listRawTool(vault),
    convertRawTool(vault),
    findPassagesTool(vault),
    markedPassagesTool(vault),
    createConceptTool(vault),
    extendConceptTool(vault),
    readingProgressTool(vault),
    markReadTool(vault),
    writeSummaryTool(vault),
    addReadingNotesTool(vault),
    writeStructureTool(vault),
    listTopicsTool(vault),
    climbTool(vault),
    rebuildClimbTool(vault),
    saveGuidelineTool(vault),
    planningOverviewTool(vault),
    planPeriodTool(vault),
    planDaysTool(vault),
    addTasksTool(vault),
    addHabitsTool(vault),
    updateTaskTool(vault),
    setFrontmatterTool(vault),
    editNoteTool(vault),
    createWorkstreamTool(vault),
    rollOverTool(vault),
    reviewPeriodTool(vault),
    harvestWorkstreamTool(vault),
  ];
}
