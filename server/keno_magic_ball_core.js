// import { includes } from "core-js/core/array";
import {
  fisherYatesShuffle,
  intersection,
  getRandomElement,
} from "./utils/utils.js";

const NUMBERS_TO_DRAW = 6;
const MAX_NUMBERS = 36;
const MAGIC_MULTIPLIKATOR = 11;

// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pyas for win for that numbers
// prettier-ignore
const PAYTABLE = [[4.5], 
                  [2, 7.5], 
                  [1.5, 2.5, 16], 
                  [1, 2, 10, 50], 
                  [0.75, 1.5, 6, 30, 300], 
                  [0.5, 1.2, 4, 25, 250, 3000]
                ]

// general function for random draw in Keno
// input: n - how many numbers are drawn
//        K - maximum numbers to draw
// example randomDraw(10, 36) - 10 random numbers in range 1-36
function randomDraw(n, K) {
  const rez = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    while (true) {
      const randNum = 1 + Math.floor(Math.random() * K);
      if (!rez.includes(randNum)) {
        rez[i] = randNum;
        break;
      }
    }
  }
  return rez;
}
// console.log(randomDraw(30, 36));

function randomDrawFYS(n, K) {
  const numbers = Array.from({ length: K }, (_, index) => index + 1);
  const shuffledNumbers = fisherYatesShuffle(numbers);
  const rez = shuffledNumbers.slice(0, n);
  return rez;
}
// console.log(randomDrawFYS(10, 36));

// input numbers selected by player
function kenoMagicBall(selected, balance) {
  let win;
  // how many numbers are selected
  const numSlected = selected.length;
  const drawnNumbers = randomDrawFYS(NUMBERS_TO_DRAW, MAX_NUMBERS);
  drawnNumbers.sort((a, b) => a - b);
  const magicNumber = getRandomElement(drawnNumbers);
  const winningNumbers = intersection(selected, drawnNumbers);
  // how many hits
  const numHits = winningNumbers.length;

  // detemine win from paytable -1 for zero indexing
  if (numHits > 0) {
    win = PAYTABLE[numSlected - 1][numHits - 1];
    if (winningNumbers.includes(magicNumber)) {
      win *= MAGIC_MULTIPLIKATOR;
    }
  } else {
    win = 0;
  }

  const newBalance = (balance += win);
  return {
    winningNumbers: winningNumbers,
    drawnNumbers: drawnNumbers,
    hits: numHits,
    win: win,
    balance: newBalance,
    magicNumber: magicNumber,
  };
}

// console.log(kenoMagicBall([1, 2, 4, 8, 16], 100));

export { kenoMagicBall };
