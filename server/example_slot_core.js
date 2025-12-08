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

// prettier-ignore
const numberValues = [1, 2, 3, 5, 8, 10, 12, 15, 20, 25, 50, 100]
const symbols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const symbolWeights = [10, 10, 10, 10, 10, 10, 10, 2, 10, 15];
// console.log(randomDraw(30, 36));

function exampleSlot(userData) {
  console.log("user data from ..._core: ");
  // if (userData.hasOwn(balance)) console.log(userData.balance);
  console.log(userData.balance);
  console.log(userData.collected);

  let balance = userData.balance - 1;
  let collectedCollectors = userData.collected;
  let win = 0;

  let collectPrize = 0;
  let allPrizes = 0;

  const d = Array.from({ length: 5 }, () =>
    // Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 10))
    Array.from({ length: 3 }, () => weightedRandom(symbols, symbolWeights))
  );

  let found8 = false;
  // if symbol 8 - "evil 8" empty collected collectors
  for (let i = 0; i < d.length; i++) {
    for (let j = 0; j < d[i].length; j++) {
      if (d[i][j] === 8) {
        collectedCollectors = [];
        found8 = true;
        console.log("bese 8 ...");
      }
    }
  }

  // if there is no 8 to cancel all:
  // collect prize if symbol 9 is on reels:
  // every symbol collect all prizes:
  // sum all prizes and multiplie with number of symbol 9 appearences
  if (!found8) {
    for (let i = 0; i < d.length; i++) {
      for (let j = 0; j < d[i].length; j++) {
        if (d[i][j] === 9) {
          collectPrize += 1;
          if (collectedCollectors.length < 10) collectedCollectors.push(9);
        }
      }
    }
    if (collectedCollectors.length === 10) {
      // bingooo!!!
    }
  }

  // get random prize on symbol 10
  for (let i = 0; i < d.length; i++) {
    for (let j = 0; j < d[i].length; j++) {
      if (d[i][j] === 10) {
        const randomPrize = getRandomElement(numberValues);
        d[i][j] = 1000 + randomPrize;
        if (collectPrize > 0 && !found8)
          allPrizes += collectPrize * randomPrize;
      }
    }
  }

  // console.log(d);
  const newBalance = (balance += allPrizes);

  return {
    reels: d,
    collected: collectedCollectors,
    win: allPrizes,
    balance: newBalance,
  };
}

// exampleSlot();

export { exampleSlot };
