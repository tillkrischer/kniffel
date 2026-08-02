import { GameState, ScoringKey, scoringKeys, TurnComputer } from "./turn-computer";

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


function gameStateToString(gameState: GameState): string {
  let s = ''
  for (let i = 0; i <= 13; i++) {
    if (gameState.openFields.includes(scoringKeys[i])) {
      s += '1';
    } else {
      s += '0';
    }
  }
  s += ":"
  s += gameState.cappedUpperBonus.toString();
  return s;
}


function solve() {
  const expectedScores = new Map<string, number>();

  for (let i = 0; i <= 13; i++) {
    const boardStates = getBoardStates(i);
    for (const boardState of boardStates) {
      for (let cappedUpperBonus = 0; cappedUpperBonus <= 63; cappedUpperBonus++) {
        const gameState = {
          cappedUpperBonus: cappedUpperBonus,
          openFields: boardState,
        };
        const key = gameStateToString(gameState);
        if (gameState.openFields.length === 0) {
          expectedScores.set(key, 0);
          continue;
        }



        if (gameState.openFields.length === 1) {
          const turnComputer = new TurnComputer(gameState, false);
          const avg = turnComputer.compute();
          expectedScores.set(key, avg);
          const currSize = expectedScores.size;
          if (currSize % 10 === 0) {
            console.log(`Computed expected scores for ${currSize} game states...`);
          }
        }
      }
    }
  }

  console.log(expectedScores);
}


solve()
