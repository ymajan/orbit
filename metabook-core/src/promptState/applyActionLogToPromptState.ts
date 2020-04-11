import { ActionLogID, getIDForActionLog } from "../actionLogID";
import { getNextRepetitionInterval } from "../spacedRepetition/getNextRepetitionInterval";
import {
  getInitialIntervalForSchedule,
  MetabookSpacedRepetitionSchedule,
  PromptRepetitionOutcome,
} from "../spacedRepetition/spacedRepetition";
import {
  ingestActionLogType,
  repetitionActionLogType,
} from "../types/actionLog";
import { applicationPromptType, Prompt } from "../types/prompt";
import {
  getActionLogFromPromptActionLog,
  PromptActionLog,
  PromptRepetitionActionLog,
} from "../types/promptActionLog";
import { getPromptTaskForID } from "../types/promptTask";
import { PromptTaskParameters } from "../types/promptTaskParameters";
import { PromptState } from "./promptState";

export function updateBaseHeadActionLogIDs(
  baseHeadActionLogIDs: ActionLogID[],
  newActionLogParentLogIDs: ActionLogID[],
  newActionLogID: ActionLogID,
): ActionLogID[] {
  // The new action log's parent log IDs supplant all the logs listed as its parents.
  const output: ActionLogID[] = [];
  let alreadyIncludesNewActionLogID = false;
  for (const baseHeadActionLogID of baseHeadActionLogIDs) {
    if (!newActionLogParentLogIDs.includes(baseHeadActionLogID)) {
      output.push(baseHeadActionLogID);
    }
    if (baseHeadActionLogID === newActionLogID) {
      alreadyIncludesNewActionLogID = true;
    }
  }
  if (!alreadyIncludesNewActionLogID) {
    output.push(newActionLogID);
  }
  return output;
}

function applyPromptRepetitionActionLogToPromptState<
  P extends PromptTaskParameters
>(
  promptActionLog: PromptRepetitionActionLog<P>,
  basePromptState: PromptState | null,
  schedule: MetabookSpacedRepetitionSchedule,
): PromptState | Error {
  const promptTask = getPromptTaskForID(promptActionLog.taskID);
  if (promptTask instanceof Error) {
    return new Error(
      `Couldn't decode prompt task ID ${promptActionLog.taskID}: ${promptTask.message}`,
    );
  }

  const supportsRetry = promptTask?.promptType !== applicationPromptType;

  const currentReviewInterval = basePromptState
    ? promptActionLog.timestampMillis -
      basePromptState.lastReviewTimestampMillis
    : 0;
  const currentBestInterval = basePromptState
    ? basePromptState.bestIntervalMillis
    : null;

  const currentlyNeedsRetry =
    (basePromptState && basePromptState.needsRetry) || false;

  const newInterval = getNextRepetitionInterval({
    schedule: schedule,
    reviewIntervalMillis: currentReviewInterval,
    outcome: promptActionLog.outcome,
    supportsRetry,
    currentlyNeedsRetry,
  });

  let newDueTimestampMillis: number;
  if (
    supportsRetry &&
    promptActionLog.outcome === PromptRepetitionOutcome.Forgotten
  ) {
    newDueTimestampMillis = promptActionLog.timestampMillis + 600;
  } else {
    newDueTimestampMillis = promptActionLog.timestampMillis + newInterval;
  }

  return {
    headActionLogIDs: updateBaseHeadActionLogIDs(
      basePromptState?.headActionLogIDs ?? [],
      promptActionLog.parentActionLogIDs,
      getIDForActionLog(getActionLogFromPromptActionLog(promptActionLog)),
    ),
    lastReviewTimestampMillis: promptActionLog.timestampMillis,
    dueTimestampMillis: newDueTimestampMillis,
    bestIntervalMillis:
      promptActionLog.outcome === PromptRepetitionOutcome.Remembered
        ? Math.max(currentBestInterval || 0, currentReviewInterval)
        : currentBestInterval,
    needsRetry:
      supportsRetry &&
      promptActionLog.outcome === PromptRepetitionOutcome.Forgotten,
    intervalMillis: newInterval,
    lastReviewTaskParameters: promptActionLog.taskParameters,
  };
}

export default function applyActionLogToPromptState<
  P extends PromptTaskParameters
>({
  promptActionLog,
  basePromptState,
  schedule,
}: {
  promptActionLog: PromptActionLog<P>;
  basePromptState: PromptState | null;
  schedule: MetabookSpacedRepetitionSchedule;
}): PromptState | Error {
  const initialInterval = getInitialIntervalForSchedule("default");
  switch (promptActionLog.actionLogType) {
    case ingestActionLogType:
      const actionLogID = getIDForActionLog(
        getActionLogFromPromptActionLog(promptActionLog),
      );
      if (basePromptState) {
        // Later ingests don't impact the state; we just fast-forward to include this log.
        return {
          ...basePromptState,
          headActionLogIDs: updateBaseHeadActionLogIDs(
            basePromptState.headActionLogIDs,
            [],
            actionLogID,
          ),
        };
      } else {
        return {
          headActionLogIDs: [actionLogID],
          lastReviewTimestampMillis: promptActionLog.timestampMillis,
          intervalMillis: initialInterval,
          dueTimestampMillis: promptActionLog.timestampMillis + initialInterval,
          needsRetry: false,
          lastReviewTaskParameters: null,
          bestIntervalMillis: null,
        };
      }
    case repetitionActionLogType:
      return applyPromptRepetitionActionLogToPromptState(
        promptActionLog,
        basePromptState,
        schedule,
      );
  }
}