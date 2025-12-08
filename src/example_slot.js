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
  if (code >= 1000) return `S10_${code % 1000}`;
  return `S${code}`;
}

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
      () => Math.floor(Math.random() * 9) + 1 // without 10
    );
    this.offset = 0;

    // --- container for reel graphics ---
    this.container = new Container();
    this.container.mask = mask;
    app.stage.addChild(this.container);

    // --- visible symbol sprites (flipped) ---
    this.sprites = Array.from({ length: visibleCount }, (_, j) => {
      const s = new Sprite(this.textures[`S${this.symbols[j]}`]);
      s.width = cellSize - 10;
      s.height = cellSize - 10;
      s.x = this.x + 5;
      s.y = this.y + (visibleCount - 1 - j) * cellSize + 5;
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
    return Math.floor(Math.random() * 9) + 1; // initial start without 10
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
      const sprite = this.sprites[this.visibleCount - 1 - j];
      // sprite.texture = this.textures[`S${symId}`];
      sprite.texture = this.textures[getTextureKey(symId)];

      sprite.y =
        this.y +
        (this.visibleCount - 1 - j) * this.cellSize +
        5 +
        (this.offset % this.cellSize);
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
      const sprite = this.sprites[this.visibleCount - 1 - j];
      sprite.texture = this.textures[getTextureKey(symId)];

      sprite.y = this.y + (this.visibleCount - 1 - j) * this.cellSize + 5;
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
        const sprite = this.sprites[this.visibleCount - 1 - j];
        sprite.y =
          this.y +
          (this.visibleCount - 1 - j) * this.cellSize +
          5 +
          displacement;
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
  const canvas = document.getElementById("exampleSlotCanvas");

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

  // 🧺 Collection area
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
  const symbolNames = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10",
                       "S10_1", "S10_2", "S10_3", "S10_5", "S10_8", "S10_10", "S10_12", 
                       "S10_15", "S10_20", "S10_25", "S10_50", "S10_100" 
                      ];
  const symbolTextures = {};
  for (const name of symbolNames) {
    symbolTextures[name] = await Assets.load(
      `/assets/example_slot/${name}.png`
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

  // balance
  let balance = 100;
  const balanceText = new Text({
    text: `Balance: ${balance}`,
    style: { fill: "#ffffff", fontSize: 22, fontWeight: "bold" },
  });
  balanceText.x = width - 160;
  balanceText.y = 10;
  app.stage.addChild(balanceText);

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

  // spin logic
  spinButton.eventMode = "static";
  spinButton.cursor = "pointer";

  spinButton.on("pointerdown", async () => {
    // console.log("SPIN clicked");
    spinButton.eventMode = "none";
    spinButton.tint = 0x008800;
    spinText.text = "SPINNING...";

    reels.forEach((r) => r.startSpin());

    try {
      const response = await fetch("/api/example_slot/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance }),
      });
      const {
        reels: reelData,
        collected: collected,
        win,
        balance: newBalance,
      } = await response.json();
      console.log(reels);
      console.log(collected);
      console.log(win);
      console.log(balance);
      // sequential stop
      reels.forEach((reel, i) => {
        setTimeout(() => {
          // when reel finishes, fire callback
          reel.onStopComplete = (r) => {
            if (i === reels.length - 1) {
              // last reel finished all animations ✅
              balance = newBalance;
              balanceText.text = `Balance: ${balance}`;
              spinText.text = "SPIN";
              spinButton.tint = 0xffffff;
              spinButton.eventMode = "static";
            }
          };
          reel.stopAt(reelData[i]);
        }, i * SLOT_SETTINGS.reelDelay + SLOT_SETTINGS.spinDuration);
      });

      //
      // when a symbol should be “collected,” call:
      // addCollectedSymbol(nextIndex, symbolTextures["S7"]);
      //
    } catch (err) {
      console.error("Spin request failed:", err);
      spinText.text = "SPIN";
      spinButton.tint = 0xffffff;
      spinButton.eventMode = "static";
    }
  });
}

start();
