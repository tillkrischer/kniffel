import type { GameState } from "../types";
import type { TurnRecommendation } from "../turn-computer";

export type AnalyzeRequest = {
  type: "analyze";
  id: number;
  gameState: GameState;
  dice: number[];
  throwsRemaining: number;
};

export type WorkerRequest = AnalyzeRequest;

export type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; recommendation: TurnRecommendation }
  | { type: "error"; id?: number; message: string };
