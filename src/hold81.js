const { Application, Graphics, Text, Container } = PIXI;

const INITIAL_RESPINS = 3;
const BET = 100;

async function start() {
  const canvas = document.getElementById("hold81Canvas");

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

  // === LAYOUT ===
  const marginX = width * 0.06;
  const marginTop = height * 0.06;
  const slotWidth = width * 0.8;
  const slotHeight = height * 0.8;

  const boardContainer = new Container();
  boardContainer.x = marginX;
  boardContainer.y = marginTop;
  app.stage.addChild(boardContainer);

  // === GRID SIZES ===
  const boardSize = Math.min(slotWidth, slotHeight);
  const gridSizePx = boardSize / 3; // one 3x3 grid
  const cellSizePx = gridSizePx / 3; // one cell

  // === CREATE GRIDS ===
  // DATA STRUCTURE
  const grids = [];
  const activeGridSet = new Set([0]); // runtime state only

  for (let g = 0; g < 9; g++) {
    const gridContainer = new Container();

    const bgLayer = new Container();
    const cellLayer = new Container();
    const overlayLayer = new Container();

    gridContainer.addChild(bgLayer);
    gridContainer.addChild(cellLayer);
    gridContainer.addChild(overlayLayer);

    // logical position
    const gx = g % 3;
    const gy = Math.floor(g / 3);
    const visualY = 2 - gy;

    gridContainer.x = gx * gridSizePx;
    gridContainer.y = visualY * gridSizePx;

    // --- BACKGROUND (always inactive initially) ---
    const bgGraphics = new Graphics();
    bgGraphics.rect(0, 0, gridSizePx, gridSizePx);
    bgGraphics.fill(0x111111);
    bgLayer.addChild(bgGraphics);

    // --- CELLS ---
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const cx = i % 3;
      const cy = Math.floor(i / 3);

      const cellX = cx * cellSizePx;
      const cellY = cy * cellSizePx;

      const cellGraphics = new Graphics();
      cellGraphics.rect(cellX, cellY, cellSizePx, cellSizePx);
      cellGraphics.stroke({ width: 1, color: 0xaaaaaa });
      cellLayer.addChild(cellGraphics);

      const valueText = new Text({
        text: "",
        style: {
          fontSize: cellSizePx * 0.5,
          fill: 0xffdd66,
          fontWeight: "bold",
          stroke: 0x000000,
          strokeThickness: Math.max(2, cellSizePx * 0.08),
        },
      });
      valueText.anchor.set(0.5);
      valueText.x = cellX + cellSizePx / 2;
      valueText.y = cellY + cellSizePx / 2;
      valueText.visible = false;
      cellLayer.addChild(valueText);

      cells.push({
        bg: cellGraphics,
        valueText,
        x: cellX,
        y: cellY,
        spinner: null,
        reel: null, // NEW
      });
    }

    // --- BORDER (inactive initially) ---
    const borderGraphics = new Graphics();
    overlayLayer.addChild(borderGraphics);

    // --- DEBUG LABEL ---
    // const label = new Text({
    //   text: `g${g}`,
    //   style: { fill: 0xffffff, fontSize: 14 },
    // });
    // label.x = 6;
    // label.y = 4;
    // overlayLayer.addChild(label);

    boardContainer.addChild(gridContainer);

    grids.push({
      gridId: g,
      container: gridContainer,
      bgLayer,
      cellLayer,
      overlayLayer,
      bgGraphics,
      borderGraphics,
      cells,
    });
  }
  // initial active grid
  activateGridVisuals(0);

  //   -------- END CREATE GRIDS -------------

  // === INFO PANEL ===
  const infoPanel = new Container();
  infoPanel.x = marginX + boardSize + 100;
  infoPanel.y = marginTop;
  app.stage.addChild(infoPanel);

  // --- BALANCE ---
  let balance = 1000; // mock for now

  const balanceText = new Text({
    text: `Balance: ${balance}`,
    style: {
      fill: 0xffffff,
      fontSize: 18,
      fontWeight: "bold",
      align: "right",
    },
  });
  balanceText.style.align = "right";
  balanceText.x = 180;
  balanceText.y = 0;
  balanceText.anchor.set(1, 0);
  infoPanel.addChild(balanceText);

  // --- MID INFO ---
  const infoStyle = {
    fill: 0xffffff,
    fontSize: 22,
    fontWeight: "bold",
  };

  const spinsLeftText = new Text({ text: "Spins left: 3", style: infoStyle });
  const stepWinText = new Text({ text: "Step win: ", style: infoStyle });
  const totalWinText = new Text({
    text: "Total win: ",
    style: { ...infoStyle, fontWeight: "bold" },
  });

  spinsLeftText.y = 80;
  // spinsLeftText.style.align = "right";
  stepWinText.y = 120;
  totalWinText.y = 160;

  infoPanel.addChild(spinsLeftText, stepWinText, totalWinText);

  //  === FUNCTIONS FOR INFO PANEL ===
  let runningTotalWin = 0;

  function updateSpinsLeft(n) {
    spinsLeftText.text = `Spins left: ${n}`;
  }

  function updateStepWin(n) {
    stepWinText.text = `Step win: ${n}`;
  }

  function updateTotalWin(n) {
    totalWinText.text = `Total win: ${n}`;
  }

  //  === END FUNCTIONS FOR INFO PANEL ===

  // === PLAYER FUNCTIONS ===
  async function playSteps(steps) {
    runningTotalWin = 0;
    updateTotalWin(0);
    for (const step of steps) {
      await playStep(step);
    }

    // END OF SPIN
    await delay(1500); // let last animation breathe
    resetGrid();

    // reset info panel
    updateStepWin("");
    // updateSpinsLeft(INITIAL_RESPINS);
    updateSpinsLeft("");
    updateTotalWin("");
    // console.log("SPIN COMPLETE");
  }

  async function playStep(step) {
    updateSpinsLeft(step.respinsAfter);
    updateStepWin("");

    const promises = [];
    let spinDurationCumulative = 0;
    const cellCount = step.spinResults.length;
    if (cellCount < 10) spinDurationCumulative = 1000;
    if (cellCount < 15) spinDurationCumulative = 750;

    for (const r of step.spinResults) {
      const grid = grids[r.gridId];
      const cell = grid.cells[r.cellId];
      spinDurationCumulative += 60 + Math.random() * 60;

      promises.push(
        spinAndResolveCell(
          cell,
          grid.cellLayer,
          r.value,
          spinDurationCumulative
        )
      );
    }
    // console.log(
    //   `Length of spin results - cells ${step.spinResults.length}  anim length: ${spinDurationCumulative}`
    // );

    // wait for all cells to finish their own lifecycle
    await Promise.all(promises);

    // now the step is truly finished
    updateStepWin(step.win);
    runningTotalWin += step.win;
    updateTotalWin(runningTotalWin);

    updateSpinsLeft(step.respinsAfter);
    // unlock new active grid
    // applyGridUnlocks(step);
    for (const id of step.newGridsUnlocked || []) {
      if (!activeGridSet.has(id)) {
        activeGridSet.add(id);
        activateGridVisuals(id);
      }
    }
    await delay(1000);
  }
  function spinAndResolveCell(cell, cellLayer, value, spinDurationCumulative) {
    return new Promise((resolve) => {
      const startDelay = 450 + Math.random() * 250;
      // const spinDuration = 750 + Math.random() * 250;
      const spinDuration = spinDurationCumulative + Math.random() * 250;

      setTimeout(() => {
        // spin coin
        // spinCoin(cell, cellLayer, spinDuration, () => {
        //   // immediately resolve THIS cell
        //   resolveCell(cell, value);
        //   resolve();
        // });

        // spinArc(cell, cellLayer, spinDuration, () => {
        //   resolveCell(cell, value);
        //   resolve();
        // });
        spinSector(cell, cellLayer, spinDuration, () => {
          resolveCell(cell, value);
          resolve();
        });
      }, startDelay);
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function spinSector(cell, cellLayer, duration, done) {
    const cx = cell.x + cellSizePx / 2;
    const cy = cell.y + cellSizePx / 2;

    const sector = new Graphics();
    cell.spinner = sector;
    cellLayer.addChild(sector);

    const radius = cellSizePx * 0.32;
    const revolutions = 2 + Math.random() * 2;

    const start = performance.now();

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);

      // strong ease-out (important for feel)
      const eased = 1 - Math.pow(1 - t, 3);

      const angle = eased * Math.PI * 2 * revolutions;
      const span = Math.PI * (0.7 - 0.5 * t); // sector narrows over time

      sector.clear();

      sector
        .moveTo(cx, cy)
        .lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
        .arc(cx, cy, radius, angle, angle + span)
        .lineTo(cx, cy)
        .fill({
          color: 0xf5c542, // gold
          // color: 0xffffff, // white
          alpha: 0.8 * (1 - t), // fade out
        });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        sector.destroy();
        cell.spinner = null;
        done();
      }
    }

    requestAnimationFrame(tick);
  }

  function spinArc(cell, cellLayer, duration, done) {
    const cx = cell.x + cellSizePx / 2;
    const cy = cell.y + cellSizePx / 2;

    const arc = new Graphics();
    cell.spinner = arc;
    cellLayer.addChild(arc);

    const radius = cellSizePx * 0.28;
    const lineWidth = Math.max(3, cellSizePx * 0.08);

    const start = performance.now();
    const revolutions = 2 + Math.random() * 2; // randomness

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);

      // ease-out rotation
      const eased = 1 - Math.pow(1 - t, 3);
      const angle = eased * Math.PI * 2 * revolutions;

      // arc length shrinks near the end
      const arcSpan = Math.PI * (0.8 - 0.6 * t);

      arc.clear();
      arc.arc(cx, cy, radius, angle, angle + arcSpan).stroke({
        width: lineWidth,
        color: 0xffffff,
        alpha: 1 - t, // fade out
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        arc.destroy();
        cell.spinner = null;
        done();
      }
    }

    requestAnimationFrame(tick);
  }

  function spinCoin(cell, cellLayer, duration, done) {
    const cx = cell.x + cellSizePx / 2;
    const cy = cell.y + cellSizePx / 2;

    const coin = new Container();
    coin.x = cx;
    coin.y = cy;

    cell.spinner = coin;
    cellLayer.addChild(coin);

    // --- COIN BODY ---
    const body = new Graphics();
    body.circle(0, 0, cellSizePx * 0.22);
    body.fill(0xf5c542);
    body.stroke({ width: 2, color: 0xd4a017 });
    coin.addChild(body);

    // --- SHINE ---
    const shine = new Graphics();
    shine.circle(-cellSizePx * 0.08, -cellSizePx * 0.08, cellSizePx * 0.08);
    shine.fill(0xffffff);
    shine.alpha = 0.35;
    coin.addChild(shine);

    // random initial rotation
    coin.rotation = Math.random() * Math.PI;

    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);

      // fake 3D spin using horizontal scale
      const spin = Math.sin(p * Math.PI * 6); // number of flips
      coin.scale.x = 0.2 + 0.8 * Math.abs(spin);
      coin.scale.y = 1;

      // slight wobble rotation
      coin.rotation += 0.15;

      // shine sweep
      shine.x = -cellSizePx * 0.15 + p * cellSizePx * 0.3;

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        coin.destroy();
        cell.spinner = null;
        done();
      }
    }

    requestAnimationFrame(tick);
  }

  function resolveCell(cell, value) {
    if (value > 0) {
      const txt = cell.valueText;
      txt.text = value.toString();
      txt.visible = true;
      txt.alpha = 0;
      txt.scale.set(0.3);

      const start = performance.now();
      const duration = 220;

      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        txt.alpha = p;
        txt.scale.set(0.3 + 0.7 * p);

        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }
    // value === 0 → do nothing (cell stays empty)
  }

  function animateCellResolve(cell, value) {
    return new Promise((resolve) => {
      if (value > 0) {
        const txt = cell.valueText;
        txt.text = value.toString();
        txt.visible = true;
        txt.alpha = 0;
        txt.scale.set(0.3);

        const duration = 250;
        const start = performance.now();

        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const s = 0.3 + 0.7 * p;

          txt.alpha = p;
          txt.scale.set(s);

          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        }

        requestAnimationFrame(tick);
      } else {
        // losing cell: small delay so resolution feels intentional
        setTimeout(resolve, 120);
      }
    });
  }

  // function resetGrid() {
  //   for (const grid of grids) {
  //     // reset grid visuals (active / inactive)
  //     const isActive = grid.gridId === 0;

  //     // background
  //     grid.bgLayer.children[0].tint = isActive ? 0x2a5bd7 : 0x111111;

  //     // border
  //     const border = grid.overlayLayer.children.find(
  //       (c) => c instanceof Graphics
  //     );
  //     if (border) {
  //       border.clear();
  //       const strokeWidth = isActive ? 4 : 2;
  //       const inset = strokeWidth / 2;

  //       border
  //         .rect(
  //           inset,
  //           inset,
  //           gridSizePx - strokeWidth,
  //           gridSizePx - strokeWidth
  //         )
  //         .stroke({
  //           width: strokeWidth,
  //           color: isActive ? 0xffff66 : 0x777777,
  //         });
  //     }

  //     // reset cells
  //     for (const cell of grid.cells) {
  //       // remove number
  //       cell.valueText.text = "";
  //       cell.valueText.visible = false;
  //       cell.valueText.scale.set(1);
  //       cell.valueText.alpha = 1;

  //       // safety: remove spinner if any
  //       if (cell.spinner) {
  //         cell.spinner.destroy();
  //         cell.spinner = null;
  //       }
  //     }
  //   }
  //   activeGridSet.clear();
  //   activeGridSet.add(0);
  // }

  function resetGrid() {
    activeGridSet.clear();
    activeGridSet.add(0);

    for (let g = 0; g < grids.length; g++) {
      if (g === 0) activateGridVisuals(0);
      else deactivateGridVisuals(g);

      for (const cell of grids[g].cells) {
        cell.valueText.visible = false;
        cell.valueText.text = "";
        cell.spinner?.destroy();
        cell.spinner = null;
      }
    }
  }

  function applyGridUnlocks(step) {
    if (!step.newGridsUnlocked) return;

    for (const gridId of step.newGridsUnlocked) {
      if (!activeGridSet.has(gridId)) {
        activeGridSet.add(gridId);
        activateGridVisuals(gridId);
      }
    }
  }

  function activateGridVisuals(gridId) {
    const grid = grids[gridId];

    grid.bgGraphics.clear();
    grid.bgGraphics.rect(0, 0, gridSizePx, gridSizePx);
    grid.bgGraphics.fill(0x2a5bd7);

    grid.borderGraphics.clear();
    const strokeWidth = 4;
    const inset = strokeWidth / 2;
    grid.borderGraphics
      .rect(inset, inset, gridSizePx - strokeWidth, gridSizePx - strokeWidth)
      .stroke({ width: strokeWidth, color: 0xffff66 });
  }

  function deactivateGridVisuals(gridId) {
    const grid = grids[gridId];

    grid.bgGraphics.clear();
    grid.bgGraphics.rect(0, 0, gridSizePx, gridSizePx);
    grid.bgGraphics.fill(0x111111);

    grid.borderGraphics.clear();
    const strokeWidth = 2;
    const inset = strokeWidth / 2;
    grid.borderGraphics
      .rect(inset, inset, gridSizePx - strokeWidth, gridSizePx - strokeWidth)
      .stroke({ width: strokeWidth, color: 0x777777 });
  }

  // === END PLAYER FUNCTIONS ===

  //
  // === SPIN BUTTON ===
  const button = new Container();

  const buttonBg = new Graphics();
  const btnW = 160;
  const btnH = 50;

  buttonBg.rect(0, 0, btnW, btnH);
  buttonBg.fill(0x0066cc);
  buttonBg.stroke({ width: 2, color: 0xffffff });

  button.addChild(buttonBg);

  const btnText = new Text({
    text: "SPIN",
    style: {
      fill: 0xffffff,
      fontSize: 22,
      fontWeight: "bold",
    },
  });
  btnText.anchor.set(0.5);
  btnText.x = btnW / 2;
  btnText.y = btnH / 2;

  button.addChild(btnText);

  // button.x = width / 2 - btnW / 2;
  // button.y = marginTop + boardSize + 30;
  button.x = (slotWidth - marginX) / 2 - btnW / 2;
  button.y = marginTop + boardSize + 30;

  button.eventMode = "static";
  button.cursor = "pointer";

  app.stage.addChild(button);

  function setSpinButtonEnabled(enabled) {
    if (enabled) {
      button.eventMode = "static";
      button.cursor = "pointer";

      buttonBg.clear();
      buttonBg.rect(0, 0, btnW, btnH);
      buttonBg.fill(0x0066cc);
      buttonBg.stroke({ width: 2, color: 0xffffff });

      btnText.alpha = 1;
      button.alpha = 1;
    } else {
      button.eventMode = "none";
      button.cursor = "default";

      buttonBg.clear();
      buttonBg.rect(0, 0, btnW, btnH);
      buttonBg.fill(0x444444);
      buttonBg.stroke({ width: 2, color: 0x888888 });

      btnText.alpha = 0.6;
      button.alpha = 0.8;
    }
  }

  // old button
  // const button = new Graphics();
  // const btnW = 160;
  // const btnH = 50;
  // button.rect(0, 0, btnW, btnH);
  // button.fill(0x0066cc);
  // button.stroke({ width: 2, color: 0xffffff });
  // button.x = (slotWidth - marginX) / 2 - btnW / 2;
  // button.y = marginTop + boardSize + 30;
  // button.eventMode = "static";
  // button.cursor = "pointer";

  // const btnText = new Text({
  //   text: "SPIN",
  //   style: {
  //     fill: 0xffffff,
  //     fontSize: 22,
  //     fontWeight: "bold",
  //   },
  // });
  // btnText.anchor.set(0.5);
  // btnText.x = btnW / 2;
  // btnText.y = btnH / 2;

  // button.addChild(btnText);
  // app.stage.addChild(button);

  button.on("pointerdown", async () => {
    // button.eventMode = "none"; // disable during play
    setSpinButtonEnabled(false);

    try {
      const res = await fetch("/api/hold81/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance }),
      });

      const data = await res.json();

      const tempBalance = balance - BET;
      balanceText.text = `Balance: ${tempBalance}`;

      // console.log("SERVER RESULT", data);

      await playSteps(data.steps);
      // console.log("novi balance: ", data.balance);
      balance = data.balance;
      balanceText.text = `Balance ${balance}`;
    } catch (err) {
      console.error(err);
    }

    // button.eventMode = "static";
    setSpinButtonEnabled(true);
  });
}

start();

function setCellValue(grid, cellId, value) {
  // console.log("fjskdljflksd");
  const cell = grid.cells[cellId];

  if (value > 0) {
    cell.valueText.text = value.toString();
    cell.valueText.visible = true;
  }
}
