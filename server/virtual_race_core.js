// server/virtual_race_core.js

export function generateRace() {
  const raceId = Date.now();
  const startTime = Date.now() + 10000; // 10s countdown
  const finishX = 750;
  const duration = 25; // seconds (for schedule info)
  const racerCount = 6;

  const racers = [];

  for (let i = 0; i < racerCount; i++) {
    const startVelocity = 90 + Math.random() * 40;
    const changes = [];

    let t = 0;
    while (t < duration) {
      t += 2 + Math.random() * 3; // change every 2–5 sec
      if (t < duration) {
        const newV = 80 + Math.random() * 70; // 80–150 px/s
        changes.push({ time: t, newV });
      }
    }

    racers.push({ id: i + 1, startVelocity, changes });
  }

  return { id: raceId, startTime, finishX, duration, racers };
}

// export { generateRace, getCurrentRace, RACE_INTERVAL, RACE_DURATION };
