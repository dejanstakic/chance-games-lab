const { Application, Graphics, Text, Container, Sprite, Assets, BlurFilter } =
  PIXI;

/* -------------------------------------------------------------
   Global animation settings
------------------------------------------------------------- */
const SLOT_SETTINGS = {
  // --- Motion ---
  spinDuration: 150, // ms spin time before stopping
  reelDelay: 100, // delay between reel stops
  startSpeed: 35, // initial pixels per frame
  decelFactor: 0.75, // how quickly reel slows
  minSpeed: 10, // when to start bounce / stop

  // --- Bounce ---
  bounceAmplitude: 150, // px bounce height
  bounceDuration: 500, // ms
  bounceEase: (t) => 1 - (1 - t) ** 2,

  // --- Visuals ---
  enableBlur: true,
  maxBlur: 6,

  // --- Easing function (for deceleration) ---
  easeOut: (t) => 1 - (1 - t) ** 3, // cubic ease-out
};

function getTextureKey(code) {
  if (code === 1) return "symbol_1";
  if (code === 2) return "symbol_2";
  if (code === 3) return "symbol_3";
  if (code === 4) return "symbol_4";
  if (code === 5) return "symbol_5";
  if (code === 6) return "symbol_6";
  if (code === 7) return "symbol_7";
  if (code === 8) return "symbol_8";
}

// prettier-ignore
const PAYLINES = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2]
];

/* -------------------------------------------------------------
   Reel class — self-contained, smooth spin + bounce
------------------------------------------------------------- */
class Reel {
  constructor(app, textures, x, y, visibleCount, cellSize, mask) {
    this.app = app;
    this.textures = textures;
    this.x = x;
    this.y = y;
    this.visibleCount = visibleCount;
    this.cellSize = cellSize;

    this.symbols = Array.from(
      { length: 20 },
      () => Math.floor(Math.random() * 7) + 2 // without 1 - wild
    );
    // console.log(this.symbols);
    this.offset = 0;

    // --- container for reel graphics ---
    this.container = new Container();
    this.container.mask = mask;
    app.stage.addChild(this.container);

    // --- visible symbol sprites ---
    this.sprites = Array.from({ length: visibleCount }, (_, j) => {
      // const s = new Sprite(this.textures[`S${this.symbols[j]}`]);
      const s = new Sprite(this.textures[getTextureKey(this.symbols[j])]);
      s.width = cellSize - 10;
      s.height = cellSize - 10;
      s.x = this.x + 5;
      s.y = this.y + j * cellSize + 5; // no flipping
      this.container.addChild(s);
      return s;
    });

    // --- state ---
    this.isSpinning = false;
    this.speed = 0;
    this.state = "idle";
    this.stopSymbols = [];
    this.onStopComplete = null; // callback fired after bounce + shine

    // optional blur filter
    this.filter = SLOT_SETTINGS.enableBlur ? new BlurFilter() : null;
    if (this.filter) {
      this.filter.strength = 0;
      this.sprites.forEach((s) => (s.filters = [this.filter]));
    }

    // --- create shine overlay (gradient) ---
    this.shine = new Graphics()
      .rect(this.x + 2, this.y, cellSize - 4, this.visibleCount * cellSize)
      .fill({ color: 0xffffff, alpha: 0.0 });
    this.container.addChild(this.shine);
  }

  randomSymbol() {
    return Math.floor(Math.random() * 7) + 2; // initial start
  }

  startSpin() {
    this.isSpinning = true;
    this.state = "spinning";
    this.speed = SLOT_SETTINGS.startSpeed;
    this.stopSymbols = [];
    if (this.filter) this.filter.strength = SLOT_SETTINGS.maxBlur;
  }

  stopAt(symbols) {
    // console.log("stop at: ", symbols);
    this.stopSymbols = symbols.slice(); // [bottom..top]
    this.state = "stopping";
  }

  update(deltaMS) {
    if (!this.isSpinning) return;

    // decelerate if stopping
    if (this.state === "stopping" && this.speed > SLOT_SETTINGS.minSpeed) {
      this.speed -= SLOT_SETTINGS.decelFactor;
    }

    this.offset += this.speed * (deltaMS / 16.6);

    while (this.offset >= this.cellSize) {
      this.offset -= this.cellSize;
      const last = this.symbols.pop();
      this.symbols.unshift(this.randomSymbol());
    }

    // update blur dynamically
    if (this.filter && SLOT_SETTINGS.enableBlur) {
      const normalized = Math.min(this.speed / SLOT_SETTINGS.startSpeed, 1);
      this.filter.strength = SLOT_SETTINGS.maxBlur * normalized;
    }

    // draw visible cells (flipped)
    for (let j = 0; j < this.visibleCount; j++) {
      const index =
        (j + Math.floor(this.offset / this.cellSize)) % this.symbols.length;
      const symId = this.symbols[index];
      const sprite = this.sprites[j]; // no flipping
      sprite.texture = this.textures[getTextureKey(symId)];

      sprite.y = this.y + j * this.cellSize + 5 + (this.offset % this.cellSize);
    }

    // when nearly stopped
    if (this.state === "stopping" && this.speed <= SLOT_SETTINGS.minSpeed) {
      this.alignToStop();
    }
  }

  alignToStop() {
    this.speed = 0;
    this.isSpinning = false;
    this.state = "idle";

    // final symbols
    for (let j = 0; j < this.visibleCount; j++) {
      const symId =
        this.stopSymbols[j] !== undefined
          ? this.stopSymbols[j]
          : this.randomSymbol();
      const sprite = this.sprites[j];
      sprite.texture = this.textures[getTextureKey(symId)];

      sprite.y = this.y + j * this.cellSize + 5;
    }

    // --- track both animations ---
    this._bounceDone = false;
    this._shineDone = false;

    // blur fade + bounce + shine
    if (this.filter) this.filter.strength = SLOT_SETTINGS.maxBlur * 0.3;
    this.startBounce();
    this.shineSweep();
  }

  startBounce() {
    const amp = SLOT_SETTINGS.bounceAmplitude;
    const dur = SLOT_SETTINGS.bounceDuration;
    const easeFn = SLOT_SETTINGS.bounceEase;
    const start = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const e = easeFn(t);
      const displacement = Math.sin(e * Math.PI) * amp * (1 - e);

      for (let j = 0; j < this.visibleCount; j++) {
        const sprite = this.sprites[j];

        sprite.y = this.y + j * this.cellSize + 5 + displacement;
      }

      if (this.filter && SLOT_SETTINGS.enableBlur) {
        this.filter.strength = SLOT_SETTINGS.maxBlur * 0.3 * (1 - e);
      }

      if (t >= 1) {
        if (this.filter) this.filter.strength = 0;
        this.app.ticker.remove(tick);
        this._bounceDone = true;
        if (this._shineDone && this.onStopComplete) this.onStopComplete(this);
      }
    };

    this.app.ticker.add(tick);
  }

  /*  Shine sweep effect */
  shineSweep() {
    const h = this.visibleCount * this.cellSize;
    const dur = 300; // ms
    const start = performance.now();

    const tick = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const y = this.y + t * h;
      const alpha = t < 0.5 ? 0.6 : 0.6 * (1 - (t - 0.5) * 2);

      this.shine.clear();
      this.shine.rect(this.x + 2, y, this.cellSize - 4, this.cellSize / 2);
      this.shine.fill({ color: 0xffffff, alpha });

      if (t >= 1) {
        this.shine.clear(); // remove shine
        this.app.ticker.remove(tick);
        this._shineDone = true;
        if (this._bounceDone && this.onStopComplete) this.onStopComplete(this);
      }
    };

    this.app.ticker.add(tick);
  }

  setInstant(symbols) {
    // symbols is [row0,row1,row2] in your current usage
    for (let j = 0; j < this.visibleCount; j++) {
      const symId = symbols[j] ?? this.randomSymbol();
      const sprite = this.sprites[j];
      sprite.texture = this.textures[getTextureKey(symId)];
      sprite.y = this.y + j * this.cellSize + 5;
    }
  }

  playExpandWild(newSymbols) {
    // returns a Promise that resolves when animation ends
    return new Promise((resolve) => {
      const overlay = new Graphics()
        .roundRect(
          this.x + 4,
          this.y + 4,
          this.cellSize - 8,
          this.visibleCount * this.cellSize - 8,
          10
        )
        .fill({ color: 0xff6600, alpha: 0.0 });

      if (this.filter) overlay.filters = [new BlurFilter(4)];
      this.container.addChild(overlay);

      // quick “lava sweep” + swap symbols mid-way
      gsap.to(overlay, {
        alpha: 0.75,
        duration: 0.18,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
        onRepeat: () => {
          // midpoint: apply expanded symbols
          this.setInstant(newSymbols);
        },
        onComplete: () => {
          this.container.removeChild(overlay);
          overlay.destroy();
          resolve();
        },
      });
    });
  }
}

/* -------------------------------------------------------------
   Main game setup
------------------------------------------------------------- */
async function start() {
  const canvas = document.getElementById("slotBothWayCanvas");

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
    background: "#333333",
    width,
    height,
  });

  // layout
  const marginX = width * 0.1;
  const marginTop = height * 0.15;
  const slotWidth = width * 0.8;
  const slotHeight = height * 0.6;
  const slotY = marginTop;

  // slot background
  const slotContainer = new Graphics()
    .roundRect(marginX, slotY, slotWidth, slotHeight, 16)
    .fill({ color: 0x222222 })
    .stroke({ width: 3, color: 0xffffff });
  app.stage.addChild(slotContainer);

  const reelCols = 5;
  const reelRows = 3;
  const cellSize = Math.min(slotWidth / reelCols, slotHeight / reelRows);
  const totalGridWidth = reelCols * cellSize;
  const totalGridHeight = reelRows * cellSize;
  const offsetX = marginX + (slotWidth - totalGridWidth) / 2;
  const offsetY = slotY + (slotHeight - totalGridHeight) / 2;

  // mask
  const mask = new Graphics()
    .rect(offsetX, offsetY, totalGridWidth, totalGridHeight)
    .fill({ color: 0xffffff });
  app.stage.addChild(mask);

  // load textures
  // prettier-ignore
  const symbolNames = ["symbol_1", "symbol_2", "symbol_3", "symbol_4", "symbol_5",
                       "symbol_6", "symbol_7", "symbol_8"
                      ];
  const symbolTextures = {};
  for (const name of symbolNames) {
    symbolTextures[name] = await Assets.load(
      `/assets/slot_both_way/${name}.png`
    );
  }
  // create reels
  const reels = [];
  for (let i = 0; i < reelCols; i++) {
    const reelX = offsetX + i * cellSize;
    const reel = new Reel(
      app,
      symbolTextures,
      reelX,
      offsetY,
      reelRows,
      cellSize,
      mask
    );
    reels.push(reel);
  }

  // ticker
  app.ticker.add((ticker) => reels.forEach((r) => r.update(ticker.deltaMS)));

  // container for win lines
  const lineContainer = new Container();
  app.stage.addChild(lineContainer);

  function clearWinEffects() {
    // Kill all GSAP animations on children
    lineContainer.children.forEach((child) => {
      gsap.killTweensOf(child.scale);
    });

    lineContainer.removeChildren();
  }

  const PAYLINE_COLORS = [
    0xff3b3b, // red
    0x3bff3b, // green
    0x3b6cff, // blue
    0xffd93b, // yellow
    0xff3bf5, // magenta
    // 0x3bfff5, // cyan
    // 0xff8c3b, // orange
    // 0x8c3bff, // purple
    // 0x3bff8c, // mint
  ];

  function drawWinLine(paylineIndex) {
    const pattern = PAYLINES[paylineIndex];
    if (!pattern) return;

    const g = new Graphics();

    // const lineColor = 0xff0000; // red
    const lineColor = PAYLINE_COLORS[paylineIndex % PAYLINE_COLORS.length];
    const lineWidth = Math.max(4, cellSize * 0.08);

    const startX = offsetX + cellSize / 2;
    const startY = offsetY + pattern[0] * cellSize + cellSize / 2;

    g.moveTo(startX, startY);

    for (let col = 1; col < reelCols; col++) {
      const x = offsetX + col * cellSize + cellSize / 2;
      const y = offsetY + pattern[col] * cellSize + cellSize / 2;
      g.lineTo(x, y);
    }

    //
    g.stroke({
      width: lineWidth,
      color: lineColor,
      alpha: 0.9,
      cap: "round",
      join: "round",
    });

    // fade-in
    g.alpha = 0;
    lineContainer.addChild(g);

    const fadeDuration = 250;
    const startTime = performance.now();

    const fadeTick = () => {
      const t = Math.min((performance.now() - startTime) / fadeDuration, 1);
      g.alpha = t;
      if (t < 1) {
        app.ticker.addOnce(fadeTick);
      }
    };

    app.ticker.addOnce(fadeTick);

    return g;
  }

  function highlightSymbol(col, row) {
    const glow = new Graphics()
      .circle(0, 0, cellSize * 0.45)
      .fill({ color: 0xffff99, alpha: 0.35 });

    glow.x = offsetX + col * cellSize + cellSize / 2;
    glow.y = offsetY + row * cellSize + cellSize / 2;

    lineContainer.addChild(glow);

    // GSAP pulsing animation
    gsap.fromTo(
      glow.scale,
      { x: 1, y: 1 },
      {
        x: 1.2,
        y: 1.2,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      }
    );
  }

  function animateScatter(col, row) {
    const scatterGlow = new Graphics()
      .circle(0, 0, cellSize * 0.5)
      .fill({ color: 0xffee66, alpha: 0.6 });

    scatterGlow.x = offsetX + col * cellSize + cellSize / 2;
    scatterGlow.y = offsetY + row * cellSize + cellSize / 2;

    lineContainer.addChild(scatterGlow);

    // GSAP pulse
    gsap.fromTo(
      scatterGlow,
      { alpha: 0.0, scale: 0.3 },
      {
        alpha: 1,
        scale: 1.2,
        duration: 0.6,
        yoyo: true,
        repeat: 2,
        ease: "sine.inOut",
        onComplete: () => {
          gsap.to(scatterGlow, {
            alpha: 0,
            duration: 0.3,
            onComplete: () => {
              lineContainer.removeChild(scatterGlow);
            },
          });
        },
      }
    );
  }

  function applyStageToReels(stage) {
    for (let i = 0; i < reels.length; i++) {
      reels[i].setInstant(stage[i]);
    }
  }

  // BALANCE
  let balance = 1000;

  const balanceText = new Text({
    text: `Balance: ${balance}`,
    style: {
      fill: "#ffffff",
      fontSize: Math.min(height * 0.03, 20),
      fontWeight: "bold",
    },
  });
  balanceText.x = width - 180;
  balanceText.y = 10;
  balanceText.text = `Balance: ${balance}`;
  app.stage.addChild(balanceText);
  // END BALANCE

  // WIN TEXT (upper middle)
  const winText = new Text({
    text: "",
    style: {
      fill: "#ffffff",
      fontSize: Math.min(height * 0.03, 20),
      fontWeight: "bold",
    },
  });
  winText.x = width / 2;
  winText.y = 10; //
  winText.alpha = 0; // hidden by default
  app.stage.addChild(winText);

  // spin button
  const buttonWidth = slotWidth * 0.4;
  const buttonHeight = 50;
  const buttonX = width / 2 - buttonWidth / 2;
  const buttonY = slotY + slotHeight + height * 0.05;

  const spinButton = new Graphics()
    .roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10)
    .fill({ color: 0x00aa00 })
    .stroke({ width: 3, color: 0xffffff });
  app.stage.addChild(spinButton);

  const spinText = new Text({
    text: "SPIN",
    style: { fill: "#ffffff", fontSize: 24, fontWeight: "bold" },
  });
  spinText.anchor.set(0.5);
  spinText.x = width / 2;
  spinText.y = buttonY + buttonHeight / 2;
  app.stage.addChild(spinText);

  function lockSpinButton() {
    spinButton.eventMode = "none";
    spinButton.tint = 0x555555; // greyed out
    spinText.text = "NO BALANCE";
  }

  function unlockSpinButton() {
    spinButton.eventMode = "static";
    // remove the tint and return to the original colors:
    // spinButton.tint = 0xffffff; // not working
    spinButton.tint = 0x00aa00; // not working
    // spinButton.color = 0x00ff00;
    spinText.text = "SPIN";
  }

  // spin logic
  spinButton.eventMode = "static";
  spinButton.cursor = "pointer";

  // !! SPIN ON CLICK !!
  spinButton.on("pointerdown", async () => {
    // console.log("SPIN clicked");
    if (balance < 1) {
      lockSpinButton();
      return;
    }

    spinButton.eventMode = "none";
    spinButton.tint = 0x008800;
    spinText.text = "SPINNING...";
    const pombal = balance - 1;
    balanceText.text = `Balance: ${pombal}`;

    clearWinEffects();

    // hide previous win
    winText.text = "";
    winText.alpha = 0;

    try {
      const response = await fetch("/api/slot_both_way/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance }),
      });

      const data = await response.json();

      // const tempBalance = balance - BET;
      // balanceText.text = `Balance: ${tempBalance}`;

      // console.log(data);

      // insufficient balance or other error
      if (data.error) {
        balance = data.balance;
        balanceText.text = `Balance: ${balance}`;

        if (balance < 1) lockSpinButton();
        else unlockSpinButton();

        return;
      }

      // start animation
      reels.forEach((r) => r.startSpin());

      const {
        reels: reelData,
        win: win,
        winningLinesLeft: winningLinesLeft,
        winningLinesRight: winningLinesRight,
        balance: newBalance,
      } = data;
      // console.log(reels);
      // console.log("win: ", win);
      // console.log("winning lines: ", winningLines);
      // console.log("scatters: ", scatters);

      // stop on ORIGINAL stage always
      reels.forEach((reel, i) => {
        setTimeout(() => {
          reel.onStopComplete = async () => {
            // only do “final actions” after the last reel stops
            if (i !== reels.length - 1) return;

            // --- Now everything is in final (expanded) state ---
            balance = newBalance;
            balanceText.text = `Balance: ${balance}`;

            if (win > 0) {
              winText.text = `Win: ${win}`;
              winText.alpha = 1;
            }

            // paylines (assumed computed for FINAL stage)
            winningLinesLeft.forEach(({ lineIndex, length }) => {
              drawWinLine(lineIndex);
              const pattern = PAYLINES[lineIndex];
              for (let col = 0; col < length; col++) {
                const row = pattern[col];
                highlightSymbol(col, row);
              }
            });

            winningLinesRight.forEach(({ lineIndex, length }) => {
              drawWinLine(lineIndex);
              const pattern = PAYLINES[lineIndex];
              for (let col = 0; col < length; col++) {
                const row = pattern[col];
                highlightSymbol(4 - col, row);
              }
            });

            if (balance < 1) lockSpinButton();
            else unlockSpinButton();

            spinText.text = "SPIN";
            spinButton.tint = 0xffffff; // white tint returns to normal color
            spinButton.eventMode = "static";
          };

          // stop reel at ORIGINAL stage symbols
          reel.stopAt(reelData[i]);
        }, i * SLOT_SETTINGS.reelDelay + SLOT_SETTINGS.spinDuration + 1);
      });

      //
    } catch (err) {
      console.error("Spin request failed:", err);
      spinText.text = "SPIN";
      spinButton.tint = 0xffffff;
      spinButton.eventMode = "static";
    }
  });

  let spacePressed = false;

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !spacePressed) {
      spacePressed = true;
      event.preventDefault();
      if (spinButton.eventMode === "static" && balance >= 1) {
        spinButton.emit("pointerdown");
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      spacePressed = false;
    }
  });
}

start();
