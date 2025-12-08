// import {
//   Application,
//   Graphics,
//   Text,
//   Container,
//   Sprite,
//   Assets,
//   BlurFilter,
// } from "pixi.js";
// import { gsap } from "gsap";
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
  if (code >= 1000) return `item_${code % 1000}`;
  if (code === 1) return "basic_8";
  if (code === 2) return "basic_9";
  if (code === 3) return "basic_10";
  if (code === 4) return "basic_j";
  if (code === 5) return "basic_q";
  if (code === 6) return "basic_k";
  if (code === 7) return "basic_a";
  if (code === 8) return "basic_star";
}

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
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
      () => Math.floor(Math.random() * 8) + 1 // without 10
    );
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
    return Math.floor(Math.random() * 7) + 1; // initial start
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
}

/* -------------------------------------------------------------
   Main game setup
------------------------------------------------------------- */
async function start() {
  const canvas = document.getElementById("slotFortuneForgeJourneyCanvas");

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
  const marginTop = height * 0.2;
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

  // Collection area
  const collectionRows = 1;
  const collectionCols = 10;
  const collectionCell = cellSize / 2;
  const collectionWidth = collectionCols * collectionCell;
  const collectionX = offsetX + (totalGridWidth - collectionWidth) / 2;
  const collectionY = offsetY - collectionCell * 1.2; // slightly above reels

  // background box for collection area
  const collectionBg = new Graphics()
    .roundRect(
      collectionX - 8,
      collectionY - 8,
      collectionWidth + 16,
      collectionCell + 16,
      8
    )
    .fill({ color: 0x444444 })
    .stroke({ width: 2, color: 0xffffff });
  app.stage.addChild(collectionBg);

  // empty slot placeholders
  const collectionSlots = [];
  for (let i = 0; i < collectionCols; i++) {
    const slot = new Graphics()
      .roundRect(
        collectionX + i * collectionCell,
        collectionY,
        collectionCell - 4,
        collectionCell - 4,
        6
      )
      .fill({ color: 0x222222 })
      .stroke({ width: 2, color: 0x888888 });
    app.stage.addChild(slot);
    collectionSlots.push(slot);
  }

  // empty collection slot setup
  const collectedSprites = Array(10).fill(null);

  function addCollectedSymbol(index, texture) {
    if (index < 0 || index >= 10) return;
    if (collectedSprites[index]) app.stage.removeChild(collectedSprites[index]);

    const sprite = new Sprite(texture);
    sprite.width = collectionCell - 8;
    sprite.height = collectionCell - 8;
    sprite.x = collectionX + index * collectionCell + 4;
    sprite.y = collectionY + 4;
    app.stage.addChild(sprite);
    collectedSprites[index] = sprite;
  }

  // mask
  const mask = new Graphics()
    .rect(offsetX, offsetY, totalGridWidth, totalGridHeight)
    .fill({ color: 0xffffff });
  app.stage.addChild(mask);

  // load textures
  // prettier-ignore
  const symbolNames = ["basic_8", "basic_9", "basic_10", "basic_j", "basic_q", 
                       "basic_k", "basic_a", "basic_star", 
                       "item_1", "item_2", "item_3", "item_4", "item_5", "item_6", 
                       "item_7", "item_8", "item_9", "item_10" 
                      ];
  const symbolTextures = {};
  for (const name of symbolNames) {
    symbolTextures[name] = await Assets.load(
      `/assets/slot_fortune_forge_journey/${name}.png`
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

  // reels.forEach((reel) => reel.update(0));

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

  function runBigCollectionWinAnimation() {
    collectedSprites.forEach((sprite, index) => {
      if (!sprite) return;

      // glow fade
      gsap.fromTo(
        sprite,
        { alpha: 1 },
        {
          alpha: 0.2,
          duration: 1.0,
          ease: "power2.inOut", // "sine.inOut",
          yoyo: true,
          repeat: 3,
        }
      );
    });

    // particle explosion after glow ends
    gsap.delayedCall(1.5, () => {
      runCollectionParticles();
    });

    // After animation ends → clear collection
    gsap.delayedCall(5.7, () => {
      gsap.fromTo(
        collectionBg,
        { alpha: 1 },
        {
          alpha: 0.3,
          duration: 0.2,
          yoyo: true,
          repeat: 1,
        }
      );

      clearCollectionArea();
    });
  }

  function runCollectionParticles() {
    const burstCount = Math.floor(Math.random() * 6) + 10; // 10–15 bursts

    for (let b = 0; b < burstCount; b++) {
      // delay each burst a bit → nicer effect
      const delay = b * 0.1 + Math.random() * 0.15;

      gsap.delayedCall(delay, () => {
        createSingleBurst();
      });
    }
  }

  function createSingleBurst() {
    // RANDOM position inside collection area
    const startX = collectionX + Math.random() * collectionWidth;
    const startY = collectionY + Math.random() * collectionCell;

    // number of particles in this burst
    const particleCount = Math.floor(Math.random() * 200) + 250;

    // random bright yellow/orange tone
    const colors = [0xfff566, 0xffdd44, 0xffcc33, 0xffbb22, 0xffaa00];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < particleCount; i++) {
      const particle = new Graphics()
        .circle(0, 0, Math.random() * 3 + 1)
        .fill({ color, alpha: 1 });

      particle.x = startX;
      particle.y = startY;

      app.stage.addChild(particle);

      // explosion angle + speed
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 80;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed;

      // animate
      gsap.to(particle, {
        x: startX + dx,
        y: startY + dy,
        alpha: 0,
        duration: 2.5 + Math.random() * 0.4,
        ease: "power2.out",
        onComplete: () => {
          app.stage.removeChild(particle);
        },
      });
    }
  }

  function clearCollectionArea() {
    for (let i = 0; i < collectedSprites.length; i++) {
      const sprite = collectedSprites[i];
      if (sprite) {
        gsap.killTweensOf(sprite);
        app.stage.removeChild(sprite);
        collectedSprites[i] = null;
      }
    }
  }

  function drawWinLine(paylineIndex) {
    const pattern = PAYLINES[paylineIndex];
    if (!pattern) return;

    const g = new Graphics();

    const lineColor = 0xff0000; // red
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
    spinButton.tint = 0x00aa00;
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
      const response = await fetch("/api/slot_fortune_forge_journey/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({ userId }),
      });

      const data = await response.json();

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
        collected: collected,
        win: win,
        winningLines: winningLines,
        collectedWin: collectedWin,
        balance: newBalance,
        newCollected: newCollected,
        scatters: scatters,
      } = data;
      // console.log(reels);
      // console.log("collected symbols: ", collected);
      // console.log("win: ", win);
      // console.log("winning lines: ", winningLines);
      // console.log(collectedWin);
      // console.log(newCollected);
      // console.log("scatters: ", scatters);
      // sequential stop
      reels.forEach((reel, i) => {
        setTimeout(() => {
          // when reel finishes, fire callback
          reel.onStopComplete = (r) => {
            if (i === reels.length - 1) {
              // last reel finished all animations
              balance = newBalance;
              balanceText.text = `Balance: ${balance}`;

              // SHOW WIN TEXT
              if (win > 0) {
                winText.text = `Win: ${win}`;
                winText.alpha = 1;
              }

              // when a symbol should be “collected,” call:
              collected.forEach((sym, i) => {
                addCollectedSymbol(
                  (sym % 1000) - 1,
                  symbolTextures[getTextureKey(sym)]
                );
              });

              // after updating collected symbols:
              // check if all are collected
              const allCollected = collected.length === 10;

              if (allCollected) {
                runBigCollectionWinAnimation();
              }

              // draw win lines
              winningLines.forEach(({ lineIndex, length }) => {
                drawWinLine(lineIndex);
                const pattern = PAYLINES[lineIndex];
                for (let col = 0; col < length; col++) {
                  const row = pattern[col];
                  highlightSymbol(col, row);
                }
              });

              // After paylines, before re-enabling button
              // scatter - star animation
              if (Array.isArray(scatters)) {
                scatters.forEach(({ col, row }) => {
                  animateScatter(col, row);
                });
              }

              if (balance < 1) lockSpinButton();
              else unlockSpinButton();
              spinText.text = "SPIN";
              spinButton.tint = 0xffffff;
              spinButton.eventMode = "static";
            }
          };
          reel.stopAt(reelData[i]);
        }, i * SLOT_SETTINGS.reelDelay + SLOT_SETTINGS.spinDuration + 1);
      });

      //

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
