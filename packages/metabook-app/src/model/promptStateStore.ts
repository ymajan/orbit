import RNLeveldown from "react-native-leveldown";
import LevelUp, * as levelup from "levelup";
import * as lexi from "lexicographic-integer";

import { PromptState, PromptTaskID } from "metabook-core";
import { ServerTimestamp } from "metabook-firebase-support";
import { Transform } from "stream";
import sub from "subleveldown";

function getDueTimestampIndexKey(
  promptState: PromptState,
  taskID: string & { __promptTaskIDOpaqueType: never },
) {
  return `${lexi.pack(promptState.dueTimestampMillis, "hex")}!${taskID}`;
}

export default class PromptStateStore {
  private rootDB: levelup.LevelUp;
  private promptStateDB: levelup.LevelUp;
  private dueTimestampIndexDB: levelup.LevelUp;
  private opQueue: (() => Promise<unknown>)[];

  private cachedLatestLogServerTimestamp: ServerTimestamp | null | undefined;

  constructor(cacheName = "PromptStateStore") {
    console.log("[Performance] Opening prompt store", Date.now() / 1000.0);
    this.rootDB = LevelUp(new RNLeveldown(cacheName), () => {
      console.log("[Performance] Opened database", Date.now() / 1000.0);
    });
    this.promptStateDB = sub(this.rootDB, "promptStates");
    this.dueTimestampIndexDB = sub(this.rootDB, "dueTimestampMillis");
    this.cachedLatestLogServerTimestamp = undefined;
    this.opQueue = [];
  }

  private runOp<T>(op: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const runOp = () => {
        return op()
          .then(resolve, reject)
          .finally(() => {
            const nextOp = this.opQueue.shift();
            if (nextOp) {
              nextOp();
            }
          });
      };
      if (this.opQueue.length === 0) {
        runOp();
      } else {
        this.opQueue.push(runOp);
      }
    });
  }

  // Can only be called from the op queue
  async savePromptStateCaches(
    entries: Iterable<{
      promptState: PromptState;
      taskID: PromptTaskID;
    }>,
  ): Promise<void> {
    return this.runOp(async () => {
      const batch = this.promptStateDB.batch();
      const dueTimestampIndexBatch = this.dueTimestampIndexDB.batch();
      for (const { promptState, taskID } of entries) {
        const encodedPromptState = JSON.stringify(promptState);
        batch.put(taskID, encodedPromptState);

        dueTimestampIndexBatch.put(
          getDueTimestampIndexKey(promptState, taskID),
          taskID,
        );
      }

      await Promise.all([batch.write(), dueTimestampIndexBatch.write()]);
    });
  }

  private async _getPromptState(
    taskID: PromptTaskID,
  ): Promise<PromptState | null> {
    const recordString = await this.promptStateDB
      .get(taskID)
      .catch((error) => (error.notFound ? null : Promise.reject(error)));
    if (recordString) {
      return JSON.parse(recordString) as PromptState;
    } else {
      return null;
    }
  }

  async getPromptState(taskID: PromptTaskID): Promise<PromptState | null> {
    return this.runOp(async () => {
      return this._getPromptState(taskID);
    });
  }

  async getDuePromptStates(
    dueThresholdMillis: number,
    limit?: number,
  ): Promise<Map<PromptTaskID, PromptState>> {
    return this.runOp(
      () =>
        new Promise((resolve, reject) => {
          const output: Map<PromptTaskID, PromptState> = new Map();

          const indexUpdateTransformer = new Transform({
            objectMode: true,
            transform: async (chunk, inc, done) => {
              const indexKey = chunk.key;
              const taskID = indexKey.split("!")[1];
              const promptState = await this._getPromptState(taskID);
              if (!promptState) {
                throw new Error(
                  `Inconsistent index: contains index for prompt state with key ${taskID}, which doesn't exist`,
                );
              }
              done(null, { taskID, promptState });
            },
          });

          this.dueTimestampIndexDB
            .createReadStream({
              lt: `${lexi.pack(dueThresholdMillis, "hex")}~`, // i.e. the character after the due timestamp
              keys: true,
              values: true,
              limit,
            })
            .pipe(indexUpdateTransformer)
            .on("data", ({ taskID, promptState }) => {
              output.set(taskID, promptState);
            })
            .on("error", reject)
            .on("close", () => reject(new Error(`Database unexpected closed`)))
            .on("end", () => resolve(output));
        }),
    );
  }

  async clear(): Promise<void> {
    await this.rootDB.clear();
  }

  async close(): Promise<void> {
    await this.rootDB.close();
  }
}