import { TurnComputer } from "../turn-computer";
import { gameStateToString } from "../types";
import type { WorkerRequest, WorkerResponse } from "./messages";

type SolverWorkerScope = {
  location: Location;
  postMessage(message: WorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
};

const worker = self as unknown as SolverWorkerScope;
let expectedScores: Float64Array;
let cachedStateKey = "";
let cachedComputer: TurnComputer | null = null;

function post(message: WorkerResponse): void {
  worker.postMessage(message);
}

async function initialize(): Promise<void> {
  const response = await fetch(new URL("./expected-scores.bin", worker.location.href));
  if (!response.ok) {
    throw new Error(`Could not load strategy data (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  expectedScores = new Float64Array(buffer);
  post({ type: "ready" });
}

worker.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== "analyze") return;

  try {
    const stateKey = gameStateToString(request.gameState);
    if (!cachedComputer || stateKey !== cachedStateKey) {
      cachedComputer = new TurnComputer(request.gameState, expectedScores, true);
      cachedComputer.compute();
      cachedStateKey = stateKey;
    }

    const recommendation = cachedComputer.getRecommendation(
      request.dice,
      request.throwsRemaining,
    );
    post({ type: "result", id: request.id, recommendation });
  } catch (error) {
    post({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : "Unknown calculation error",
    });
  }
});

initialize().catch((error) => {
  post({
    type: "error",
    message: error instanceof Error ? error.message : "Could not initialize solver",
  });
});
