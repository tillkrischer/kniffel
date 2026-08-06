import { TurnComputer } from "./turn-computer";
import { gameStateToNumber, ScoringKey, scoringKeys } from "./types";

function getBoardStates(target: number) {
  const result: ScoringKey[][] = [];
  const stack: [{ prefix: ScoringKey[], index: number, count: number }] = [{ prefix: [], index: 0, count: 0 }];
  while (stack.length > 0) {
    const { prefix, index, count } = stack.pop()!;
    if (index >= 13) {
      if (count === target) {
        result.push(prefix);
      }
      continue;
    }
    if (13 - index < target - count) {
      continue;
    }
    stack.push({ prefix: [...prefix, scoringKeys[index]], index: index + 1, count: count + 1 });
    stack.push({ prefix: [...prefix], index: index + 1, count: count });
  }
  return result;
}


function solve() {
  const expectedScores = new Float64Array(2 ** 13 * 64);
  let computedCount = 0;

  for (let i = 0; i <= 13; i++) {
    const boardStates = getBoardStates(i);
    for (const boardState of boardStates) {
      for (let cappedUpperScore = 0; cappedUpperScore <= 63; cappedUpperScore++) {
        const gameState = {
          cappedUpperScore,
          openFields: boardState,
        };
        const key = gameStateToNumber(gameState);
        if (gameState.openFields.length === 0) {
          expectedScores[key] = 0;
          computedCount++;
          continue;
        }

        if (gameState.openFields.length === 1 || gameState.openFields.length === 2) {
          const turnComputer = new TurnComputer(gameState, expectedScores, false);
          const avg = turnComputer.compute();
          expectedScores[key] = avg;
          computedCount++;
          if (computedCount % 10 === 0) {
            console.log(`Computed expected scores for ${computedCount} game states...`);
          }
        }
      }
    }
  }

  console.log(expectedScores);
}


solve()
