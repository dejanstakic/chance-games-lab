const { Application, Graphics, Text, Container, Sprite, Assets, BlurFilter } =
  PIXI;

// Use global io() injected by CDN
const socket = io();

// simple temporary unique ID per client session
const userId = "user-" + Math.floor(Math.random() * 1_000_000);
const RESOLVE_STEPS = 200;

async function start() {
  const canvas = document.getElementById("forexSimulatorCanvas");

  // === Canvas sizing ===
  const aspectRatio = 4 / 3;
  let width = Math.min(window.innerWidth, 980);
  let height = width / aspectRatio;
  if (height > Math.min(window.innerHeight, 735)) {
    height = Math.min(window.innerHeight, 735);
    width = height * aspectRatio;
  }

  const app = new Application();
  await app.init({
    canvas,
    background: "#2e2e2e",
    width,
    height,
  });

  // === Chart drawing area (3/4 of canvas) ===
  const margin = 5;
  const chartWidth = width * 0.85; //(width * 3) / 4;
  const chartHeight = height * 0.75; // (height * 3) / 4;

  // Background/border container
  const chartContainer = new Container();
  chartContainer.x = margin;
  chartContainer.y = margin;
  app.stage.addChild(chartContainer);

  // Clip/mask so nothing can render outside the chart area
  const clip = new Graphics();
  clip.rect(0, 0, chartWidth, chartHeight).fill(0xffffff); // solid fill needed for mask
  chartContainer.addChild(clip);
  chartContainer.mask = clip;

  // Border rectangle
  const border = new Graphics();
  border
    .rect(0, 0, chartWidth, chartHeight)
    .stroke({ width: 2, color: 0x444444 });
  chartContainer.addChild(border);

  // === Graphics for the chart ===
  const g = new Graphics();
  chartContainer.addChild(g);

  // Container for bet lines and labels (inside chart area)
  const betContainer = new Container();
  chartContainer.addChild(betContainer);

  // Each bet now stores: { id, price, color, type, active, alpha }
  const bets = [];
  let betCounter = 0;

  // === Parameters ===
  let baseY = chartHeight / 2;
  let refPrice = 1000; // reference around which we draw
  let targetBaseY = baseY;
  let targetRefPrice = refPrice;
  const scale = 8; // adjust to volatility
  const stepX = 4;
  const maxPoints = 800;
  const targetX = chartWidth * 0.25; //chartWidth / 2;
  const leftCull = -50;
  const rightCull = chartWidth + 50;
  const marginY = 40; // re-center threshold

  const pts = [];
  let lastX = 0; // start inside chart area
  let lastY = baseY;
  let latestValue = 1000;
  let displayOffset = 0;
  let desiredOffset = 0;

  // === SIDE PANEL (right quarter of canvas) ===
  const sidePanel = new Container();
  // sidePanel.x = (width * 3) / 4 + 10; // a little offset from chart
  // sidePanel.y = 10;
  app.stage.addChild(sidePanel);

  // dimensions
  const panelMargin = 8;
  const infoW = 80,
    infoH = 30;
  const balanceW = 120,
    balanceH = 40;

  // === INFO Button ===
  // const infoBtn = new Graphics();
  // infoBtn
  //   .roundRect(0, 0, infoW, infoH, 6)
  //   .fill({ color: 0x3a3a3a })
  //   .stroke({ width: 2, color: 0xffffff });
  // const infoText = new Text({
  //   text: "INFO",
  //   style: {
  //     fill: "#fff",
  //     fontSize: 14,
  //     fontFamily: "Arial",
  //     fontWeight: "bold",
  //   },
  // });
  // infoText.anchor.set(0.5);
  // infoText.x = infoW / 2;
  // infoText.y = infoH / 2;
  // sidePanel.addChild(infoBtn, infoText);

  // === BALANCE display ===
  let balance = 1000;
  const balanceBox = new Graphics();
  balanceBox
    .roundRect(0, 0, balanceW, balanceH, 6)
    .fill({ color: 0x000000, alpha: 0.7 })
    .stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  const balanceLabel = new Text({
    text: `Balance: ${balance}`,
    style: {
      fill: "#fff",
      fontSize: 16,
      fontFamily: "Arial",
      fontWeight: "bold",
    },
  });
  balanceLabel.x = 10;
  balanceLabel.y = 10;

  // group balance box + label
  const balanceContainer = new Container();
  balanceContainer.addChild(balanceBox, balanceLabel);
  sidePanel.addChild(balanceContainer);

  // === positioning (aligned to right border) ===
  // infoBtn.x = width - infoW - panelMargin;
  // infoBtn.y = panelMargin;
  // infoText.x += infoBtn.x;
  // infoText.y += infoBtn.y;

  balanceContainer.x = width - balanceW - panelMargin;
  balanceContainer.y = 2 * panelMargin; // + infoH;

  // === INFO WINDOW ===
  /*
  const infoWindow = new Container();
  infoWindow.visible = false;
  app.stage.addChild(infoWindow);

  // semi-transparent dark background over full canvas
  const infoBg = new Graphics();
  infoBg.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.7 });
  infoWindow.addChild(infoBg);

  // text content
  const infoTextBlock = new Text({
    text:
      "UpDown Challenge  \n\n" +
      "• RTP: 96.01%\n" +
      "• Place LOW or HIGH bets.\n" +
      "• Each bet costs 1 credit.\n" +
      "• Price updates every 200 ms.\n" +
      `• Bet resolves after ${RESOLVE_STEPS} ticks.\n`,
    style: {
      fill: "#ffffff",
      fontSize: 16,
      fontFamily: "Arial",
      align: "left",
      wordWrap: true,
      wordWrapWidth: width - 100,
    },
  });
  infoTextBlock.x = 50;
  infoTextBlock.y = 80;
  infoWindow.addChild(infoTextBlock);

  // Close text (acts like button)
  const closeText = new Text({
    text: "CLOSE",
    style: { fill: "#00ffff", fontSize: 18, fontWeight: "bold" },
  });
  closeText.anchor.set(0.5);
  closeText.x = width / 2;
  closeText.y = height - 60;
  infoWindow.addChild(closeText);

  infoBg.eventMode = "static";
  infoBg.cursor = "pointer";
  closeText.eventMode = "static";
  closeText.cursor = "pointer";

  // open/close logic
  infoBtn.eventMode = "static";
  infoBtn.cursor = "pointer";
  infoBtn.on("pointertap", () => (infoWindow.visible = true));
  infoBg.on("pointertap", () => (infoWindow.visible = false));
  closeText.on("pointertap", () => (infoWindow.visible = false));
*/
  // == END INFO

  // === Live price label ===
  const labelContainer = new Container();
  chartContainer.addChild(labelContainer);

  // Background box
  const labelBg = new Graphics();
  labelContainer.addChild(labelBg);

  // Text on top
  const priceText = new Text({
    text: latestValue.toFixed(2),
    style: {
      fill: "#fff",
      fontSize: 14,
      fontFamily: "Arial",
      fontWeight: "bold",
    },
  });
  priceText.anchor.set(0, 0.5);
  labelContainer.addChild(priceText);

  // === Baseline label === 🆕
  const baseLabel = new Text({
    text: refPrice.toFixed(2),
    style: { fill: "#ccc", fontSize: 12, fontFamily: "Arial" },
  });
  baseLabel.anchor.set(1, 0.5); // right aligned
  chartContainer.addChild(baseLabel);

  // === Betting buttons ===
  const buttonContainer = new Container();
  app.stage.addChild(buttonContainer);

  const buttonWidth = 100;
  const buttonHeight = 40;
  const spacing = 40;

  // Helper function to create a button
  function createButton(label, color) {
    const btn = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, buttonWidth, buttonHeight, 6)
      .fill({ color })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
    const txt = new Text({
      text: label,
      style: {
        fill: "#fff",
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    });
    txt.anchor.set(0.5);
    txt.x = buttonWidth / 2;
    txt.y = buttonHeight / 2;
    btn.addChild(bg, txt);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.bg = bg;
    btn.txt = txt;
    return btn;
  }

  // Create buttons
  const lowBtn = createButton("LOW", 0xd9534f); // red
  const highBtn = createButton("HIGH", 0x5cb85c); // green

  // Position them below the chart area
  const buttonBaseY = height * 0.8; //(height * 3) / 4 + 20; // a bit below chart bottom
  lowBtn.x = width / 2 - buttonWidth - spacing / 2; //20;
  lowBtn.y = buttonBaseY;
  highBtn.x = lowBtn.x + 20 + buttonWidth + spacing;
  highBtn.y = buttonBaseY;

  buttonContainer.addChild(lowBtn, highBtn);

  // === Helper functions ===
  function drawBaseline() {
    g.moveTo(0, baseY)
      .lineTo(chartWidth, baseY)
      .stroke({ width: 1, color: 0x555555 });

    baseLabel.x = chartWidth - 4;
    baseLabel.y = baseY;
    baseLabel.text = refPrice.toFixed(2);
  }

  function redraw() {
    g.clear();
    drawBaseline();

    const render = [];
    for (const p of pts) {
      const rx = p.x - displayOffset;
      // cull by X (already) AND Y (new)
      if (rx > leftCull && rx < rightCull && p.y >= 0 && p.y <= chartHeight) {
        render.push(rx, p.y);
      }
    }

    if (render.length >= 4) {
      g.poly(render, false).stroke({ width: 2, color: 0x00ff00 });
    }

    // === Small circle marker at latest point ===
    if (pts.length > 1) {
      const lastPt = pts[pts.length - 1];
      const rx = lastPt.x - displayOffset;
      const ry = lastPt.y;

      // only draw if inside visible area
      if (rx >= 0 && rx <= chartWidth && ry >= 0 && ry <= chartHeight) {
        g.circle(rx, ry, 3).fill({ color: 0x00ff00 }); // small green circle
      }
    }

    //  --- Price label ---
    if (pts.length) {
      const rx = lastX - displayOffset;
      const ry = lastY;

      // Update text
      priceText.text = latestValue.toFixed(2);
      priceText.x = 4; // small padding inside box
      priceText.y = 0;

      // Draw rounded background around text
      const paddingX = 6;
      const paddingY = 4;
      const textW = priceText.width;
      const textH = priceText.height;
      const tw = priceText.width,
        th = priceText.height;

      labelBg.clear();
      labelBg.roundRect(
        0,
        -textH / 2 - paddingY / 2,
        textW + paddingX * 2,
        textH + paddingY,
        4
      );
      labelBg.fill({ color: 0x000000, alpha: 0.7 });
      labelBg.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

      // smooth label Y follows lastY gradually
      // const smoothFactor = 0.1;
      // labelContainer.x += (rx + 8 - labelContainer.x) * smoothFactor;
      // labelContainer.y += (ry - labelContainer.y) * smoothFactor;
      // 🆕 fixed position inside chart container
      labelContainer.x = chartWidth - (tw + paddingX * 2) - 8; // 8px margin from right
      labelContainer.y = 18; // 10px from top

      // === Draw active bet lines and labels ===
      betContainer.removeChildren(); // clear old lines & texts cleanly

      for (const b of bets) {
        // compute y in current coordinate space
        const y = baseY - (b.price - refPrice) * scale;
        if (y < 0 || y > chartHeight) continue; // skip off-screen bet line

        // main horizontal line
        const line = new Graphics();
        line
          .moveTo(0, y)
          .lineTo(chartWidth, y)
          .stroke({ width: 1, color: b.color, alpha: 0.6 }); //b.alpha });
        betContainer.addChild(line);

        // label
        const lbl = new Text({
          text: `${b.type} ${b.price.toFixed(2)}`,
          style: { fill: "#fff", fontSize: 12, fontFamily: "Arial" },
        });
        lbl.anchor.set(1, 0.5);
        lbl.x = chartWidth - 5;
        lbl.y = y + 5;
        lbl.alpha = b.alpha;
        betContainer.addChild(lbl);
      }

      // === Draw vertical target lines ===
      for (const b of bets) {
        const x = b.xTarget - displayOffset;

        // Only draw if inside chart
        if (x < 0 || x > chartWidth) continue;

        const yTop = 0;
        const yBottom = chartHeight;

        const line = new Graphics();
        line
          .moveTo(x, yTop)
          .lineTo(x, yBottom)
          .stroke({ width: 1, color: b.color, alpha: 0.4 });
        betContainer.addChild(line);

        // Optional: small arrow or text at top
        const lbl = new Text({
          text: "⏱",
          style: { fill: "#fff", fontSize: 12 },
        });
        lbl.anchor.set(0.5);
        lbl.x = x;
        lbl.y = 10;
        lbl.alpha = 0.5;
        betContainer.addChild(lbl);
      }
    }
  }

  //  === Animation ticker ===
  app.ticker.add(() => {
    const alpha = 0.2;
    displayOffset += (desiredOffset - displayOffset) * alpha;

    // smooth interpolate vertical position
    const verticalEase = 0.04; // smaller = slower easing
    baseY += (targetBaseY - baseY) * verticalEase;
    refPrice += (targetRefPrice - refPrice) * verticalEase;

    // recompute Y positions with eased base/ref
    for (const p of pts) {
      p.y = baseY - (p.price - refPrice) * scale;
    }

    // Fade out resolved bets
    for (const b of bets) {
      if (!b.active && b.alpha > 0) b.alpha -= 0.02; // speed of fade
    }

    redraw();

    // Remove fully faded bets
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].alpha <= 0) bets.splice(i, 1);
    }
  });

  // === Socket data ===
  socket.on("forex_update", (msg) => {
    latestValue = msg.value;

    lastX += stepX;
    lastY = baseY - (msg.value - refPrice) * scale;

    pts.push({ x: lastX, y: lastY, price: msg.value });
    if (pts.length > maxPoints) pts.shift();

    // --- recenter vertically if the line leaves boundaries ---
    if (lastY < marginY || lastY > chartHeight - marginY) {
      targetRefPrice = msg.value; // move reference toward current price
      targetBaseY = chartHeight / 2; // smoothly re-center vertically baseline
    }

    if (lastX > targetX) {
      desiredOffset = lastX - targetX;
    } else {
      desiredOffset = 0;
    }
  });

  socket.on("bet_result", (res) => {
    // console.log("Bet resolved:", res);
    const { type, entryPrice, finalPrice, win } = res;

    // update balance automatically
    if (win) {
      balance += 2; // payout 2 (you can change to your paytable)
      balanceLabel.text = `Balance: ${balance}`;
    }

    const color = win ? 0x00ff00 : 0xff0000;
    const outcome = win ? "WIN" : "LOSE";

    // Find matching local line (same type & price closest)
    let match = null;
    let minDiff = Infinity;
    for (const b of bets) {
      if (b.active && b.type === type) {
        const diff = Math.abs(b.price - entryPrice);
        if (diff < minDiff) {
          minDiff = diff;
          match = b;
        }
      }
    }

    if (match) {
      // mark as resolved, recolor if you like
      match.active = false;
      match.color = color;
    }

    // Optional: show floating text feedback
    const msg = new Text({
      text: outcome,
      style: {
        fill: win ? "#00ff00" : "#ff3333",
        fontSize: 20,
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    });
    msg.anchor.set(0.5);
    msg.x = chartWidth / 2;
    msg.y = chartHeight / 2;
    msg.alpha = 1;
    chartContainer.addChild(msg);

    // fade the text
    app.ticker.add(() => {
      msg.alpha -= 0.02;
      if (msg.alpha <= 0) chartContainer.removeChild(msg);
    });
  });

  // --- betting logic ---
  // let currentTick = 0;
  let currentPrice;
  // update current price whenever new data arrives
  socket.on("forex_update", (msg) => {
    currentPrice = msg.value;
  });

  // send bet to server
  function placeBet(type) {
    if (balance <= 0) return; // optional guard

    balance -= 1;
    balanceLabel.text = `Balance: ${balance}`;

    const bet = {
      userId,
      type, // "LOW" or "HIGH"
      entryPrice: currentPrice,
      balance: balance,
    };
    // console.log("Placing bet:", bet);
    socket.emit("place_bet", bet);

    // Compute where the bet will resolve (after RESOLVE_STEPS steps)
    const stepsAhead = RESOLVE_STEPS;

    // current logical x is lastX (rightmost point)
    const xStart = lastX;
    const xTarget = lastX + stepsAhead * stepX;

    // add a bet line
    // Create local bet line with ID (so we can match later)
    const id = ++betCounter;
    const color = type === "HIGH" ? 0x00ff00 : 0xff0000;
    bets.push({
      id,
      price: latestValue,
      color,
      type,
      active: true,
      alpha: 1,
      xStart,
      xTarget,
    });

    // Optional small flash feedback
    const btn = type === "HIGH" ? highBtn : lowBtn;
    btn.bg.tint = 0xffff00;
    setTimeout(() => (btn.bg.tint = 0xffffff), 200);
  }

  lowBtn.on("pointertap", () => placeBet("LOW"));
  highBtn.on("pointertap", () => placeBet("HIGH"));
}

start();
