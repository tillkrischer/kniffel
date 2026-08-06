import { GameState, gameStateToNumber, scoringKeys } from "./types";
import { promises as fs } from "node:fs";

const initialGameState1: GameState = {
  cappedUpperScore: 0,
  openFields: [...scoringKeys],
};
const initialGameState2: GameState = {
  cappedUpperScore: 0,
  openFields: ["ones", "twos", "threes", "fours", "fives", "sixes"],
};
const initialGameState3: GameState = {
  cappedUpperScore: 0,
  openFields: ["chance"],
};

const initialGameState4: GameState = {
  cappedUpperScore: 56,
  openFields: ["ones", "twos", "fullHouse"],
};

const initialGameState5: GameState = {
  cappedUpperScore: 60,
  openFields: ["sixes"],
};

const buffer = await fs.readFile("expected-scores.bin");
const expectedScores = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float64Array.BYTES_PER_ELEMENT);

// for (let i = 0; i <= 63; i++) {
//   const gameState: GameState = {
//     cappedUpperScore: i,
//     openFields: ["ones", "twos"],
//   };
//   const key = gameStateToNumber(gameState);
//   console.log(`Expected score for cappedUpperScore=${i} and all upper section open: ${expectedScores[key]}`);
// }

console.log("Average expected score for a full game:", expectedScores[gameStateToNumber(initialGameState1)]);

// const turnComputer4 = new TurnComputer(initialGameState4, true);
// const avg4 = turnComputer4.compute();
// console.log("Average expected score when only upper section and full house are open:", avg4);
// turnComputer4.printTurnInfo([0, 3, 2, 0, 0, 0], 0);
// turnComputer4.printTurnInfo([0, 3, 2, 0, 0, 0], 1);
// turnComputer4.printTurnInfo([0, 3, 2, 0, 0, 0], 2);
//

// console.log("availableParallelism:", availableParallelism());



// const turnComputer5 = new TurnComputer(initialGameState5, new Float64Array(), true);
// const avg5 = turnComputer5.compute();
// console.log("Average expected score when only sixes are open and bonus is in reach:", avg5);
// turnComputer5.printTurnInfo([0, 3, 2, 0, 0, 0], 0);
// turnComputer5.printTurnInfo([0, 3, 2, 0, 0, 0], 1);
// turnComputer5.printTurnInfo([0, 3, 2, 0, 0, 0], 2);

// const turnComputer1 = new TurnComputer(initialGameState1, true);
// const avg = turnComputer1.compute();
// console.log("Average expected score for a full game:", avg);
// console.log("--------------------------------------------------");
//
// const turnComputer2 = new TurnComputer(initialGameState2, true);
// const avg2 = turnComputer2.compute();
// console.log("Average expected score when only upper section is open:", avg2);
// turnComputer2.printTurnInfo([0, 0, 0, 2, 2, 1], 1);
// console.log("--------------------------------------------------");
//
// const turnComputer3 = new TurnComputer(initialGameState3, true);
// const avg3 = turnComputer3.compute();
// console.log("Average expected score when only chance is open:", avg3);

// let start = performance.now();
// let turnComputer = new TurnComputer(initialGameState1, false);
// for (let i = 0; i < 20; i++) {
//   turnComputer.compute();
// }
// let end = performance.now();
// console.log(`Average expected score for a full game: ${turnComputer.compute()}`);
// console.log(`Time taken for 20 computations: ${(end - start).toFixed(2)} ms`);
//
//
// start = performance.now();
// turnComputer = new TurnComputer(initialGameState1, true);
// for (let i = 0; i < 20; i++) {
//   turnComputer.compute();
// }
// end = performance.now();
// console.log(`Average expected score for a full game: ${turnComputer.compute()}`);
// console.log(`Time taken for 20 computations: ${(end - start).toFixed(2)} ms`);
