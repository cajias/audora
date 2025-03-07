#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi

import { startMonitoring } from "./packages/audio-monitor/mod.ts";
import { brightRed, cyan, bold } from "@std/fmt/colors";

// Get application name from command line
const args = Deno.args;

if (args.length < 1) {
  console.error(brightRed("Error: Missing application name"));
  console.log("Usage: audora <application-name>");
  Deno.exit(1);
}

const applicationName = args[0];

console.log(cyan(`Starting audio monitor for ${bold(applicationName)}...`));

try {
  await startMonitoring({ applicationName });
  
  // Keep process running
  await new Promise(() => {});
} catch (error) {
  console.error(brightRed(`Fatal error: ${error.message}`));
  Deno.exit(1);
}