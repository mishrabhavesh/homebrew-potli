#!/usr/bin/env node
/**
 * Invoked by tsc-watch's --onSuccess after every successful main-process
 * compile. Deliberately a single command with no shell chaining ("&&") in
 * its own invocation — tsc-watch does not reliably pass compound shell
 * commands through to a real shell in every environment, which previously
 * caused `npm run build:preload && electron .` to be parsed as `npm run
 * build:preload` with "&&", "electron", "." appended as extra CLI arguments
 * (esbuild then saw those as bogus extra input files and errored out).
 *
 * This script does the same two steps itself, in plain Node, so tsc-watch
 * only ever has to spawn one unambiguous command: `node scripts/dev-launch.js`.
 */
const { execSync, spawn } = require("node:child_process");

// tsc-watch itself is responsible for killing the previously-spawned
// onSuccess process before invoking this script again — no manual cleanup
// needed here.
execSync("npm run build:preload", { stdio: "inherit" });

const electron = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["electron", "."], {
  stdio: "inherit"
});
electron.on("exit", (code) => process.exit(code ?? 0));
