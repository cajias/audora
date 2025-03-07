#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi

import { startMonitoring } from "./packages/audio-monitor/mod.ts";
import { brightRed, cyan, bold, green } from "@std/fmt/colors";
import { join } from "@std/path";

// Get application name from command line
const args = Deno.args;

if (args.length < 1) {
  console.error(brightRed("Error: Missing application name"));
  console.log("Usage: audora <application-name>");
  Deno.exit(1);
}

const applicationName = args[0];
const outputDirectory = join(Deno.cwd(), "transcriptions");

console.log(cyan(`Starting audio monitor for ${bold(applicationName)}...`));
console.log(green(`Transcriptions will be saved to: ${bold(outputDirectory)}`));

try {
  await startMonitoring({ 
    applicationName,
    outputDirectory
  });
  
  // Keep process running
  await new Promise(() => {});
} catch (error) {
  console.error(brightRed(`Fatal error: ${error.message}`));
  Deno.exit(1);
}