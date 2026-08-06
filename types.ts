export const scoringKeys = [
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

export type ScoringKey = typeof scoringKeys[number];

export const scoringCategories: readonly {
  key: ScoringKey;
  label: string;
  section: "upper" | "lower";
}[] = [
  { key: "ones", label: "Ones", section: "upper" },
  { key: "twos", label: "Twos", section: "upper" },
  { key: "threes", label: "Threes", section: "upper" },
  { key: "fours", label: "Fours", section: "upper" },
  { key: "fives", label: "Fives", section: "upper" },
  { key: "sixes", label: "Sixes", section: "upper" },
  { key: "threeOfAKind", label: "Three of a kind", section: "lower" },
  { key: "fourOfAKind", label: "Four of a kind", section: "lower" },
  { key: "fullHouse", label: "Full house", section: "lower" },
  { key: "smallStraight", label: "Small straight", section: "lower" },
  { key: "largeStraight", label: "Large straight", section: "lower" },
  { key: "yahtzee", label: "Kniffel", section: "lower" },
  { key: "chance", label: "Chance", section: "lower" },
];

export const scoringLabels = Object.fromEntries(
  scoringCategories.map(({ key, label }) => [key, label]),
) as Record<ScoringKey, string>;

export type GameState = {
  cappedUpperScore: number;
  openFields: ScoringKey[];
}

export function gameStateToString(gameState: GameState): string {
  let key = "";

  for (let i = 0; i <= 12; i++) {
    key += gameState.openFields.includes(scoringKeys[i]) ? "1" : "0";
  }

  return `${key}:${gameState.cappedUpperScore}`;
}

export function gameStateToNumber(gameState: GameState): number {
  let num = 0;

  for (let i = 0; i <= 12; i++) {
    if (gameState.openFields.includes(scoringKeys[i])) {
      num |= (1 << i);
    }
  }

  return num | (gameState.cappedUpperScore << 13);
}

export function stringToGameState(str: string): GameState {
  const split = str.split(":");
  if (split.length !== 2) {
    throw new Error(`Invalid game state string: ${str}`);
  }
  const [key, cappedUpperScoreStr] = split;
  const cappedUpperScore = parseInt(cappedUpperScoreStr, 10);
  if (isNaN(cappedUpperScore) || cappedUpperScore < 0 || cappedUpperScore > 63) {
    throw new Error(`Invalid capped upper score: ${cappedUpperScoreStr}`);
  }

  if (key.length !== 13 || !/^[01]+$/.test(key)) {
    throw new Error(`Invalid open fields key: ${key}`);
  }
  const openFields: ScoringKey[] = [];
  for (let i = 0; i <= 12; i++) {
    if (key[i] === "1") {
      openFields.push(scoringKeys[i]);
    }
  }

  return { cappedUpperScore, openFields };
}
