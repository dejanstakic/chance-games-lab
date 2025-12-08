function generateResult() {
  // Simple logic for now
  const randomNumber = Math.floor(Math.random() * 100);
  //   const win = randomNumber > 80 ? "WIN" : "LOSE"; // example rule

  return {
    result: randomNumber,
    // win,
  };
}

export { generateResult };
