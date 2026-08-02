import { GameState, scoringKeys, TurnComputer } from "./turn-computer";

const initialGameState1: GameState = {
  cappedUpperBonus: 0,
  openFields: [...scoringKeys],
};
const initialGameState2: GameState = {
  cappedUpperBonus: 0,
  openFields: ["ones", "twos", "threes", "fours", "fives", "sixes"],
};
const initialGameState3: GameState = {
  cappedUpperBonus: 0,
  openFields: ["chance"],
};

const turnComputer1 = new TurnComputer(initialGameState1, true);
const avg = turnComputer1.compute();
console.log("Average expected score for a full game:", avg);
console.log("--------------------------------------------------");

const turnComputer2 = new TurnComputer(initialGameState2, true);
const avg2 = turnComputer2.compute();
console.log("Average expected score when only upper section is open:", avg2);
turnComputer2.printTurnInfo([0, 0, 0, 2, 2, 1], 1);
console.log("--------------------------------------------------");

const turnComputer3 = new TurnComputer(initialGameState3, true);
const avg3 = turnComputer3.compute();
console.log("Average expected score when only chance is open:", avg3);

