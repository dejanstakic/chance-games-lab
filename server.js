// server.js
import express from "express";
import session from "express-session";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

// -------------------------------
// Load environment
// -------------------------------
dotenv.config();
const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;

// --------------------------------
// File system setup
// --------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --------------------------------
// Create servers
// --------------------------------
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// for Render !!
app.set("trust proxy", 1);

// --------------------------------
// Middlewares
// --------------------------------
app.use(express.json());

// EJS
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

// Public static folder (always served)
app.use(express.static(join(__dirname, "public")));

//
app.use(express.urlencoded({ extended: true }));

// In production, serve Vite build output
if (isProduction) {
  app.use(express.static(join(__dirname, "dist")));
}
// In development: serve raw ES modules from /src
if (!isProduction) {
  app.use("/src", express.static(join(__dirname, "src")));
}

// Make env available inside EJS templates
app.use((req, res, next) => {
  res.locals.isProduction = isProduction;
  next();
});

// Sessions
app.use(
  session({
    secret: "slot-machine-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// -------------------------------
// Import game cores
// -------------------------------
import { generateResult } from "./server/game_1_core.js";
import { kenoBasic } from "./server/keno_basic_core.js";
import { crazyJumper } from "./server/crazy_jumper_core.js";
import { kenoMagicBall } from "./server/keno_magic_ball_core.js";
import { kenoStopBall } from "./server/keno_stop_ball_core.js";
import { newChange } from "./server/forex_simulator_core.js";
import { exampleSlot } from "./server/example_slot_core.js";
import { slotFortuneForgeJourney } from "./server/slot_fortune_forge_journey_core.js";
import { hold81Spin } from "./server/hold81_core.js";
import { slotExpandingWilds } from "./server/slot_expanding_wilds_core.js";
import { slotBothWay } from "./server/slot_both_way_core.js";

// -------------------------------
// ROUTES: PUBLIC / PRODUCTION
// -------------------------------
app.get("/", (req, res) => res.render("pages/index"));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 2, // 5 submits per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact page
app.get("/contact", (req, res) => res.render("pages/contact"));
// app.get("/contact", (req, res) => {
//   res.render("pages/contact", {
//     title: "Contact",
//     pageStyles: ["/css/contact.css"], // optional
//   });
// });

// Add finished games here...
app.get("/crazy_jumper", (req, res) => res.render("pages/crazy_jumper"));
app.get("/keno_basic", (req, res) => res.render("pages/keno_basic"));
app.get("/keno_magic_ball", (req, res) => res.render("pages/keno_magic_ball"));
app.get("/keno_stop_ball", (req, res) => res.render("pages/keno_stop_ball"));
app.get("/slot_fortune_forge_journey", (req, res) =>
  res.render("pages/slot_fortune_forge_journey")
);
app.get("/forex_simulator", (req, res) => res.render("pages/forex_simulator"));
app.get("/hold81", (req, res) => res.render("pages/hold81"));
app.get("/slot_expanding_wilds", (req, res) =>
  res.render("pages/slot_expanding_wilds")
);
app.get("/slot_both_way", (req, res) => res.render("pages/slot_both_way"));

// -------------------------------
// ROUTES: DEVELOPMENT ONLY
// -------------------------------
if (!isProduction) {
  app.get("/game_1", (req, res) => res.render("pages/game_1"));
  app.get("/example_slot", (req, res) => res.render("pages/example_slot"));
  app.get("/virtual_race", (req, res) => res.render("pages/virtual_race"));
}

// -------------------------------
// API routes (same in dev & prod)
// -------------------------------
app.get("/api/game_1/spin", (req, res) => {
  const genRresult = generateResult();
  res.json({ result: genRresult.result });
});

// Contact form submit
app.post("/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body; // website = honeypot

    // Honeypot: real users won't fill this
    if (website && website.trim().length > 0) {
      return res.status(200).render("pages/contact", {
        title: "Contact",
        pageStyles: ["/css/contact.css"],
        success: true,
      });
    }

    // time trap
    const ts = Number(req.body.ts || 0);
    if (!ts || Date.now() - ts < 1500) {
      // too fast -> likely bot
      return res
        .status(200)
        .render("pages/contact", { title: "Contact", success: true });
    }

    if (!email || !message) {
      return res.status(400).render("pages/contact", {
        title: "Contact",
        pageStyles: ["/css/contact.css"],
        error: "Please provide your email and a message.",
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true", // false for 587/TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const safeSubject = (subject || "Website contact").toString().slice(0, 120);

    await transporter.sendMail({
      from: `"Chance Games Lab" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO,
      replyTo: email,
      subject: `[Contact] ${safeSubject}`,
      text:
        `Name: ${name || "-"}\n` +
        `Email: ${email}\n` +
        `Subject: ${safeSubject}\n\n` +
        `${message}\n`,
    });

    return res.status(200).render("pages/contact", {
      title: "Contact",
      pageStyles: ["/css/contact.css"],
      success: true,
    });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).render("pages/contact", {
      title: "Contact",
      pageStyles: ["/css/contact.css"],
      error:
        "Sorry—something went wrong while sending your message. Please try again later.",
    });
  }
});

// Keno Basic API
app.post("/api/keno_basic/play", (req, res) => {
  const { selected, balance } = req.body;
  res.json(kenoBasic(selected, balance));
});

// Magic Ball Keno API
app.post("/api/keno_magic_ball/play", (req, res) => {
  const { selected, balance } = req.body;
  res.json(kenoMagicBall(selected, balance));
});

// Stop Ball Keno API
app.post("/api/keno_stop_ball/play", (req, res) => {
  const { selected, balance } = req.body;
  res.json(kenoStopBall(selected, balance));
});

// Crazy Jumper API
app.post("/api/crazy_jumper/play", (req, res) => {
  const { balance } = req.body;
  res.json(crazyJumper(balance));
});

// Example Slot API
app.post("/api/example_slot/spin", (req, res) => {
  if (!req.session.slotData) {
    req.session.slotData = { balance: 1000, collected: [] };
  }

  const state = req.session.slotData;
  const result = exampleSlot(state);

  state.balance = result.balance;
  state.collected = result.collected;
  res.json(result);
});

// Fortune Forge Journey API
app.post("/api/slot_fortune_forge_journey/spin", (req, res) => {
  if (!req.session.ffj) {
    req.session.ffj = { balance: 1000, collected: [] };
  }

  const state = req.session.ffj;
  const bet = 1;

  if (state.balance < bet) {
    return res.json({ error: "Insufficient balance", reels: [], win: 0 });
  }

  state.balance -= bet;
  const spinResult = slotFortuneForgeJourney(state);
  state.balance = spinResult.balance;
  state.collected = spinResult.collected;

  res.json(spinResult);
});

// Hold 81 API
app.post("/api/hold81/spin", (req, res) => {
  const { balance } = req.body;
  res.json(hold81Spin(balance));
});

// slot Expanding Wilds
app.post("/api/slot_expanding_wilds/spin", (req, res) => {
  const { balance } = req.body;
  res.json(slotExpandingWilds(balance));
});

// slot Both Way
app.post("/api/slot_both_way/spin", (req, res) => {
  const { balance } = req.body;
  res.json(slotBothWay(balance));
});

/////////////
//
//  END API.POST
//
/////////////////

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////////////////////////////////////////

// -------------------------------
// FOREX SIMULATOR (WebSocket)
// -------------------------------
const RESOLVE_STEPS = 200;
let forexPrice = 1000;
let tickCount = 0;
const activeBets = new Map();

setInterval(() => {
  forexPrice += newChange();
  tickCount++;
  io.emit("forex_update", { tick: tickCount, value: forexPrice });

  for (const [userId, bets] of activeBets.entries()) {
    const remaining = [];
    for (const bet of bets) {
      if (tickCount >= bet.targetTick) {
        const win =
          (bet.type === "LOW" && forexPrice < bet.entryPrice) ||
          (bet.type === "HIGH" && forexPrice > bet.entryPrice);

        io.to(bet.socketId).emit("bet_result", {
          ...bet,
          resolvedTick: tickCount,
          finalPrice: forexPrice,
          win,
        });
      } else {
        remaining.push(bet);
      }
    }
    if (remaining.length > 0) activeBets.set(userId, remaining);
    else activeBets.delete(userId);
  }
}, 200);

io.on("connection", (socket) => {
  socket.on("place_bet", (bet) => {
    const fullBet = {
      ...bet,
      entryTick: tickCount,
      targetTick: tickCount + RESOLVE_STEPS,
      socketId: socket.id,
    };

    const userBets = activeBets.get(bet.userId) || [];
    userBets.push(fullBet);
    activeBets.set(bet.userId, userBets);
  });
});

// -------------------------------
// Start server
// -------------------------------
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
