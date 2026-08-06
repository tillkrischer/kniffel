import { beforeAll, describe, expect, test } from "bun:test";
import { TurnComputer } from "./turn-computer";
import { GameState } from "./types";

const gameState: GameState = {
  cappedUpperScore: 0,
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
  const turnComputer = new TurnComputer(gameState, new Float64Array(), true);

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

    expect(turnComputer.expectations.get(key)).toBeCloseTo(25.13888888888889);
    expect(turnComputer.recommendedSwap.get(key)).toEqual([0, 0, 0, 1, 1, 0]);
    expect(turnComputer.fieldDistribution.get(`${key}:threeOfAKind`)).toBe(3);
    expect(turnComputer.fieldDistribution.get(`${key}:smallStraight`)).toBe(9);
    expect(turnComputer.fieldDistribution.get(`${key}:largeStraight`)).toBe(2);
    expect(turnComputer.fieldDistribution.get(`${key}:chance`)).toBe(22);
  });
});

describe("example game states", () => {
  test("computes an average of 23.33 when only chance is open", () => {
    const chanceGameState: GameState = {
      cappedUpperScore: 0,
      openFields: ["chance"],
    };
    const turnComputer = new TurnComputer(
      chanceGameState,
      new Float64Array(),
      true,
    );

    expect(turnComputer.compute()).toBeCloseTo(23.33, 2);
  });

  describe("with an upper bonus in reach", () => {
    const bonusGameState: GameState = {
      cappedUpperScore: 56,
      openFields: ["ones", "twos", "fullHouse"],
    };
    const turnComputer = new TurnComputer(
      bonusGameState,
      new Float64Array(),
      true,
    );
    let averageScore: number;

    beforeAll(() => {
      averageScore = turnComputer.compute();
    });

    test("computes an average of 12.40", () => {
      expect(averageScore).toBeCloseTo(12.40, 2);
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
        expectedScore: 27.87037037037037,
        expectedSwap: [0, 0, 2, 0, 0, 0],
        expectedFields: { ones: 0, twos: 681, fullHouse: 105 },
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
    const upperGameState: GameState = {
      cappedUpperScore: 0,
      openFields: ["ones", "twos", "threes", "fours", "fives", "sixes"],
    };
    const turnComputer = new TurnComputer(
      upperGameState,
      new Float64Array(),
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
        expectedScore: 12.657407407407407,
        expectedSwap: [0, 0, 0, 2, 0, 1],
        expectedFields: { fours: 1, fives: 202, sixes: 13 },
      },
      {
        step: 2,
        expectedScore: 14.842463991769543,
        expectedSwap: [0, 0, 0, 2, 0, 1],
        expectedFields: { fours: 159, fives: 25_225, sixes: 4_047 },
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
