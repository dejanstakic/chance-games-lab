import { Application, Graphics, Text, Container } from "pixi.js";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");
const RACE_DURATION = 30 * 1000; // race lasts 30 seconds
const FINISH_X = 750; // finish line position
const RACER_COUNT = 6;

async function start() {
  const canvas = document.getElementById("virtualRaceCanvas");

  const aspectRatio = 4 / 3;
  let width = Math.min(window.innerWidth, 980);
  let height = width / aspectRatio;

  if (height > Math.min(window.innerHeight, 735)) {
    height = Math.min(window.innerHeight, 735);
    width = height * aspectRatio;
  }

  const getContainerSize = () => ({ width, height });

  const app = new Application();
  await app.init({
    canvas,
    background: "#2e2e2e",
  });

  const racers = [];
  //   const racerData = []; // internal physics data
  const trackHeight = 50;

  for (let i = 0; i < RACER_COUNT; i++) {
    const g = new Graphics();
    g.circle(0, 0, 15);
    g.fill(0xffffff * Math.random());
    g.x = 50;
    g.y = 80 + i * trackHeight;
    app.stage.addChild(g);
    racers.push(g);
  }

  let currentRace = null;
  //   let startTime = null;

  socket.on("race_result", (data) => {
    console.log("Server winner (for display):", data.winner);
  });

  let raceRunning = false;
  let raceStartTime = null;
  let winner = null;
  let raceData = null;

  socket.on("race_start", (race) => {
    currentRace = race;
    raceData = race;
    raceRunning = false;
    winner = null;

    // reset positions
    racers.forEach((r) => (r.x = 50));
  });

  app.ticker.add(() => {
    if (!raceData) return;

    const now = Date.now();

    if (!raceRunning && now >= raceData.startTime) {
      raceRunning = true;
      raceStartTime = now;
      console.log("Race started!");
    }

    if (!raceRunning) return;
    if (winner) return;

    const elapsed = (now - raceStartTime) / 1000; // seconds

    raceData.racers.forEach((racer, i) => {
      let v = racer.startVelocity;

      // apply any changes that have happened
      for (const c of racer.changes) {
        if (elapsed >= c.time) v = c.newV;
        else break;
      }

      // integrate motion
      racers[i].x += (v * app.ticker.deltaMS) / 1000;

      // check finish
      if (racers[i].x >= raceData.finishX && !winner) {
        winner = racer.id;
        console.log("🏁 Winner:", winner);
      }
    });
  });
}

start();
