// shuffle array
function fisherYatesShuffle(array) {
  const result = [];
  for (let i = 0; i < array.length; ++i) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j !== i) {
      result[i] = result[j];
    }
    result[j] = array[i];
  }

  return result;
}

// Example usage:
// let myArray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// const result = fisherYatesShuffle(myArray);
// console.log(result); // Output will be a shuffled version of the array

// ******************************
// random weighted sample:
// input: - array of elements
//        - array of weights
// output: random element from array of elements

function weightedRandom(elements, weights) {
  // Validation
  if (elements.length !== weights.length) {
    throw new Error("Elements and weights arrays must be of equal length");
  }

  if (elements.length === 0) {
    throw new Error("Elements array cannot be empty");
  }

  // Calculate cumulative weights
  let cumulativeWeights = [];
  let sum = 0;

  for (let weight of weights) {
    if (typeof weight !== "number" || weight < 0) {
      throw new Error("Weights must be non-negative numbers");
    }
    sum += weight;
    cumulativeWeights.push(sum);
  }

  // If all weights are zero, treat as uniform distribution
  if (sum === 0) {
    console.warn(
      "All weights are zero - falling back to uniform random sampling"
    );
    return elements[Math.floor(Math.random() * elements.length)];
  }

  // Generate random number in [0, sum) range
  const random = Math.random() * sum;

  // Find the first index where cumulative weight > random number
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (random < cumulativeWeights[i]) {
      return elements[i];
    }
  }

  // Fallback (should theoretically never reach here)
  return elements[elements.length - 1];
}

// // tests weightedRandom:
// const arrElements = [1, 2, 3];
// const arrWeights = [70, 20, 10];
// const rez = [0, 0, 0];
// const N = 10000;
// for (let i = 1; i <= N; i++) {
//   const x = weightedRandom(arrElements, arrWeights);
//   rez[x - 1]++;
// }

// console.log(rez);
// console.log(rez[0] / N, rez[1] / N, rez[2] / N);

// *****************************************************

// intersection of two arrays
function intersection(arr1, arr2) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const rez = [];
  for (const x of set1) {
    if (set2.has(x)) {
      rez.push(x);
    }
  }
  return rez;
}

// *****************************************************

/**
 * Picks a random element from an array.
 *
 * @param {Array<any>} arr The array to pick from.
 * @returns {any | undefined} A random element from the array, or undefined if the array is empty or invalid.
 */
function getRandomElement(arr) {
  // Check if the input is a valid array and has elements
  if (!Array.isArray(arr) || arr.length === 0) {
    return undefined;
  }

  // Calculate a random index within the array's bounds
  const randomIndex = Math.floor(Math.random() * arr.length);

  // Return the element at that random index
  return arr[randomIndex];
}

// --- Example Usage (commented out) ---

/*
// Example with a mixed array:
const myArray = [1, 'apple', 'banana', true, 10.5, 'orange'];
const randomItem = getRandomElement(myArray);
console.log(`The array is: [${myArray.join(', ')}]`);
console.log(`The random element is: ${randomItem}`);

// Example with a number array:
const numbers = [10, 20, 30, 40, 50];
console.log(`Random number: ${getRandomElement(numbers)}`);
*/
// *****************************************************

export { fisherYatesShuffle, weightedRandom, intersection, getRandomElement };
