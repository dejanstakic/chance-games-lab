// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pays for win for that numbers
// prettier-ignore
const PAYTABLE = [[0, 0, 45, 65,  85],  // 1  - index 0
                  [0, 0, 50, 75, 100],  // 2  - index 1
                  [0, 0, 40, 60,  80],  // 3
                  [0, 0, 30, 50,  70],  // 4
                  [0, 0, 10, 20,  30],  // 5
                  [0, 0,  5, 10,  20],  // 6
                  [0, 0, 0.75, 3,  5],  // 7 
                  [0, 0, 0.5,  1,  2]   // 8
                 ]

const SCATTERPAY = [0, 0, 4, 20, 50]; // symbol 9

// prettier-ignore
const PAYLINES = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 1, 0, 1, 0],
  [1, 2, 1, 2, 1], [1, 0, 1, 0, 1], [2, 1, 2, 1, 2]
];

// prettier-ignore
const REELS = [
  [9, 2, 8, 3, 8, 8, 8, 4, 8, 7, 6, 5, 1, 4, 5, 8, 8, 8, 4, 8, 6, 7],
  [6, 9, 5, 6, 4, 3, 2, 5, 3, 7, 8, 8, 1, 7, 7, 6, 7, 5, 3, 4, 7],
  [9, 8, 8, 4, 7, 8, 7, 5, 8, 7, 4, 3, 1, 7, 6, 8, 5, 2, 8, 7, 4, 6, 7, 8, 8, 7, 7, 8, 7, 7],
  [8, 9, 6, 7, 5, 4, 8, 3, 6, 4, 8, 6, 1, 8, 7, 3, 4, 5, 2, 3, 7, 3, 2, 4, 7, 7],
  [9, 2, 5, 8, 3, 8, 8, 5, 8, 8, 6, 5, 1, 3, 5, 6, 7, 4, 7, 4, 5, 5, 4, 6, 3, 2],
]

// Calculates the payout for a specific line - array of 5 elements.
function calcLine(line) {
  const s = line[0]; //

  // if scatter return 0
  if (s === 9) {
    return { win: 0, length: 1 };
  }

  // if the first symbol is not wild
  if (s !== 1) {
    let cs = 1;
    // Loop from 2nd element to 5th element (indices 1 to 4)
    for (let i = 1; i < 5; i++) {
      if (line[i] === s || line[i] === 1) {
        cs++;
      } else {
        break;
      }
    }
    // return [PAYTABLE[s - 1][cs - 1], [s, cs]];
    return { win: PAYTABLE[s - 1][cs - 1], length: cs }; // we don't need what symbol - s
  }

  // if the first symbol is wild
  if (s === 1) {
    let cw = 1;
    let simb = 0;

    // Find the first non-wild symbol
    for (let i = 1; i < 5; i++) {
      if (line[i] === 1) {
        cw++;
      } else {
        simb = line[i]; // first non-wild
        break;
      }
    }

    // Return if line is 5 wilds or next symbol is scatter
    if (cw === 5 || simb === 9) {
      return { win: PAYTABLE[s - 1][cw - 1], length: cw };
    }

    // Calculate count for first non-wild symbol
    let c = 0;
    for (let i = 0; i < 5; i++) {
      // Loop whole line (indices 0 to 4)
      if (line[i] === simb || line[i] === 1) {
        c++;
      } else {
        break;
      }
    }

    // compare payouts: wild vs first non-wild symbol
    // returns the higher paying combination
    if (PAYTABLE[s - 1][cw - 1] >= PAYTABLE[simb - 1][c - 1]) {
      return { win: PAYTABLE[s - 1][cw - 1], length: cw }; // [PAYTABLE[s][cw], [s, cw]];
    } else {
      return { win: PAYTABLE[simb - 1][c - 1], length: c }; // [PAYTABLE[simb][c], [simb, c]];
    }
  }
}

// test function calcLine
// const lines = [
//   [1, 1, 1, 2, 1],
//   [1, 1, 1, 1, 1],
//   [9, 1, 1, 1, 1],
//   [2, 1, 3, 1, 1],
// ];
// for (let l of lines) {
//   console.log(l, " -> ", calcLine(l));
// }

function randomSpin(reels) {
  // 1. Initialize a 3x5 matrix with zeros.
  // We use an array of 3 arrays (rows), each length 5 (cols).
  let rez = Array.from({ length: 3 }, () => new Int8Array(5).fill(0));

  // 2. Populate the matrix with random reel positions
  for (let j = 0; j < 5; j++) {
    const reelLength = reels[j].length;
    // Get random index (0 to length-1)
    const r = Math.floor(Math.random() * reelLength);

    for (let i = 0; i < 3; i++) {
      let symbolIndex = (r + i) % reelLength;
      rez[i][j] = reels[j][symbolIndex];
    }
  }

  // 3. Expand Wilds (if column contains 1, fill column with 1s)
  for (let j = 0; j < 5; j++) {
    let hasOne = false;

    // Check if current column j contains the symbol 1
    for (let i = 0; i < 3; i++) {
      if (rez[i][j] === 1) {
        hasOne = true;
        break;
      }
    }

    // If 1 is found, fill the whole column with 1s
    if (hasOne) {
      for (let i = 0; i < 3; i++) {
        rez[i][j] = 1;
      }
    }
  }

  return rez;
}
// console.log(randomSpin(REELS));

// returns array of spins, first one is with wild replaced if any
function randomSpinVertical(reels) {
  // Create an Array of 5 slots (Columns),
  const rez = new Array(5);
  // const collectables = [];

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

      // Store directly into the column
      rez[j][i] = symbol;
    }
  }
  // console.log(rez);
  const rez1 = new Array(5);
  let anyOne = false;
  for (let j = 0; j < 5; j++) {
    let hasOne = false;
    rez1[j] = new Array(3);
    // Check if current column j contains the symbol 1
    for (let i = 0; i < 3; i++) {
      rez1[j][i] = rez[j][i]; // copy symbol
      if (rez[j][i] === 1) {
        hasOne = true;
        anyOne = true;
        break;
      }
    }

    // If 1 is found, fill the whole column with 1s
    if (hasOne) {
      for (let i = 0; i < 3; i++) {
        rez1[j][i] = 1;
      }
    }
  }
  if (anyOne) {
    return [rez1, rez];
  } else {
    return [rez];
  }
}
// console.log(randomSpinVertical(REELS));

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
// const rs = randomSpinVertical(REELS);
// const rez = calcSpinLinesVertical(rs[0]);
// console.log(rs);
// console.log(rez);

function slotExpandingWilds(balance) {
  balance = balance - 9;
  let win = 0;

  const rs = randomSpinVertical(REELS);
  const { lw, winningLines } = calcSpinLinesVertical(rs[0]); // line wins
  // console.log(lw);
  let sw = 0; // scatter win
  let scatterCount = 0; // count stars
  let scatters = [];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 3; row++) {
      if (rs[0][col][row] == 9) {
        scatterCount++;
        scatters.push({ row, col });
      }
    }
  }
  if (scatterCount > 0) {
    sw = SCATTERPAY[scatterCount - 1];
  }
  // console.log(sw);

  if (scatterCount < 3) scatters = [];

  // console.log(rs);
  // console.log(lw, winningLines);
  // console.log(sw);
  // console.log(scatters);

  win = lw + sw;
  const newBalance = balance + win;

  return {
    reels: rs,
    win: win,
    winningLines: winningLines,
    balance: newBalance,
    scatters: scatters,
  };
}

// const ew = slotExpandingWilds(100);
// console.log(ew);

export { slotExpandingWilds };
