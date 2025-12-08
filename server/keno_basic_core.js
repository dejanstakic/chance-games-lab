import { fisherYatesShuffle, intersection } from "./utils/utils.js";

const NUMBERS_TO_DRAW = 10;
const MAX_NUMBERS = 40;

// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pyas for win for that numbers
// prettier-ignore
const PAYTABLE = [[3.88], 
                  [1.7, 5.5], 
                  [1, 3, 10], 
                  [0.5, 2, 8, 36],  // rtp 1.04
                  [0.25, 1, 4, 24, 100], 
                  [0, 0.5, 3, 12, 60, 300], 
                  [0, 0.25, 2.5, 5, 27, 150, 500], 
                  [0, 0, 2, 4, 12, 45, 250, 700], 
                  [0, 0, 1.5, 2.5, 8, 20, 200, 500, 850], 
                  [0, 0, 1, 2, 5, 12, 150, 300, 700, 1000]
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
function kenoBasic(selected, balance) {
  let win;
  // how many numbers are selected
  const numSlected = selected.length;
  const drawnNumbers = randomDrawFYS(NUMBERS_TO_DRAW, MAX_NUMBERS);
  drawnNumbers.sort((a, b) => a - b);
  const winningNumbers = intersection(selected, drawnNumbers);
  // how many hits
  const numHits = winningNumbers.length;
  // detemine win from paytable -1 for zero indexing
  if (numHits > 0) {
    win = PAYTABLE[numSlected - 1][numHits - 1];
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
  };
}

// console.log(intersection([1, 2, 3], [1, 3, 6]));

export { kenoBasic };
