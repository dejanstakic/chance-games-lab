import {
  fisherYatesShuffle,
  intersection,
  getRandomElement,
  weightedRandom,
} from "./utils/utils.js";

// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pyas for win for that numbers
// prettier-ignore
const PAYTABLE = [[0.25, 0.5, 1],  // 1  - index 0
                  [0.25, 0.5, 1],  // 2  - index 1
                  [1, 2, 3],       // 3
                  [3, 4, 5],       // 4
                  [5, 10, 15],     // 5
                  [8, 15, 20],     // 6
                  [10, 20, 25],    // 7 
                  [20, 0, 0]       // 8
                 ]

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

const COLLECTED_WIN = 75;

// prettier-ignore
const REELS = [[4, 3, 3, 7, 2, 5, 2, 2, 6, 5, 2, 3, 2, 1, 2, 4, 7, 1, 3, 1, 10, 5, 3, 3, 3, 2, 5, 6, 2, 4, 1, 6, 6, 2, 2, 10, 1, 5, 4, 5, 2, 6, 1, 4, 8, 2, 1, 1, 3, 5, 7, 6, 8, 3, 6, 2, 1, 5, 2, 3, 2, 6, 1, 4, 8, 4],
[1, 4, 10, 2, 1, 2, 3, 3, 3, 3, 5, 3, 3, 3, 3, 3, 10, 6, 2, 3, 6, 4, 4, 1, 7, 7, 3, 4, 1, 5, 2, 7, 4, 5, 4, 1, 5, 5, 3, 6, 3, 3, 3, 1, 3, 2, 1, 5, 4, 4, 2, 6, 3, 5, 2, 1, 2, 1, 1],
[4, 2, 3, 3, 1, 2, 4, 5, 7, 3, 1, 5, 3, 3, 8, 2, 3, 2, 5, 5, 1, 2, 2, 6, 6, 2, 10, 4, 2, 2, 2, 3, 8, 5, 3, 2, 1, 5, 2, 3, 10, 1, 4, 6, 8, 2, 2, 2, 3, 3, 3, 6, 7, 4],
[3, 2, 4, 2, 2, 6, 7, 4, 6, 1, 3, 3, 1, 5, 4, 2, 10, 2, 7, 2, 6, 1, 5, 2, 3, 1, 1, 6, 3, 4, 3, 3, 1, 5, 5, 2, 5, 1, 1, 3, 4, 10],
[4, 10, 2, 2, 7, 6, 1, 5, 5, 3, 4, 2, 1, 1, 2, 10, 2, 2, 8, 2, 2, 2, 6, 2, 6, 4, 2, 6, 8, 4, 3, 6, 3, 2, 2, 3, 2, 3, 6, 4, 6, 7, 2, 4, 1, 1, 5, 4, 1, 8, 5, 4, 7, 6]
]

/*
BASIC SYMBOLS MAPPING:
1 - basic_8                 
2 - basic_9
3 - basic_10
4 - basic_j
5 - basic_q
6 - basic_k
7 - basic_a
8 - basic_star
10 - placeholder for collectable items

COLLECTABLE ITEMS MAPPING (diamonds...)
1 - item_1
2 - item_2
3 - item_3
4 - item_4
5 - item_5
6 - item_6
7 - item_7
8 - item_8
9 - item_9
10 - item_10" 
*/

// prettier-ignore
const SYMBOLS = [1, 2, 3, 4, 5, 6, 7, 8, 10]
const COLLECTABLE_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COLLECTABLE_WEIGHTS = [23, 22, 20, 18, 14, 12, 9, 7, 5, 4]; // ≈ 1.04122
// const COLLECTABLE_WEIGHTS = [22, 20, 19, 18, 14, 12, 9, 7, 5, 3]; //≈ 0.9618

// console.log(randomDraw(30, 36));

function randomSpin(reels) {
  // 1. Initialize a 3x5 matrix with zeros
  let rez = Array.from({ length: 3 }, () => new Array(5).fill(0));

  // 2. Populate the reels
  for (let j = 0; j < 5; j++) {
    // Columns (0 to 4)
    const len = reels[j].length;
    const r = Math.floor(Math.random() * len);

    // Rows (0 to 2)
    for (let i = 0; i < 3; i++) {
      // wrap r around using modulus (%)
      rez[i][j] = reels[j][(r + i) % len];
    }
  }

  // 3. Second Loop: Replace Collectables
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 3; i++) {
      if (rez[i][j] === 10) {
        // If collectable symbol
        const collectable = weightedRandom(
          COLLECTABLE_ITEMS,
          COLLECTABLE_WEIGHTS
        );
        rez[i][j] = 1000 + collectable;
      }
    }
  }

  return rez;
}

function calcLine(line) {
  const s = line[0]; // Get first symbol (index 0 instead of 1)

  // Check logic: If symbol is 8 OR greater than 10, return 0
  if (s === 8 || s > 10) {
    return 0;
  }

  let cs = 1; // Count symbol, starting at 1

  for (let i = 1; i < 5; i++) {
    if (line[i] === s) {
      cs++;
    } else {
      break;
    }
  }

  if (cs >= 3) {
    return { win: PAYTABLE[s - 1][cs - 3], length: cs };
  } else {
    return 0;
  }
}

function calcSpinLines(spin) {
  let rez = 0;

  // Iterate through every payline
  for (const pl of PAYLINES) {
    const line = pl.map((rowIndex, colIndex) => spin[rowIndex][colIndex]);

    const { win, length } = calcLine(line);

    rez += win;
  }

  return rez;
}

// Assumes getWeightedSample and constants (REELS, collectable_weights) are available
function randomSpinVertical(reels) {
  // Create an Array of 5 slots (Columns),
  const rez = new Array(5);
  const collectables = [];

  for (let j = 0; j < 5; j++) {
    // Loop Columns (Reels) first
    rez[j] = new Array(3); // Create the vertical strip for this reel

    const len = reels[j].length;
    const r = Math.floor(Math.random() * len);
    // console.log(j, r);
    for (let i = 0; i < 3; i++) {
      // Loop Rows (0, 1, 2)
      // Get symbol with wrapping
      let symbol = reels[j][(r + i) % len];

      // Check for Collectable (Logic integrated directly)
      if (symbol === 10) {
        const collectable = weightedRandom(
          COLLECTABLE_ITEMS,
          COLLECTABLE_WEIGHTS
        );
        symbol = 1000 + collectable;
        collectables.push(symbol);
      }

      // Store directly into the column
      rez[j][i] = symbol;
    }
  }

  return { rs: rez, collectables: collectables };
}

function calcSpinLinesVertical(spin) {
  let totalWin = 0;
  let winningLines = []; // initialize array to hold indices

  for (let i = 0; i < PAYLINES.length; i++) {
    const pl = PAYLINES[i];

    const line = pl.map((rowIndex, colIndex) => {
      return spin[colIndex][rowIndex];
    });

    const { win, length } = calcLine(line);

    // if there is a win, save the money AND the index
    if (win > 0) {
      totalWin += win;
      winningLines.push({ lineIndex: i, length: length }); // Push the index (e.g., 0, 4, 12)
    }
  }

  //
  return {
    lw: totalWin,
    winningLines: winningLines,
  };
}

// const ud = {
//   balance: 100,
//   collected: [1001, 1002, 1003], // symbols player collected
// };

function slotFortuneForgeJourney(state) {
  let balance = state.balance;
  let collected = state.collected;
  let newCollected = [];
  let win = 0;

  if (collected.length === 10) {
    collected = [];
  }

  const { rs, collectables } = randomSpinVertical(REELS);
  // const rs = [
  //   [4, 8, 2],
  //   [4, 3, 3],
  //   [3, 8, 3],
  //   [4, 5, 3],
  //   [6, 1, 8],
  // ];
  // const collectables = [1001, 1003];
  const { lw, winningLines } = calcSpinLinesVertical(rs); // line wins
  let sw = 0; // star wins
  let countStar = 0; // count stars
  let scatters = [];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 3; row++) {
      if (rs[col][row] == 8) {
        countStar++;
        scatters.push({ row, col });
      }
    }
  }
  if (countStar === 3) {
    sw = PAYTABLE[7][0];
  } else {
    scatters = [];
  }
  // console.log(rs);
  // console.log(lw, winningLines);
  // console.log(sw);
  // console.log(collectables);

  for (const cl of collectables) {
    if (!collected.includes(cl)) {
      collected.push(cl);
      newCollected.push(cl);
    }
  }

  let collectedWin = 0;
  // if all collected -> great win!!
  if (collected.length === 10) {
    collectedWin = COLLECTED_WIN;
    // collected = [];
  }

  // console.log(collected);
  // console.log(newCollected);

  win = lw + sw + collectedWin;
  const newBalance = (balance += win);

  return {
    reels: rs,
    collected: collected,
    win: win,
    winningLines: winningLines,
    collectedWin: collectedWin,
    balance: newBalance,
    newCollected: newCollected,
    scatters: scatters,
  };
}

// slotFortuneForgeJourney(ud);

export { slotFortuneForgeJourney };
