// import { Application, Graphics, Text, Container } from "pixi.js";
// import { gsap } from "gsap";

const { Application, Graphics, Text, Container } = PIXI;

// PAYTABLE - 2D array -
// row - number of selected numbers
// col - pyas for win for that numbers
// prettier-ignore
const PAYTABLE = [[3.84], 
                  [2.1, 3.3], 
                  [1.3, 2.5, 3.9], 
                  [1, 1.7, 3, 4.4], 
                  [0.8, 1, 2.5, 3.5, 6.4], 
                  [0.4, 0.8, 2, 3, 5, 7.2], 
                  [0.2, 0.5, 1.5, 2.5, 4, 5.5, 12], 
                  [0, 0.4, 1, 2, 3, 3.7, 8, 20], 
                  [0, 0, 0.8, 1.2, 2, 3, 4.6, 12, 40], 
                  [0, 0, 0, 1, 1.5, 2, 3, 6, 20, 60]
                  ]

async function start() {
  const canvas = document.getElementById("kenoStopBallCanvas");
  // const container = document.getElementById("mainArea");

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
    background: "#333333",
  });

  //layout variables
  let canvasW, canvasH;
  let gridStartX, gridStartY, gridWidth, gridHeight, cellSize; // gridSide
  let balance = 1000.0; // starting balance

  // console.log("Keno Basic initialized ✅");

  const gridContainer = new Container();
  const uiContainer = new Container();
  const resultContainer = new Container(); // new for result cells
  const hudContainer = new Container(); // HUD for balance text
  app.stage.addChild(hudContainer, gridContainer, resultContainer, uiContainer);

  const selectedNumbers = [];
  const cells = [];

  // --- Balance text ---
  const balanceText = new Text({
    text: `Balance: ${balance.toFixed(2)}`,
    style: { fill: 0xffffff, fontSize: 28 },
  });
  balanceText.anchor.set(1, 0); // right-top corner
  hudContainer.addChild(balanceText);

  // --- INFO button ---
  const infoButton = new Text({
    text: "ⓘ INFO",
    style: {
      fill: 0xffffff,
      fontSize: 28,
      fontWeight: "bold",
      cursor: "pointer",
    },
  });
  infoButton.anchor.set(0, 0);
  infoButton.position.set(20, 20);
  infoButton.eventMode = "static";
  infoButton.cursor = "pointer";
  hudContainer.addChild(infoButton);

  // --- Win amount text ---
  const winText = new Text({
    text: "Bet: 1\nWin: \nHits: ",
    style: { fill: 0xffff00, fontSize: 28 }, // yellow text
  });
  winText.anchor.set(0, 0); // top-left corner anchor
  hudContainer.addChild(winText);

  // --- Paytable info text container ---
  const paytableContainer = new Container();
  hudContainer.addChild(paytableContainer);

  // --- Info overlay container ---
  const infoOverlay = new Container();
  infoOverlay.visible = false; // hidden initially
  app.stage.addChild(infoOverlay);

  // semi-transparent dark background over the entire game
  const overlayBg = new Graphics()
    .rect(0, 0, app.renderer.width, app.renderer.height)
    .fill({ color: 0x000000, alpha: 0.8 });
  infoOverlay.addChild(overlayBg);

  // main info box
  const boxWidth = app.renderer.width * 0.8;
  const boxHeight = app.renderer.height * 0.7;
  const infoBox = new Graphics()
    .roundRect(
      (app.renderer.width - boxWidth) / 2,
      (app.renderer.height - boxHeight) / 2,
      boxWidth,
      boxHeight,
      16
    )
    .fill({ color: 0x222244 });
  infoOverlay.addChild(infoBox);

  // help text
  const helpText = new Text({
    text: `
KENO STOP SHOT
• RTP: 96.12%
• Select up to 10 numbers.
• Press PLAY to start the draw.
• Match numbers to win based on the paytable.
• Your balance decreases by 1 per play.
• Winnings are shown on the right.

Good luck!!
  `,
    style: {
      fill: 0xffffff,
      fontSize: 24,
      wordWrap: true,
      wordWrapWidth: boxWidth * 0.9,
      lineHeight: 36,
    },
  });
  helpText.anchor.set(0.5, 0);
  helpText.position.set(
    app.renderer.width / 2,
    (app.renderer.height - boxHeight) / 2 + 50
  );
  infoOverlay.addChild(helpText);

  // close button
  const closeButton = new Text({
    text: "✖ CLOSE",
    style: {
      fill: 0xff4444,
      fontSize: 28,
      fontWeight: "bold",
      cursor: "pointer",
    },
  });
  closeButton.anchor.set(0.5);
  closeButton.position.set(
    app.renderer.width / 2,
    (app.renderer.height + boxHeight) / 2 - 40
  );
  closeButton.eventMode = "static";
  closeButton.cursor = "pointer";
  infoOverlay.addChild(closeButton);

  infoButton.on("pointerdown", () => {
    infoOverlay.visible = true;
  });

  closeButton.on("pointerdown", () => {
    infoOverlay.visible = false;
  });

  // --- Function to update balance display ---
  function updateBalanceDisplay() {
    balanceText.text = `Balance: ${balance.toFixed(2)}`;
    balanceText.position.set(canvasW - 20, 20); // 20px padding from right/top
    // balanceText.zIndex = 9999; // ensure it’s on top
  }

  function updateWinTextPosition() {
    const x = (canvasW + gridWidth) / 2 + cellSize / 4; // 40px gap from grid’s right edge
    const y = gridStartY;
    winText.position.set(x, y);
  }

  function updatePaytableDisplay() {
    paytableContainer.removeChildren();

    const r = selectedNumbers.length; // how many numbers player selected
    if (r === 0 || r > PAYTABLE.length) return; // nothing selected yet or too high

    const payouts = PAYTABLE[r - 1]; // paytable row for r selections

    //
    const payoutTextStyle = { fill: 0xffffff, fontSize: gridHeight * 0.04 };
    const lineHeight = gridHeight * 0.06; // spacing between lines

    payouts.forEach((winAmount, i) => {
      const hString = `Hit ${(i + 1).toString()}`; // number of hits
      const line = new Text({
        text: `${hString}: ${winAmount.toFixed(2)}x`,
        style: payoutTextStyle,
      });
      line.anchor.set(0, 1);
      line.position.set(0, -i * lineHeight); // stack lines upwards
      paytableContainer.addChild(line);
    });

    // Position the container beside the grid (aligned to bottom-right corner)
    // dynamic spacing from grid
    const x = (canvasW + gridWidth) / 2 + cellSize / 4; // + canvasW * 0.03;
    // const y = gridStartY + gridHeight - 100;
    const y = gridStartY + gridHeight * 0.9;
    paytableContainer.position.set(x, y);
  }

  function drawLayout() {
    const { width: containerW, height: containerH } = getContainerSize();

    const aspectRatio = 4 / 3;
    canvasW = containerW;
    canvasH = containerW / aspectRatio;
    if (canvasH > containerH) {
      canvasH = containerH;
      canvasW = canvasH * aspectRatio;
    }

    app.renderer.resize(canvasW, canvasH);
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";

    gridContainer.removeChildren();
    uiContainer.removeChildren();
    resultContainer.removeChildren();

    // const gridSize = 6;
    const gridRows = 5;
    const gridCols = 8;
    const padding = 8;
    gridWidth = canvasW * 0.6;
    gridHeight = canvasH * 0.6;

    // Compute cell size to fit both directions
    const cellWidth = (gridWidth - (gridCols - 1) * padding) / gridCols;
    const cellHeight = (gridHeight - (gridRows - 1) * padding) / gridRows;
    cellSize = Math.min(cellWidth, cellHeight); // make them square if you want
    const gridTotalWidth = gridCols * cellSize + (gridCols - 1) * padding;
    const gridTotalHeight = gridRows * cellSize + (gridRows - 1) * padding;
    gridStartX = (canvasW - gridTotalWidth) / 2;
    gridStartY = 0.6 * (canvasH - gridTotalHeight);
    cells.length = 0;

    // --- MAIN GRID ---
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const number = row * gridCols + col + 1;
        const cell = new Container();
        cell.x = gridStartX + col * (cellSize + padding);
        cell.y = gridStartY + row * (cellSize + padding);

        cell.eventMode = "static";
        cell.cursor = "pointer";

        const bg = new Graphics()
          .roundRect(0, 0, cellSize, cellSize, 10)
          .fill({ color: 0x555555 }); // siva pozadina celije
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
            // bg.tint = 0xff4444; // 0x00aa00 - stara boja zelena
            bg.clear()
              .roundRect(0, 0, cellSize, cellSize, 10)
              .fill({ color: 0xff4444 });

            updatePaytableDisplay();
          } else {
            selectedNumbers.splice(idx, 1);
            // bg.tint = 0xffffff;
            bg.clear()
              .roundRect(0, 0, cellSize, cellSize, 10)
              .fill({ color: 0x555555 });
            updatePaytableDisplay();
          }
        });

        gridContainer.addChild(cell);
        cells.push({ number, bg });
      }
    }
    // --- END MAIN GRID

    // --- Reapply selected state after rebuilding grid ---
    selectedNumbers.forEach((num) => {
      const cellObj = cells.find((c) => c.number === num);
      if (cellObj) {
        cellObj.bg.clear();
        cellObj.bg
          .roundRect(0, 0, cellSize, cellSize, 10)
          .fill({ color: 0xff4444 }); // same red as CLEAR button
      }
    });

    // dynamically calculate font size
    helpText.style.fontSize = gridHeight * 0.05;
    helpText.style.lineHeight = gridHeight * 0.05 * 1.2;
    closeButton.style.fontSize = gridHeight * 0.05;
    infoButton.style.fontSize = gridHeight * 0.05;
    balanceText.style.fontSize = gridHeight * 0.05;
    balanceText.position.set(canvasW - 20, 20);
    winText.style.fontSize = gridHeight * 0.05;
    const winX = (canvasW + gridWidth) / 2 + cellSize / 4; //canvasW * 0.03; // dynamic spacing
    const winY = gridStartY;
    winText.position.set(winX, winY);

    // --- RESULT ZONE (background always visible) ---
    // --- flexible multi row layout
    // --- Flexible RESULT ZONE (no overlap, dynamic top placement) ---
    resultContainer.removeChildren();

    const resultPadding = 6;
    const resultCellSize = cellSize * 0.6;
    const maxCols = 14; // numbers per row
    const zonePaddingX = 20;
    const zonePaddingY = 15;
    const maxRows = 3;

    // compute full zone dimensions
    const zoneWidth =
      maxCols * (resultCellSize + resultPadding) -
      resultPadding +
      zonePaddingX * 2;
    const zoneHeight =
      maxRows * (resultCellSize + resultPadding) -
      resultPadding +
      zonePaddingY * 2;

    // 🟩 NEW: Position the zone ABOVE the grid with enough space to fully clear it
    const safeMargin = canvasH * 0.01; // ~1% vertical space between zone and grid
    const zoneX = (canvasW - zoneWidth) / 2;

    // put the zone so that its bottom edge sits safeMargin above the grid
    let zoneY = gridStartY - zoneHeight - safeMargin;

    // if that would push it off the top of the canvas, clamp it to top margin
    const topMargin = canvasH * 0.02;
    if (zoneY < topMargin) zoneY = topMargin;

    // --- Background rectangle (blue translucent panel) ---
    const bgZone = new Graphics()
      .roundRect(0, 0, zoneWidth, zoneHeight, 12)
      .fill({ color: 0x222244 });
    bgZone.alpha = 0.7;
    bgZone.position.set(zoneX, zoneY);
    resultContainer.addChild(bgZone);

    // --- Title above zone ---
    const title = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: resultCellSize * 0.5 },
    });
    title.anchor.set(0.5);
    title.position.set(canvasW / 2, zoneY - resultCellSize * 0.4);
    resultContainer.addChild(title);

    // --- Placeholder text centered inside zone ---
    const placeholderText = new Text({
      text: "Waiting for draw...",
      style: {
        fill: 0xaaaaaa,
        fontSize: resultCellSize * 0.5,
        fontStyle: "italic",
      },
    });
    placeholderText.anchor.set(0.5);
    placeholderText.position.set(canvasW / 2, zoneY + zoneHeight / 2);
    placeholderText.label = "placeholder";
    resultContainer.addChild(placeholderText);

    // --- END RESULT ZONE ---

    // --- BUTTONS ---
    const btnWidth = canvasW * 0.25;
    const btnHeight = canvasH * 0.07;
    const buttonY = gridStartY + gridHeight; // * 1.05;
    const spacing = canvasW * 0.1;

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

    // PLAY button
    const playButton = createButton("PLAY", 0x0077ff, async () => {
      if (balance <= 0) {
        // console.log("Not enough balance");
        return;
      }
      if (selectedNumbers.length === 0) {
        // resultContainer.removeChildren();
        if (resultContainer.children.length > 2) {
          resultContainer.removeChildren(2, resultContainer.children.length);
        }
        const msg = new Text({
          text: "Select at least one number!",
          style: { fill: 0xff5555, fontSize: 24 },
        });
        msg.anchor.set(0.5);
        msg.position.set(canvasW / 2, 0.5 * gridStartY);
        resultContainer.addChild(msg);
        // console.log("Nothing selected");
        return;
      }

      // Disable PLAY button during draw
      playButton.eventMode = "none";
      playButton.alpha = 0.5; // dimmed look

      // Decrease balance by 1 and update display
      balance -= 1;
      updateBalanceDisplay();

      try {
        const res = await fetch("/api/keno_stop_ball/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected: selectedNumbers, balance }),
        });
        const data = await res.json();
        // console.log(data);
        cells.forEach(({ number, bg }) => {
          // Clear previous drawing and redraw base cell
          bg.clear();

          // Default gray fill
          bg.roundRect(0, 0, cellSize, cellSize, 10).fill({ color: 0x555555 });

          // Player's selected numbers stay red
          if (selectedNumbers.includes(number)) {
            bg.clear();
            bg.roundRect(0, 0, cellSize, cellSize, 10).fill({
              color: 0xff4444,
            });
          }

          // Add green border only for winning numbers
          // if (data.winningNumbers.includes(number)) {
          //   bg.stroke({ color: 0x00ff00, width: 6 }); // green border
          // }
        });

        // --- Clear old result numbers only (keep background and title) ---
        // Hide placeholder if it exists
        const placeholder = resultContainer.children.find(
          (child) => child.label === "placeholder"
        );
        if (placeholder) placeholder.visible = false;
        if (resultContainer.children.length > 2) {
          resultContainer.removeChildren(2, resultContainer.children.length);
        }
        // --- Add result cells into the existing zone ---
        const startX = zoneX + zonePaddingX;
        const startY = zoneY + zonePaddingY;

        // --- Sequential reveal of drawn numbers ---
        for (let i = 0; i < data.drawnNumbers.length; i++) {
          const num = data.drawnNumbers[i];

          const row = Math.floor(i / maxCols);
          const col = i % maxCols;

          const x =
            zoneX + zonePaddingX + col * (resultCellSize + resultPadding);
          const y =
            zoneY + zonePaddingY + row * (resultCellSize + resultPadding);

          const cell = new Container();
          cell.x = x;
          cell.y = y;

          const isWinning = data.winningNumbers.includes(num);
          const cellColor = isWinning ? 0x00ff00 : 0xffcc00;
          // const labelText =
          //   i === data.drawnNumbers.length - 1 ? "" : num.toString();
          if (i < data.drawnNumbers.length - 1) {
            const bg = new Graphics()
              .roundRect(0, 0, resultCellSize, resultCellSize, 8)
              .fill({ color: cellColor });
            cell.addChild(bg);

            const label = new Text({
              text: num.toString(),
              style: { fill: 0x000000, fontSize: resultCellSize * 0.4 },
            });

            label.anchor.set(0.5);
            label.position.set(resultCellSize / 2, resultCellSize / 2);
            cell.addChild(label);

            resultContainer.addChild(cell);
          } else {
            const bg = new Graphics()
              .roundRect(0, 0, resultCellSize, resultCellSize, 8)
              .fill({ color: 0x000000 })
              .stroke({ color: cellColor, width: 6 });
            cell.addChild(bg);

            // const label = new Text({
            //   text: num.toString(),
            //   style: { fill: 0x000000, fontSize: resultCellSize * 0.4 },
            // });

            // label.anchor.set(0.5);
            // label.position.set(resultCellSize / 2, resultCellSize / 2);
            // cell.addChild(label);

            resultContainer.addChild(cell);
          }
          // Optional small pop effect
          cell.scale.set(0);
          gsap.to(cell.scale, {
            x: 1,
            y: 1,
            duration: 0.3,
            ease: "back.out(1.7)",
          });

          if (isWinning) {
            cells[num - 1].bg.stroke({ color: 0x00ff00, width: 6 }); // green border
          }
          // Wait 1 second before showing next number
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        winText.text = `Bet: 1\nWin: ${data.win}\nHits: ${data.hits}`;
        balance = data.balance;
        updateBalanceDisplay();
        // --- Pause for 3 seconds, then clear draw and re-enable PLAY ---
        setTimeout(() => {
          // Remove only result cells (keep background, title, placeholder)
          // if (resultContainer.children.length > 2) {
          //   resultContainer.removeChildren(2, resultContainer.children.length);
          // }

          // remove green highlight
          cells.forEach(({ number, bg }) => {
            // Clear previous drawing and redraw base cell
            bg.clear();

            // Default gray fill
            bg.roundRect(0, 0, cellSize, cellSize, 10).fill({
              color: 0x555555,
            });

            // Player's selected numbers stay red
            if (selectedNumbers.includes(number)) {
              bg.clear();
              bg.roundRect(0, 0, cellSize, cellSize, 10).fill({
                color: 0xff4444,
              });
            }
          });

          // Re-enable PLAY button
          playButton.eventMode = "static";
          playButton.alpha = 1;
          winText.text = "Bet: 1\nWin: \nHits:  ";

          // Show placeholder again
          if (placeholder) placeholder.visible = true;
          //   fade out
        }, 1000);
      } catch (err) {
        // console.error(err);
      }
    });

    // CLEAR button                          crvena boja
    const clearButton = createButton("CLEAR", 0xff4444, async () => {
      selectedNumbers.length = 0;
      cells.forEach(({ bg }) =>
        bg
          .clear()
          .roundRect(0, 0, cellSize, cellSize, 10)
          .fill({ color: 0x555555 })
      );
      //   resultContainer.removeChildren();
      //   if (resultContainer.children.length > 2) {
      //     resultContainer.removeChildren(2, resultContainer.children.length);
      //   }
      updatePaytableDisplay();
    });

    overlayBg
      .clear()
      .rect(0, 0, app.renderer.width, app.renderer.height)
      .fill({ color: 0x000000, alpha: 0.8 });

    infoBox
      .clear()
      .roundRect(
        (app.renderer.width - boxWidth) / 2,
        (app.renderer.height - boxHeight) / 2,
        boxWidth,
        boxHeight,
        16
      )
      .fill({ color: 0x222244 });

    helpText.style.wordWrapWidth = app.renderer.width * 0.7;
    helpText.position.set(
      app.renderer.width / 2,
      (app.renderer.height - boxHeight) / 2 + 50
    );
    closeButton.position.set(
      app.renderer.width / 2,
      (app.renderer.height + boxHeight) / 2 - 40
    );

    playButton.x = canvasW / 2 - btnWidth / 2 - spacing / 2;
    playButton.y = buttonY;

    clearButton.x = canvasW / 2 + btnWidth / 2 + spacing / 2;
    clearButton.y = buttonY;

    uiContainer.addChild(playButton, clearButton);

    // --- Update balance and win text position ---
    updateBalanceDisplay();
    updateWinTextPosition();
    updatePaytableDisplay();
  }

  drawLayout();
  window.addEventListener("resize", drawLayout);
}

start();
