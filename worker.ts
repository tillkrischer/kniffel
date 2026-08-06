import { parentPort, workerData } from "node:worker_threads";
import { GameState } from "./types";
import { TurnComputer } from "./turn-computer";

export interface Job {
  jobId: number
  outputIndex: number;
  gameState: GameState;
}

export interface WorkerResult {
  jobId: number
  outputIndex: number;
  value: number;
}

interface WorkerData {
  valuesBuffer: SharedArrayBuffer;
}

if (!parentPort) {
  throw new Error("This script must be run as a worker thread.");
}

const { valuesBuffer } = workerData as WorkerData;
const values = new Float64Array(valuesBuffer);

parentPort.on("message", (job: Job) => {
  const { gameState } = job;
  let value = 0;
  if (gameState.openFields.length > 0) {
    const turnComputer = new TurnComputer(gameState, values, false);
    const avg = turnComputer.compute();
    value = avg;
  }

  const result: WorkerResult = {
    jobId: job.jobId,
    outputIndex: job.outputIndex,
    value: value
  };

  parentPort!.postMessage({ result });
});
