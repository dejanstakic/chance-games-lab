const { Application, Graphics, Text, Container } = PIXI;

async function start() {
  const canvas = document.getElementById("crazyJumperCanvas");

  // calculate container dimensions
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
  let balance = 1000; // starting balance
  let jumper;
  const NUM_STATES = 13;
  const D = 2;
  // prettier-ignore
  const TERMINAL_STATES = [2,4,6,12, NUM_STATES]
  let playButton;
  let startPos;

  const gridContainer = new Container();
  const uiContainer = new Container();
  const resultContainer = new Container(); // new for result cells
  const hudContainer = new Container(); // HUD for balance text
  app.stage.addChild(hudContainer, gridContainer, resultContainer, uiContainer);

  const selectedNumbers = [];
  const cells = [];

  // --- Balance text ---
  const balanceText = new Text({
    text: `Balance: ${balance}`,
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
    text: "Bet: 1\nWin: ",
    style: { fill: 0xffff00, fontSize: 28 }, // yellow text
  });
  winText.anchor.set(0, 0); // top-left corner anchor
  hudContainer.addChild(winText);

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
CREAZY JUMPER

• RTP: ??%
• Press PLAY to start.
• Your balance decreases by 1 per play.
• Winnings are shown on the right.

Good luck! 🍀
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

  // Function to get coordinates of a given state
  function getStatePosition(state) {
    if (state === 0) {
      // START
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      const radius = Math.min(canvasW, canvasH) * 0.25;
      const circleRadius = Math.min(canvasW, canvasH) * 0.04;
      return { x: centerX, y: centerY - radius - circleRadius * 2 };
    } else if (state >= 1 && state <= 12) {
      // Around circle
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      const radius = Math.min(canvasW, canvasH) * 0.25;
      const angle = ((state - 1) / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    } else if (state === 13) {
      // FINISH
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      return { x: centerX, y: centerY };
    }
    return { x: 0, y: 0 };
  }

  // Animate the jumper following the path
  function animatePath(path, winAmount) {
    let currentWins = 0;
    if (!path || path.length === 0 || !jumper) return;
    const timeline = gsap.timeline();
    // console.log("timeline ", timeline);
    for (let i = 0; i < path.length; i++) {
      const pos = getStatePosition(path[i]);
      const currentState = path[i];

      const duration = 0.5; // seconds between jumps
      timeline.to(jumper, {
        x: pos.x,
        y: pos.y,
        duration,
        ease: "power1.inOut",
        onStart: () => {
          // Optional: small jump scale animation
          gsap.to(jumper.scale, {
            x: 1.2,
            y: 0.8,
            duration: 0.25, //0.25
            yoyo: true,
            repeat: 1,
          });

          // increase only when jumper *lands* on a non-terminal state
          if (!TERMINAL_STATES.includes(currentState) && currentState !== 0) {
            currentWins += D;
          }
          winText.text = `Bet: 1\nWin: ${currentWins}`;
          // console.log(path[i]);
          // console.log(currentWins);
        },
      });
    }

    // When done, you could re-enable the PLAY button
    timeline.call(() => {
      // console.log("Path animation complete");
      setTimeout(() => {
        // Re-enable PLAY button
        playButton.eventMode = "static";
        playButton.alpha = 1;
        // winText.text = "Bet: 1\nWin: ";
        winText.text = `Bet: 1\nWin: ${winAmount}`;
        // console.log(winText);
        jumper.x = startPos.x;
        jumper.y = startPos.y * 0.8;
      }, 500);
    });
  }

  // --- Function to update balance display ---
  function updateBalanceDisplay() {
    balanceText.text = `Balance: ${balance}`;
    balanceText.position.set(canvasW - 20, 20); // 20px padding from right/top
  }

  function updateWinTextPosition() {
    const x = canvasW * 0.8; //(canvasW + gridWidth) / 2; // 40px gap from grid’s right edge
    const y = canvasH * 0.4;
    winText.position.set(x, y);
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

    gridWidth = canvasW * 0.6;
    gridHeight = canvasH * 0.6;

    // dynamically calculate font size
    helpText.style.fontSize = gridHeight * 0.05;
    helpText.style.lineHeight = gridHeight * 0.05 * 1.2;
    closeButton.style.fontSize = gridHeight * 0.05;
    infoButton.style.fontSize = gridHeight * 0.05;
    balanceText.style.fontSize = gridHeight * 0.05;
    balanceText.position.set(canvasW - 20, 20);
    winText.style.fontSize = gridHeight * 0.05;
    const winX = canvasW * 0.8; // (canvasW + gridWidth) / 2 + cellSize / 4; //canvasW * 0.03; // dynamic spacing
    const winY = canvasH * 0.4; //gridStartY;
    winText.position.set(winX, winY);

    // --- BUTTONS ---
    const btnWidth = canvasW * 0.25;
    const btnHeight = canvasH * 0.08;
    const buttonY = canvasH * 0.9; //gridStartY + gridHeight * 1.05;
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
    playButton = createButton("PLAY", 0x0077ff, async () => {
      if (balance <= 0) {
        // console.log("Not enough balance");
        return;
      }

      // Disable PLAY button until jumping ends
      playButton.eventMode = "none";
      playButton.alpha = 0.5; // dimmed look

      winText.text = "Bet: 1\nWin: ";

      // Decrease balance by 1 and update display
      balance -= 1;
      updateBalanceDisplay();

      try {
        const res = await fetch("/api/crazy_jumper/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ balance }),
        });
        const data = await res.json();
        // console.log(data);

        // Animate jumper along the returned path
        // console.log("states: ", data.states);
        animatePath(data.states, data.win);
        // console.log("posle states");
        // winText.text = `Bet: 1\nWin: ${data.win}`;
        balance = data.balance.toFixed(2);

        updateBalanceDisplay();
      } catch (err) {
        // console.error(err);
      }
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

    playButton.x = canvasW / 2;
    playButton.y = buttonY;
    uiContainer.addChild(playButton);

    // CIRCLES
    // === CRAZY JUMPER LAYOUT ===

    // remove any existing circles (in case of resize)
    gridContainer.removeChildren();

    // center of the circular layout
    const centerX = canvasW / 2;
    const centerY = canvasH / 2;

    // radius for 12 state circles
    const radius = Math.min(canvasW, canvasH) * 0.25;

    // circle appearance
    const circleRadius = Math.min(canvasW, canvasH) * 0.04;
    const circleColor = 0x00aaee;
    const zeroCircleColor = 0xff4444;

    // --- draw 12 numbered circles around ---
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2; // start at top (like clock)
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const c = TERMINAL_STATES.includes(i + 1) ? zeroCircleColor : circleColor;
      const circle = new Graphics()
        .circle(x, y, circleRadius)
        .fill({ color: c });
      gridContainer.addChild(circle);

      const t = TERMINAL_STATES.includes(i + 1) ? "" : `${D}`;
      const label = new Text({
        text: t, //(i + 1).toString(),
        style: {
          fill: 0xffffff,
          fontSize: circleRadius * 0.9,
          fontWeight: "bold",
        },
      });
      label.anchor.set(0.5);
      label.position.set(x, y);
      gridContainer.addChild(label);
    }

    // --- central FINISH circle ---
    const finishCircle = new Graphics()
      .circle(centerX, centerY, circleRadius * 1.5)
      // .fill({ color: 0xff4444 });
      .fill({ color: circleColor });
    gridContainer.addChild(finishCircle);

    const finishLabel = new Text({
      text: "COLLECT",
      style: {
        fill: 0xffffff,
        fontSize: circleRadius * 0.6,
        fontWeight: "bold",
      },
    });
    finishLabel.anchor.set(0.5);
    finishLabel.position.set(centerX, centerY);
    gridContainer.addChild(finishLabel);

    // --- START circle above the ring ---
    const startY = centerY - radius - circleRadius * 3;

    // === CRAZY JUMPER CHARACTER (ball/frog) ===

    const jumperRadius = circleRadius * 0.8;

    function createJumper() {
      if (jumper) gridContainer.removeChild(jumper);

      jumper = new Graphics()
        .circle(0, 0, jumperRadius)
        .fill({ color: 0xffff00 });
      jumper.zIndex = 10;
      gridContainer.addChild(jumper);
    }
    createJumper();
    startPos = getStatePosition(0);
    jumper.x = startPos.x;
    jumper.y = startPos.y * 0.8;

    // --- Update balance and win text position ---
    updateBalanceDisplay();
    updateWinTextPosition();
  }

  drawLayout();
  window.addEventListener("resize", drawLayout);
}

start();
