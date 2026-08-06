import { arrayToNumber, combinationCounts, combinationNumbers, getCombinationNumbersRange, numberSize, numberToArray } from "./combinations";
import { GameState, gameStateToNumber, ScoringKey, scoringKeys } from "./types";

function listSwaps(a: readonly number[], count: number) {
  const result: number[][] = [];
  const stack: [{ swaps: number[], index: number, count: number }] = [{ swaps: [], index: 0, count }];
  while (stack.length > 0) {
    const { swaps, index, count } = stack.pop()!;
    if (index === a.length) {
      result.push(swaps);
      continue;
    }
    for (let i = 0; i <= Math.min(a[index], count); i++) {
      stack.push({ swaps: [...swaps, i], index: index + 1, count: count - i });
    }
  }
  return result;
}

// const factorial = (n: number): number =>
//   n <= 1 ? 1 : n * factorial(n - 1);

// function listCombinations(n: number) {
//   const result: number[][] = [];
//   const stack: [{ freqs: number[], count: number }] = [{ freqs: [], count: n }];
//   while (stack.length > 0) {
//     const { freqs, count } = stack.pop()!;
//     if (freqs.length === 6) {
//       result.push(freqs);
//       continue;
//     }
//     if (freqs.length === 5) {
//       stack.push({ freqs: [...freqs, count], count: 0 });
//       continue;
//     }
//     for (let i = 0; i <= count; i++) {
//       stack.push({ freqs: [...freqs, i], count: count - i });
//     }
//   }
//   return result;
// }



const scoring: Record<ScoringKey, (freqs: number[]) => number> = {
  ones: (freqs) => freqs[0] * 1,
  twos: (freqs) => freqs[1] * 2,
  threes: (freqs) => freqs[2] * 3,
  fours: (freqs) => freqs[3] * 4,
  fives: (freqs) => freqs[4] * 5,
  sixes: (freqs) => freqs[5] * 6,
  threeOfAKind: (freqs) => {
    if (freqs.some(f => f >= 3)) {
      return freqs.reduce((acc, f, i) => acc + f * (i + 1), 0);
    }
    return 0;
  },
  fourOfAKind: (freqs) => {
    if (freqs.some(f => f >= 4)) {
      return freqs.reduce((acc, f, i) => acc + f * (i + 1), 0);
    }
    return 0;
  },
  fullHouse: (freqs) => {
    const hasThree = freqs.some(f => f === 3);
    const hasTwo = freqs.some(f => f === 2);
    if (hasThree && hasTwo) {
      return 25;
    }
    return 0;
  },
  smallStraight: (freqs) => {
    const straights = [
      [1, 1, 1, 1, 0, 0], // 1-2-3-4
      [0, 1, 1, 1, 1, 0], // 2-3-4-5
      [0, 0, 1, 1, 1, 1], // 3-4-5-6
    ];
    for (const straight of straights) {
      if (straight.every((s, i) => s <= freqs[i])) {
        return 30;
      }
    }
    return 0;
  },
  largeStraight: (freqs) => {
    const straights = [
      [1, 1, 1, 1, 1, 0], // 1-2-3-4-5
      [0, 1, 1, 1, 1, 1], // 2-3-4-5-6
    ];
    for (const straight of straights) {
      if (straight.every((s, i) => s <= freqs[i])) {
        return 40;
      }
    }
    return 0;
  },
  yahtzee: (freqs) => {
    if (freqs.some(f => f === 5)) {
      return 50;
    }
    return 0;
  },
  chance: (freqs) => {
    return freqs.reduce((acc, f, i) => acc + f * (i + 1), 0);
  },
}

function initDistribution(): Record<ScoringKey, number> {
  return {
    ones: 0,
    twos: 0,
    threes: 0,
    fours: 0,
    fives: 0,
    sixes: 0,
    threeOfAKind: 0,
    fourOfAKind: 0,
    fullHouse: 0,
    smallStraight: 0,
    largeStraight: 0,
    yahtzee: 0,
    chance: 0
  };
}

export class TurnComputer {
  recordTurnInfo: boolean;
  expectations: Map<string, number>;
  fastExpectations: Map<number, number>;
  recommendedSwap: Map<string, number[]>;
  fieldDistribution: Map<string, number>;
  // globalTurnExpectations: Map<string, number>;
  globalTurnExpectations: Float64Array;
  gameState: GameState;

  constructor(gameState: GameState, globalTurnExpectations: Float64Array, recordTurnInfo: boolean) {
    this.recordTurnInfo = recordTurnInfo;
    this.fastExpectations = new Map();
    this.expectations = new Map();
    this.recommendedSwap = new Map();
    this.fieldDistribution = new Map();
    this.globalTurnExpectations = globalTurnExpectations;
    this.gameState = gameState;
  }

  scoreTurn(freqs: number, step: number) {
    if (this.gameState.openFields.length === 0) throw new Error("No open fields to score");
    let bestScore = -Infinity;
    let bestKey: ScoringKey | null = null;
    for (const key of this.gameState.openFields) {
      let score = scoring[key](numberToArray(freqs));
      let nextUpperScore = this.gameState.cappedUpperScore;
      if (["ones", "twos", "threes", "fours", "fives", "sixes"].includes(key)) {
        nextUpperScore = Math.min(63, nextUpperScore + score);
      }
      if (this.gameState.cappedUpperScore < 63 && nextUpperScore >= 63) {
        score += 35;
      }
      const nextGameState = {
        openFields: this.gameState.openFields.filter(f => f !== key),
        cappedUpperScore: nextUpperScore
      };
      const nextKey = gameStateToNumber(nextGameState);
      score += this.globalTurnExpectations[nextKey] || 0;

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    this.fastExpectations.set(freqs, bestScore);
    if (this.recordTurnInfo) {
      const key = `${step}:${numberToArray(freqs).join("")}`
      this.expectations.set(key, bestScore);
      if (!bestKey) throw new Error("No best key found");
      this.recommendedSwap.set(key, [0,0,0,0,0,0]);
      for (const k of scoringKeys) {
        if (k === bestKey) {
          this.fieldDistribution.set(`${key}:${k}`, 1);
        } else {
          this.fieldDistribution.set(`${key}:${k}`, 0);
        }
      }
    }
  }

  getSwapOutcome(step: number, freqs: number, swaps: number): {score: number, fieldsCount?: Record<ScoringKey, number>  } {
    const swapCount = numberSize(swaps);
    const remaining = freqs - swaps;
    let totalCount = 0;
    let totalScore = 0;
    let fieldsCount = this.recordTurnInfo ? initDistribution() : undefined;

    const [start, stop] = getCombinationNumbersRange(swapCount);
    for (let i = start; i < stop; i++) {
      const swapfreqs = combinationNumbers[i];
      const count = combinationCounts[i];
      const outcome = remaining + swapfreqs;

      const fastKey = (step - 1) << 18 | outcome;
      if (!this.fastExpectations.has(fastKey)) throw new Error(`Missing fast expectation for key: ${fastKey}`);
      const score = this.fastExpectations.get(fastKey) || 0;

      totalCount += count;
      totalScore += score * count;

      if (this.recordTurnInfo && fieldsCount) {
        for (const k of scoringKeys) {
          const distrKey = `${step - 1}:${numberToArray(outcome).join("")}:${k}`;
          if (!this.fieldDistribution.has(distrKey)) throw new Error(`Missing field distribution for key: ${distrKey}`);
          const fieldCount = this.fieldDistribution.get(distrKey) || 0;
          fieldsCount[k] += fieldCount * count;
        }
      }
    }
    const expectedScore = totalScore / totalCount;

    return {
      score: expectedScore,
      fieldsCount
    };
  }

  getBestSwap(freqs: number, step: number) {
    const swaps = listSwaps(numberToArray(freqs), 5);
    let bestScore = -Infinity;
    let bestFieldCounts: Record<ScoringKey, number> = initDistribution();
    let bestSwap: number[] = [];
    for (const swap of swaps) {
      const {score, fieldsCount} = this.getSwapOutcome(step, freqs, arrayToNumber(swap));
      if (score > bestScore) {
        bestScore = score;
        if (this.recordTurnInfo && fieldsCount) {
          bestFieldCounts = fieldsCount;
          bestSwap = swap;
        }
      }
    }

    const fastKey = step << 18 | freqs;
    this.fastExpectations.set(fastKey, bestScore);

    if (this.recordTurnInfo) {
      const key = `${step}:${numberToArray(freqs).join("")}`;
      this.expectations.set(key, bestScore);
      this.recommendedSwap.set(key, bestSwap);
      for (const k of scoringKeys) {
        this.fieldDistribution.set(`${key}:${k}`, bestFieldCounts[k]);
      }
    }
  }

  compute() {
    const [combStart, combStop] = getCombinationNumbersRange(5);

    for (let i = 0; i <= 2; i++) {
      for (let j = combStart; j < combStop; j++) {
        if (i === 0) {
          this.scoreTurn(combinationNumbers[j], i);
        } else {
          this.getBestSwap(combinationNumbers[j], i);
        }
      }
    }

    let sum = 0;
    let total = 0;
    for (let i = combStart; i < combStop; i++) {
      const freqs = combinationNumbers[i];
      const fastKey = 2 << 18 | freqs;
      const score = this.fastExpectations.get(fastKey) || 0;
      const count = combinationCounts[i]; 
      sum += count * score;
      total += count;
    }

    const avg = sum / total;
    return avg;
  }

  printTurnInfo(freqs: number[], step: number) {
    console.log(`Step ${step}, freqs: ${freqs.join("")}`);

    const expectedScore = this.expectations.get(`${step}:${freqs.join("")}`) || 0;
    console.log("Expected score:", expectedScore);

    const recommendedSwap = this.recommendedSwap.get(`${step}:${freqs.join("")}`) || [];
    console.log("Recommended swap:", recommendedSwap);

    for (const key of scoringKeys) {
      const fieldCount = this.fieldDistribution.get(`${step}:${freqs.join("")}:${key}`) || 0;
      console.log(`Field ${key}: ${fieldCount}`);
    }
  }
}
