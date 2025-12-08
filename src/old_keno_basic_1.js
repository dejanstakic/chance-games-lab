import { Application, Graphics, Text, Container } from "pixi.js";

async function start() {
  const canvas = document.getElementById("kenoBasicCanvas");
  const container = document.getElementById("mainArea");

  // --- Helper: Get container dimensions ---
  const getContainerSize = () => ({
    width: container.clientWidth,
    height: container.clientHeight || 600,
  });

  const app = new Application();
  await app.init({
    canvas,
    background: "#333333",
  });

  console.log("Pixi Keno (square grid) initialized ✅");

  const gridContainer = new Container();
  const buttonContainer = new Container();
  app.stage.addChild(gridContainer, buttonContainer);

  const resultText = new Text({
    text: "SELECT UP TO 10 NUMBERS",
    style: { fill: 0xffffff, fontSize: 28 },
  });
  resultText.anchor.set(0.5);
  app.stage.addChild(resultText);

  const selectedNumbers = [];
  const cells = [];

  function drawLayout() {
    const { width: containerW, height: containerH } = getContainerSize();

    // Maintain a proportional 4:3 canvas, centered in container
    const aspectRatio = 4 / 3;
    let canvasW = containerW;
    let canvasH = containerW / aspectRatio;
    if (canvasH > containerH) {
      canvasH = containerH;
      canvasW = canvasH * aspectRatio;
    }

    app.renderer.resize(canvasW, canvasH);
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";

    gridContainer.removeChildren();
    buttonContainer.removeChildren();

    const gridSize = 6;
    const padding = 8;

    // Make the grid itself perfectly square and centered
    const gridSide = Math.min(canvasW * 0.9, canvasH * 0.6);
    const cellSize = (gridSide - (gridSize - 1) * padding) / gridSize;
    const gridStartX = (canvasW - gridSide) / 2;
    const gridStartY = (canvasH - gridSide) / 2 - canvasH * 0.05; // small upward shift

    cells.length = 0;

    // --- Grid creation ---
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const number = row * gridSize + col + 1;
        const cell = new Container();
        cell.x = gridStartX + col * (cellSize + padding);
        cell.y = gridStartY + row * (cellSize + padding);
        cell.eventMode = "static";
        cell.cursor = "pointer";

        const bg = new Graphics()
          .roundRect(0, 0, cellSize, cellSize, 10)
          .fill({ color: 0x555555 });
        cell.addChild(bg);

        const label = new Text({
          text: number.toString(),
          style: { fill: 0xffffff, fontSize: cellSize * 0.4 },
        });
        label.anchor.set(0.5);
        label.position.set(cellSize / 2, cellSize / 2);
        cell.addChild(label);

        cell.on("pointerdown", () => {
          const idx = selectedNumbers.indexOf(number);
          if (idx === -1) {
            if (selectedNumbers.length >= 10) return;
            selectedNumbers.push(number);
            bg.tint = 0x00aa00;
          } else {
            selectedNumbers.splice(idx, 1);
            bg.tint = 0xffffff;
          }
        });

        gridContainer.addChild(cell);
        cells.push({ number, bg });
      }
    }

    // --- Result text ---
    resultText.position.set(canvasW / 2, gridStartY - 40);

    // --- Play button ---
    const btnWidth = canvasW * 0.3;
    const btnHeight = canvasH * 0.08;

    const bgBtn = new Graphics()
      .roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12)
      .fill({ color: 0x0077ff });
    buttonContainer.addChild(bgBtn);

    const labelBtn = new Text({
      text: "PLAY",
      style: { fill: 0xffffff, fontSize: btnHeight * 0.5 },
    });
    labelBtn.anchor.set(0.5);
    buttonContainer.addChild(labelBtn);

    buttonContainer.x = canvasW / 2;
    buttonContainer.y = gridStartY + gridSide + 70;

    buttonContainer.eventMode = "static";
    buttonContainer.cursor = "pointer";
    buttonContainer.removeAllListeners();

    buttonContainer.on("pointerdown", async () => {
      bgBtn.tint = 0x0055cc;
      try {
        const res = await fetch("/api/keno_basic/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected: selectedNumbers }),
        });
        const data = await res.json();
        console.log(data);
        resultText.text = `SERVER RESULT: ${JSON.stringify(data)}`;
        // highlight cells
        // cells.forEach(({ number, bg }) => {
        //   if (data.draw.includes(number)) bg.tint = 0xffcc00;
        // });
      } catch (err) {
        console.error(err);
        resultText.text = "ERROR contacting server";
      } finally {
        bgBtn.tint = 0x0077ff;
      }
    });
  }

  drawLayout();
  window.addEventListener("resize", drawLayout);
}

start();
