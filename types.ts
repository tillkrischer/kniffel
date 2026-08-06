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
