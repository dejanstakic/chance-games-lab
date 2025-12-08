import { weightedRandom } from "./utils/utils.js";

const NUM_STATES = 13;
const STATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const D = 2;
// prettier-ignore
const PAYTABLE = {1: D, 2: 0.0, 3: D, 4: 0.0, 5: D, 6: 0.0, 7: D, 8: D, 9: D, 10: D, 11: D, 12: 0.0, 13: 1.0, };
// prettier-ignore
const INITIAL_PROBABILITIES = [1/8, 0, 1/8, 0, 1/8, 0, 1/8, 1/8, 1/8, 1/8, 1/8, 0, 0] // uvek pocinje sa dobitkom
// prettier-ignore
const TERMINAL_STATES = [2,4,6,12, NUM_STATES]

const P = Array.from({ length: NUM_STATES }, () => Array(NUM_STATES).fill(0));
for (let i = 0; i < NUM_STATES; i++) {
  for (let j = 0; j < NUM_STATES; j++) {
    if (TERMINAL_STATES.includes(i + 1)) {
      P[i][j] = i === j ? 1 : 0;
    } else {
      P[i][j] = i === j ? 0 : 1 / (NUM_STATES - 1); // equal probabilities
    }
  }
}

// const cs = 5;
// for (let i = 0; i < 10; i++) {
//   // console.log(sample(STATES, P[cs - 1]));
//   const { walk, rez } = randWalk(
//     STATES,
//     INITIAL_PROBABILITIES,
//     TERMINAL_STATES,
//     PAYTABLE,
//     P
//   );
//   for (let j = 1; j < walk.length; j++) {
//     if (walk[j] === walk[j - 1]) {
//       console.log(walk);
//     }
//   }
// }

// Helper: sample from array with given weights
function sample(states, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  const r = Math.random() * total;
  let cum = 0;
  for (let i = 0; i < states.length; i++) {
    cum += weights[i];
    if (r < cum) return states[i];
  }
  return states[states.length - 1]; // fallback
}

// Equivalent of: function calc_walk(arr, payt)
function calcWalk(arr, payt) {
  let s = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    s += payt[arr[i]];
  }
  return s * payt[arr[arr.length - 1]];
}

// Equivalent of: function rand_walk(sts, initPr, termSts, payt)
function randWalk(sts, initPr, termSts, payt, P) {
  // Choose initial state based on initPr
  let initialState = sample(sts, initPr);
  let walk = [initialState];
  let rez = payt[initialState];

  while (true) {
    // Sample next state from transition probabilities P[currentState][:]
    const currentState = walk[walk.length - 1];
    const newState = sample(sts, P[currentState - 1]);

    walk.push(newState);

    if (termSts.includes(newState)) {
      rez *= payt[newState];
      break;
    } else {
      rez += payt[newState];
    }
  }

  return { walk, rez };
}

// console.log(
//   randWalk(STATES, INITIAL_PROBABILITIES, TERMINAL_STATES, PAYTABLE, P)
// );

function crazyJumper(balance) {
  const rW = randWalk(
    STATES,
    INITIAL_PROBABILITIES,
    TERMINAL_STATES,
    PAYTABLE,
    P
  );
  // const win = 1;
  const newBalance = balance + rW.rez;

  return {
    states: rW.walk,
    win: rW.rez,
    balance: newBalance,
  };
}

// console.log(crazyJumper(100));

export { crazyJumper };
