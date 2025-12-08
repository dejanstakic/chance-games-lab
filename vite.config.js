import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        game_1: "src/game_1.js",
        keno_basic: "src/keno_basic.js",
        keno_magic_ball: "src/keno_magic_ball.js",
        keno_stop_ball: "src/keno_stop_ball.js",
        crazy_jumper: "src/crazy_jumper.js",
        forex_simulator: "src/forex_simulator.js",
        example_slot: "src/example_slot.js",
        slot_fortune_forge_journey: "src/slot_fortune_forge_journey.js",
      },
      output: {
        // all game files appear as:
        // dist/assets/<name>.js
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
