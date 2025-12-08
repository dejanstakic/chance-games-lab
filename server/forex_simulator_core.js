import { weightedRandom } from "./utils/utils.js";

const MOVES = [-1, 0, 1];
const MOVE_WIGHTS = [0.25, 0.5, 0.25];

function newChange() {
  return weightedRandom(MOVES, MOVE_WIGHTS);
}

// console.log(newChange());

export { newChange };
