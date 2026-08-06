import { promises as fs } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { stringToGameState } from "./types";
import { TurnComputer } from "./turn-computer";

const buffer = await fs.readFile("expected-scores.bin");
const expectedScores = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float64Array.BYTES_PER_ELEMENT);

const rl = createInterface({
  input: stdin,
  output: stdout,
});

const gameStateInput = await rl.question("Enter game state (1100000000000:63): ");
const gameState = stringToGameState(gameStateInput);

const throwInput = await rl.question("Enter throws remaining (0,1,2): ");
const throwNumber = parseInt(throwInput, 10);

const diceInput = await rl.question("Enter dice (33445): ");
const diceArray = diceInput.split("").map((d) => parseInt(d, 10));
const freq = diceArray.reduce((acc, d) => {
  acc[d-1] = (acc[d-1] || 0) + 1;
  return acc;
}, [0, 0, 0, 0, 0, 0]);

rl.close();


const turnComputer = new TurnComputer(gameState, expectedScores, true);
turnComputer.compute();
turnComputer.printTurnInfo(freq, throwNumber);
