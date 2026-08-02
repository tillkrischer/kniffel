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

const factorial = (n: number): number =>
  n <= 1 ? 1 : n * factorial(n - 1);

function listCombinations(n: number) {
  const result: number[][] = [];
  const stack: [{ freqs: number[], count: number }] = [{ freqs: [], count: n }];
  while (stack.length > 0) {
    const { freqs, count } = stack.pop()!;
    if (freqs.length === 6) {
      result.push(freqs);
      continue;
    }
    if (freqs.length === 5) {
      stack.push({ freqs: [...freqs, count], count: 0 });
      continue;
    }
    for (let i = 0; i <= count; i++) {
      stack.push({ freqs: [...freqs, i], count: count - i });
    }
  }
  return result;
}

const scoringKeys = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yahtzee",
  "chance"
] as const;
type ScoringKey = typeof scoringKeys[number];

type GameState = {
  cappedUpperBonus: number;
  openFields: ScoringKey[];
}

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

type StateResult = {
  score: number,
  fieldCounts: Record<ScoringKey, number>
  recommendedSwap: number[]
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

class TurnComputer {
  expectations: Map<string, number>;
  recommendedSwap: Map<string, number[]>;
  fieldDistribution: Map<string, number>;
  gameState: GameState;

  constructor(gameState: GameState) {
    this.expectations = new Map();
    this.recommendedSwap = new Map();
    this.fieldDistribution = new Map();
    this.gameState = gameState;
  }

  scoreTurn(freqs: number[]): StateResult {
    if (this.gameState.openFields.length === 0) throw new Error("No open fields to score");
    let bestScore = 0;
    let bestKey: ScoringKey | null = null;
    for (const key of this.gameState.openFields) {
      let score = scoring[key](freqs);
      if (this.gameState.cappedUpperBonus < 63 &&
        ["ones", "twos", "threes", "fours", "fives", "sixes"].includes(key) &&
        score + this.gameState.cappedUpperBonus >= 63
      ) {
        score += 35;
      }
      // todo: add exp for remaining turns

      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
  
    if (!bestKey) throw new Error("No best key found");
    const fieldCounts = initDistribution();
    fieldCounts[bestKey] = 1;

    return {
      score:bestScore,
      fieldCounts,
      recommendedSwap: [0,0,0,0,0,0],
    };
  }

  getSwapOutcome(step: number, freqs: number[], swaps: number[]): {score: number, fieldCounts: Record<ScoringKey, number>} {
    const swapCount = swaps.reduce((acc, s) => acc + s, 0);
    const remaining = freqs.map((f, i) => f - swaps[i]);
    const combs = listCombinations(swapCount);
    let totalCount = 0;
    let totalScore = 0;
    const fieldCounts = initDistribution();
    for (const freqs of combs) {
      const count = factorial(swapCount) / swaps.reduce((acc, f) => acc * factorial(f), 1);
      const outcome = remaining.map((r, i) => r + freqs[i]);

      const key = `${step - 1}:${outcome.join("")}`;
      if (!this.expectations.has(key)) throw new Error(`Missing expectation for key: ${key}`);
      const score = this.expectations.get(key) || 0;
      totalCount += count;
      totalScore += score * count;

      for (const k of scoringKeys) {
        const distrKey = `${key}:${k}`;
        if (!this.fieldDistribution.has(distrKey)) throw new Error(`Missing field distribution for key: ${distrKey}`);
        const fieldCount = this.fieldDistribution.get(distrKey) || 0;
        fieldCounts[k] += fieldCount * count;
      }
    }
    const expectedScore = totalScore / totalCount;

    return {
      score: expectedScore,
      fieldCounts
    };
  }


  getBestSwap(freqs: number[], step: number): StateResult {
    const swaps = listSwaps(freqs, 5);
    let bestScore = -Infinity;
    let bestFieldCounts: Record<ScoringKey, number> = initDistribution();
    let bestSwap: number[] = [];
    for (const swap of swaps) {
      const {score, fieldCounts} = this.getSwapOutcome(step, freqs, swap);
      if (score > bestScore) {
        bestScore = score;
        bestFieldCounts = fieldCounts;
        bestSwap = swap;
      }
    }
    return {
      score: bestScore,
      fieldCounts: bestFieldCounts,
      recommendedSwap: bestSwap
    };
  }

  compute() {
    const allCombs = listCombinations(5);
    let sum = 0;

    for (let i = 0; i <= 2; i++) {
      for (const freqs of allCombs) {
        const key = freqs.join("");
        const {score, fieldCounts, recommendedSwap} = i === 0 ?
          this.scoreTurn(freqs) :
          this.getBestSwap(freqs, i);
        this.expectations.set(`${i}:${key}`, score);
        this.recommendedSwap.set(`${i}:${key}`, recommendedSwap);
        for (const k of scoringKeys) {
          this.fieldDistribution.set(`${i}:${key}:${k}`, fieldCounts[k]);
        }
        if (i === 2) {
          sum += score;
        }
      }
    }
    const avg = sum / allCombs.length;
    console.log("compute: Average expected score after 2 swaps:", avg);
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

// const initialGameState: GameState = {
//   cappedUpperBonus: 0,
//   openFields: [...scoringKeys],
// };
// const initialGameState: GameState = {
//   cappedUpperBonus: 0,
//   openFields: ["chance"],
// };
// const initialGameState: GameState = {
//   cappedUpperBonus: 50,
//   openFields: [...scoringKeys],
// };
// const initialGameState: GameState = {
//   cappedUpperBonus: 0,
//   openFields: ["ones"],
// };
const initialGameState: GameState = {
  cappedUpperBonus: 0,
  openFields: ["ones", "twos", "threes", "fours", "fives", "sixes"],
};
const turnComputer = new TurnComputer(initialGameState);
turnComputer.compute();
turnComputer.printTurnInfo([0, 0, 0, 2, 2, 1], 0);


