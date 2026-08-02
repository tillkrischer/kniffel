import { beforeAll, describe, expect, test } from "bun:test";
import { GameState, TurnComputer } from "./turn-computer";

const gameState: GameState = {
  cappedUpperBonus: 0,
  openFields: [
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
    "chance",
  ],
};

describe("TurnComputer maps", () => {
  const turnComputer = new TurnComputer(gameState, true);

  beforeAll(() => {
    turnComputer.compute();
  });

  test("contains an entry for every roll at every step", () => {
    const rollCount = 252;

    expect(turnComputer.expectations).toHaveLength(rollCount * 3);
    expect(turnComputer.recommendedSwap).toHaveLength(rollCount * 3);
    expect(turnComputer.fieldDistribution).toHaveLength(
      rollCount * 3 * gameState.openFields.length,
    );
  });

  test("records a yahtzee at the scoring step", () => {
    const key = "0:000005";

    expect(turnComputer.expectations.get(key)).toBe(50);
    expect(turnComputer.recommendedSwap.get(key)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(turnComputer.fieldDistribution.get(`${key}:yahtzee`)).toBe(1);
    expect(turnComputer.fieldDistribution.get(`${key}:chance`)).toBe(0);
  });

  test("records a large straight at the scoring step", () => {
    const key = "0:111110";

    expect(turnComputer.expectations.get(key)).toBe(40);
    expect(turnComputer.recommendedSwap.get(key)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(turnComputer.fieldDistribution.get(`${key}:largeStraight`)).toBe(1);
    expect(turnComputer.fieldDistribution.get(`${key}:smallStraight`)).toBe(0);
  });

  test("records the best swap and outcomes with one reroll left", () => {
    const key = "1:000221";

    expect(turnComputer.expectations.get(key)).toBeCloseTo(24.904761904761905);
    expect(turnComputer.recommendedSwap.get(key)).toEqual([0, 0, 0, 1, 1, 0]);
    expect(turnComputer.fieldDistribution.get(`${key}:threeOfAKind`)).toBe(6);
    expect(turnComputer.fieldDistribution.get(`${key}:smallStraight`)).toBe(10);
    expect(turnComputer.fieldDistribution.get(`${key}:largeStraight`)).toBe(2);
    expect(turnComputer.fieldDistribution.get(`${key}:chance`)).toBe(24);
  });
});

describe("example game states", () => {
  test("computes an average of 23.33 when only chance is open", () => {
    const turnComputer = new TurnComputer(
      {
        cappedUpperBonus: 0,
        openFields: ["chance"],
      },
      true,
    );

    expect(turnComputer.compute()).toBeCloseTo(23.33, 2);
  });

  describe("with an upper bonus in reach", () => {
    const turnComputer = new TurnComputer(
      {
        cappedUpperBonus: 56,
        openFields: ["ones", "twos", "fullHouse"],
      },
      true,
    );
    let averageScore: number;

    beforeAll(() => {
      averageScore = turnComputer.compute();
    });

    test("computes an average of 16.34", () => {
      expect(averageScore).toBeCloseTo(16.34, 2);
    });

    test.each([
      {
        step: 0,
        expectedScore: 25,
        expectedSwap: [0, 0, 0, 0, 0, 0],
        expectedFields: { ones: 0, twos: 0, fullHouse: 1 },
      },
      {
        step: 1,
        expectedScore: 25,
        expectedSwap: [0, 0, 0, 0, 0, 0],
        expectedFields: { ones: 0, twos: 0, fullHouse: 1 },
      },
      {
        step: 2,
        expectedScore: 28.503401360544217,
        expectedSwap: [0, 0, 2, 0, 0, 0],
        expectedFields: { ones: 0, twos: 351, fullHouse: 105 },
      },
    ])("records the result for 032000 at step $step", ({
      step,
      expectedScore,
      expectedSwap,
      expectedFields,
    }) => {
      const key = `${step}:032000`;

      expect(turnComputer.expectations.get(key)).toBeCloseTo(expectedScore);
      expect(turnComputer.recommendedSwap.get(key)).toEqual([...expectedSwap]);
      expect(turnComputer.fieldDistribution.get(`${key}:ones`)).toBe(expectedFields.ones);
      expect(turnComputer.fieldDistribution.get(`${key}:twos`)).toBe(expectedFields.twos);
      expect(turnComputer.fieldDistribution.get(`${key}:fullHouse`)).toBe(
        expectedFields.fullHouse,
      );
    });
  });

  describe("with only the upper section open", () => {
    const turnComputer = new TurnComputer(
      {
        cappedUpperBonus: 0,
        openFields: ["ones", "twos", "threes", "fours", "fives", "sixes"],
      },
      true,
    );

    beforeAll(() => {
      turnComputer.compute();
    });

    test.each([
      {
        step: 0,
        expectedScore: 10,
        expectedSwap: [0, 0, 0, 0, 0, 0],
        expectedFields: { fours: 0, fives: 1, sixes: 0 },
      },
      {
        step: 1,
        expectedScore: 12.821428571428571,
        expectedSwap: [0, 0, 0, 2, 0, 1],
        expectedFields: { fours: 3, fives: 150, sixes: 15 },
      },
      {
        step: 2,
        expectedScore: 15.080994897959185,
        expectedSwap: [0, 0, 0, 2, 0, 1],
        expectedFields: { fours: 432, fives: 18_354, sixes: 3_672 },
      },
    ])("records the result for 000221 at step $step", ({
      step,
      expectedScore,
      expectedSwap,
      expectedFields,
    }) => {
      const key = `${step}:000221`;

      expect(turnComputer.expectations.get(key)).toBeCloseTo(expectedScore);
      expect(turnComputer.recommendedSwap.get(key)).toEqual([...expectedSwap]);
      expect(turnComputer.fieldDistribution.get(`${key}:fours`)).toBe(expectedFields.fours);
      expect(turnComputer.fieldDistribution.get(`${key}:fives`)).toBe(expectedFields.fives);
      expect(turnComputer.fieldDistribution.get(`${key}:sixes`)).toBe(expectedFields.sixes);
    });
  });
});
