import { weightedRandom } from "./utils/utils.js";

const SYMBOLS = [0, 1, 2, 3, 5, 8, 10, 15, 20];
// const SYMBOL_WEIGHTS = [900, 49, 20, 11, 6.5, 4, 3, 2, 1];  // BET 75
const SYMBOL_WEIGHTS = [900, 44, 19, 12, 8, 6, 5, 3, 2]; // BET 100

const INITIAL_RESPINS = 3;
const BET = 100;

function hold81Spin(balance) {
  let respins = INITIAL_RESPINS;
  const steps = [];

  let totalWin = 0;
  const grid = [[0, 0, 0, 0, 0, 0, 0, 0, 0]];
  let filled = 0;
  while (respins > 0 && filled < 81) {
    // object that is send
    const step = {};
    step.stepIndex = steps.length;

    // respins
    step.respinsBefore = respins;
    respins--;
    // active grids
    step.activeGrids = [];
    for (let i = 0; i < grid.length; i++) {
      step.activeGrids.push(i);
    }
    // reset filled for  counting
    step.win = 0;
    step.spinResults = [];
    filled = 0;

    // proces grid
    for (let g = 0; g < grid.length; g++) {
      const gd = grid[g];
      for (let i = 0; i < gd.length; i++) {
        if (gd[i] === 0) {
          //znaci da ga treba vrteti
          const s = weightedRandom(SYMBOLS, SYMBOL_WEIGHTS);
          if (s > 0) {
            respins = INITIAL_RESPINS;
            gd[i] = s;
            step.win += gd[i]; //
            totalWin += gd[i];
          }
          // ubaci rezultat vrtenja
          step.spinResults.push({ gridId: g, cellId: i, value: s });
        }

        if (gd[i] > 0) filled++;
      }
    }
    steps.push(step);

    // check for new grids
    step.newGridsUnlocked = [];
    const activeGridCount = grid.length;
    if (filled >= 6 * grid.length && activeGridCount < 9) {
      grid.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      step.newGridsUnlocked.push(grid.length - 1);
    }

    step.respinsAfter = respins;
  }
  let gameOverReason = null;
  if (respins === 0) gameOverReason = "NO_RESPINS";
  else if (filled === 81) gameOverReason = "GRID_FULL";
  const newBalance = balance - BET + totalWin;
  // console.log(`balance: ${balance},   novi balance: ${newBalance}`);
  const result = {
    // initialState: initialState,
    steps: steps,
    totalWin: totalWin,
    gameOverReason: gameOverReason,
    balance: newBalance,
  };
  return result;
}

// const sp = spin();
// for (const s of sp.steps) {
//   console.log(s);
// }
// console.log(sp.totalWin);
// console.log(sp.gameOverReason);

export { hold81Spin };
