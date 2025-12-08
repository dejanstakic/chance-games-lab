import { Application, Graphics, Text, Container } from "pixi.js";

async function start() {
  const canvas = document.getElementById("kenoBasicCanvas");
  const container = document.getElementById("mainArea");

  const getContainerSize = () => ({
    width: container.clientWidth,
    height: container.clientHeight || 600,
  });

  const app = new Application();
  await app.init({
    canvas,
    background: "#333333",
  });

  console.log("Pixi Keno (square grid + CLEAR) initialized ✅");

  const gridContainer = new Container();
  const uiContainer = new Container();
  app.stage.addChild(gridContainer, uiContainer);

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
    uiContainer.removeChildren();

    const gridSize = 6;
    const padding = 8;
    const gridSide = Math.min(canvasW * 0.9, canvasH * 0.6);
    const cellSize = (gridSide - (gridSize - 1) * padding) / gridSize;
    const gridStartX = (canvasW - gridSide) / 2;
    const gridStartY = (canvasH - gridSide) / 2; //- canvasH * 0.05;

    cells.length = 0;

    // --- GRID ---
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

        // Selection logic
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

    // --- RESULT TEXT ---
    resultText.position.set(canvasW / 2, gridStartY - 40);

    // --- BUTTONS ---
    const btnWidth = canvasW * 0.25;
    const btnHeight = canvasH * 0.08;
    const buttonY = gridStartY + gridSide + 70;

    // Helper for creating buttons
    function createButton(labelText, color, onClick) {
      const btn = new Container();
      const bg = new Graphics()
        .roundRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12)
        .fill({ color });
      btn.addChild(bg);

      const label = new Text({
        text: labelText,
        style: { fill: 0xffffff, fontSize: btnHeight * 0.5 },
      });
      label.anchor.set(0.5);
      btn.addChild(label);

      btn.eventMode = "static";
      btn.cursor = "pointer";

      btn.on("pointerdown", async () => {
        bg.tint = 0x0055cc;
        await onClick();
        bg.tint = 0xffffff;
        bg.tint = color;
      });

      return btn;
    }

    // --- PLAY BUTTON ---
    const playButton = createButton("PLAY", 0x0077ff, async () => {
      try {
        const res = await fetch("/api/keno_basic/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected: selectedNumbers }),
        });
        const data = await res.json();
        // resultText.text = `DRAW: ${data.draw.join(", ")}`;
        resultText.text = `DRAW: ${JSON.stringify(data)}`;

        // Highlight drawn numbers
        // cells.forEach(({ number, bg }) => {
        //   if (data.draw.includes(number)) bg.tint = 0xffcc00;
        // });
      } catch (err) {
        console.error(err);
        resultText.text = "ERROR contacting server";
      }
    });

    // --- CLEAR BUTTON ---
    const clearButton = createButton("CLEAR", 0xff4444, async () => {
      selectedNumbers.length = 0;
      cells.forEach(({ bg }) => (bg.tint = 0xffffff));
      //   resultText.text = "CLEARED";
    });

    // Position both buttons side-by-side
    const spacing = canvasW * 0.1;
    playButton.x = canvasW / 2 - btnWidth / 2 - spacing / 2;
    playButton.y = buttonY;

    clearButton.x = canvasW / 2 + btnWidth / 2 + spacing / 2;
    clearButton.y = buttonY;

    uiContainer.addChild(playButton, clearButton);
  }

  drawLayout();
  window.addEventListener("resize", drawLayout);
}

start();
