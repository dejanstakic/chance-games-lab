// import { Application, Graphics, Text, Container } from "pixi.js";
const { Application, Graphics, Text, Container } = PIXI;

async function start() {
  const canvas = document.getElementById("gameCanvas1");

  const app = new Application();
  await app.init({
    canvas,
    width: 800,
    height: 600,
    background: "#333333",
  });

  // console.log("Pixi initialized ✅ (no deprecations)");

  // --- RESULT text ---
  const resultText = new Text({
    text: "RESULT: ?",
    style: { fill: 0xffffff, fontSize: 36 },
  });
  resultText.anchor.set(0.5, 0);
  resultText.position.set(app.renderer.width / 2, 40);
  app.stage.addChild(resultText);

  // --- GO button container ---
  const button = new Container();
  button.x = app.renderer.width / 2;
  button.y = app.renderer.height / 2;
  button.eventMode = "static";
  button.cursor = "pointer";

  // --- Button background (new syntax) ---
  const bg = new Graphics()
    .roundRect(-80, -35, 160, 70, 12)
    .fill({ color: 0x0077ff }); // modern Pixi 8 fill API
  button.addChild(bg);

  // --- Button label ---
  const label = new Text({
    text: "GO",
    style: { fill: 0xffffff, fontSize: 32 },
  });
  label.anchor.set(0.5);
  label.position.set(0, 0);
  button.addChild(label);

  app.stage.addChild(button);

  // --- Interaction handler ---
  button.on("pointerdown", async () => {
    bg.tint = 0x0055cc;

    try {
      const res = await fetch("/api/game_1/spin");
      const data = await res.json();
      resultText.text = `RESULT: ${data.result}`;
    } catch (err) {
      console.error(err);
      resultText.text = "RESULT: (error)";
    } finally {
      bg.tint = 0x0077ff;
    }
  });
}

start();
