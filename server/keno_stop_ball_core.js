import { intersection } from "./utils/utils.js";

const MAX_NUMBERS = 40;
// const NUMBERS_TO_DRAW = 10;
const STOP_BALLS = 3;

// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pyas for win for that numbers
// prettier-ignore
const PAYTABLE = [[3.84], 
                  [2.1, 3.3], 
                  [1.3, 2.5, 3.9], 
                  [1, 1.7, 3, 4.4], 
                  [0.8, 1, 2.5, 3.5, 6.4], 
                  [0.4, 0.8, 2, 3, 5, 7.2], 
                  [0.2, 0.5, 1.5, 2.5, 4, 5.5, 12], 
                  [0, 0.4, 1, 2, 3, 3.7, 8, 20], 
                  [0, 0, 0.8, 1.2, 2, 3, 4.6, 12, 40], 
                  [0, 0, 0, 1, 1.5, 2, 3, 6, 20, 60]
                 ]

function drawKeno() {
  const max = MAX_NUMBERS + STOP_BALLS;

  // build sequence
  const arr = Array.from({ length: max }, (_, i) => i + 1);

  // Fisher–Yates shuffle in-stream
  for (let i = max - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // find first > 40 + slice
  for (let k = 0; k < max; k++) {
    if (arr[k] > 40) {
      return arr.slice(0, k + 1);
    }
  }

  // theoretically should never happen
  return arr;
}
// console.log(drawKeno());

// input numbers selected by player
function kenoStopBall(selected, balance) {
  let win;
  // how many numbers are selected
  const numSlected = selected.length;
  const drawnNumbers = drawKeno();
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

// console.log(kenoStopBall([3, 5, 17, 23, 24, 39, 40], 100));

export { kenoStopBall };
