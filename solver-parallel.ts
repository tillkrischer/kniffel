import { WorkerPool } from "./worker-pool";
import { Job, WorkerResult } from "./worker";
import { gameStateToNumber } from "./types";
import { getBoardStates } from "./combinations";
import { availableParallelism } from "node:os";
import { promises as fs} from "node:fs";

const sharedBuffer = new SharedArrayBuffer(
  (2 ** 19) * Float64Array.BYTES_PER_ELEMENT,
);

const values = new Float64Array(sharedBuffer);

const pool = new WorkerPool<Job, WorkerResult>({
  workerFile: new URL("./worker.js", import.meta.url),
  workerCount: availableParallelism(),
  workerData: {
    valuesBuffer: sharedBuffer,
  },
});

async function runBatch(
  jobs: readonly Job[],
): Promise<void> {
  const results = await pool.run(jobs);

  for (const result of results) {
    values[result.outputIndex] = result.value;
  }
}

async function main() {
  try {
  for (let i = 0; i <= 13; i++) {
    const boardStates = getBoardStates(i);
    const jobs: Job[] = [];
    for (const boardState of boardStates) {
      for (let cappedUpperScore = 0; cappedUpperScore <= 63; cappedUpperScore++) {
        const gameState = {
          cappedUpperScore,
          openFields: boardState
        }
        const outputIndex = gameStateToNumber(gameState);
        jobs.push({
          jobId: jobs.length,
          outputIndex,
          gameState
        });
      }
    }
    await runBatch(jobs);
    console.log(`Completed processing board states with ${i} open fields.`);
  }
  await fs.writeFile("expected-scores.bin", Buffer.from(values.buffer));
  } finally {
    await pool.close();
  }
}

await main();
