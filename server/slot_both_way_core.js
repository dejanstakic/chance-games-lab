// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pays for win for that numbers
// prettier-ignore
const PAYTABLE = [[0, 0, 15, 30, 100],  // 1
                  [0, 0, 10, 20, 70],   // 2
                  [0, 0, 8, 15, 50],    // 3
                  [0, 0, 6, 10, 30],    // 4
                  [0, 0, 2,  8, 15],    // 5
                  [0, 0, 1,  2,  5],    // 6
                  [0, 0, 0.5, 1, 2],    // 7
                  [0, 0, 0,	0, 0]       // symbol 8 - WILD !!
                 ]

// prettier-ignore
const PAYLINES = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]
];

// prettier-ignore
const REELS = [
  [1, 5, 6, 6, 3, 2, 4, 7, 4, 7, 4, 1, 6, 3, 5, 7, 7, 6, 6, 4], 
  [1, 4, 7, 7, 3, 2, 6, 3, 5, 5, 6, 2, 4, 6, 7, 3, 2, 5, 4, 4], 
  [8, 2, 6, 1, 5, 3, 4, 2, 5, 6, 7, 4, 7, 6, 5, 7, 7, 3, 2, 6, 6, 6], 
  [1, 3, 5, 7, 2, 6, 6, 5, 3, 7, 4, 2, 3, 4, 7, 5, 6, 3, 2, 7], 
  [1, 4, 7, 7, 2, 4, 5, 7, 4, 3, 6, 6, 3, 5, 6, 6, 4, 4, 7, 7],
]

// Calculates the payout for a specific line - array of 5 elements.
// line left to right
function calcLineLeft(line) {
  const s = line[0]; // first symbol
  let cs = 1; // count of first symbol
  for (let i = 1; i < line.length; i++) {
    // if symbol or wild
    if (line[i] === s || line[i] === 8) {
      cs++;
    } else {
      break;
    }
  }

  return { winLeft: PAYTABLE[s - 1][cs - 1], symbolLeft: s, lengthLeft: cs }; //paytable[s,cs-2], (s, cs)
}

// line right to left
function calcLineRight(line) {
  const s = line[line.length - 1]; // first symbol
  let cs = 1; // count of first symbol
  for (let i = line.length - 2; i >= 0; i--) {
    // if symbol or wild
    if (line[i] === s || line[i] === 8) {
      cs++;
    } else {
      break;
    }
  }

  return { winRight: PAYTABLE[s - 1][cs - 1], symbolRight: s, lengthRight: cs }; //paytable[s,cs-2], (s, cs)
}

// test functions for calculate lines
const lines = [
  [1, 1, 1, 2, 1],
  [5, 5, 8, 1, 1],
  [7, 1, 1, 1, 1],
  [2, 1, 3, 1, 1],
];
// console.log("Left to right: ");
// for (const l of lines) {
//   console.log(l, " -> ", calcLineLeft(l));
// }
// console.log();
// console.log("Right to left: ");
// for (const l of lines) {
//   console.log(l, " -> ", calcLineRight(l));
// }

//
function randomSpinVertical(reels) {
  // Create an Array of 5 slots (Columns),
  const rez = new Array(5);

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
  return rez;
}
// console.log(randomSpinVertical(REELS));

function calcSpinLinesVertical(spin) {
  let totalWin = 0;
  let winningLinesLeft = []; // initialize array to hold indices - left win
  let winningLinesRight = []; // initialize array to hold indices - right win

  for (let i = 0; i < PAYLINES.length; i++) {
    const pl = PAYLINES[i];

    const line = pl.map((rowIndex, colIndex) => {
      return spin[colIndex][rowIndex];
    });

    const { winLeft, symbolLeft, lengthLeft } = calcLineLeft(line);
    const { winRight, symbolRight, lengthRight } = calcLineRight(line);

    // if there is a left win, save the money AND the index
    if (winLeft > 0) {
      totalWin += winLeft;
      winningLinesLeft.push({ lineIndex: i, length: lengthLeft }); // Push the index (e.g., 0, 4, 12)
    }

    // if there is a right win, save the money AND the index
    if (winRight > 0) {
      totalWin += winRight;
      winningLinesRight.push({ lineIndex: i, length: lengthRight }); // Push the index (e.g., 0, 4, 12)
    }
  }

  //
  return {
    totalWin: totalWin,
    winningLinesLeft: winningLinesLeft,
    winningLinesRight: winningLinesRight,
  };
}
// const rs = randomSpinVertical(REELS);
// const rez = calcSpinLinesVertical(rs);
// console.log(rs);
// console.log(rez);

function slotBothWay(balance) {
  balance = balance - 1;
  // let win = 0;

  const rs = randomSpinVertical(REELS);
  const { totalWin, winningLinesLeft, winningLinesRight } =
    calcSpinLinesVertical(rs); // line wins
  // console.log(totalWin);

  // console.log(rs);
  // console.log(lw, winningLines);

  // win = lw + sw;
  const newBalance = balance + totalWin;

  return {
    reels: rs,
    win: totalWin,
    winningLinesLeft: winningLinesLeft,
    winningLinesRight: winningLinesRight,
    balance: newBalance,
  };
}

// const bw = slotBothWay(100);
// console.log(bw);

export { slotBothWay };
