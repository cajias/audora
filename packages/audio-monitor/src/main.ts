/**
 * Main entry point for the audio monitor
 */

import { AudioMonitor } from "./monitor.ts";
import { AudioMonitorConfig, MonitorEvent } from "./types.ts";
import { brightGreen, brightRed, yellow, cyan, bold } from "@std/fmt/colors";

/**
 * Start monitoring an application
 */
export async function startMonitoring(config: AudioMonitorConfig): Promise<AudioMonitor> {
  // Create monitor
  const monitor = new AudioMonitor(config);
  
  // Add event listeners
  monitor.addEventListener(handleMonitorEvent);
  
  // Initialize and start
  await monitor.initialize();
  await monitor.start();
  
  return monitor;
}

/**
 * Handle monitor events
 */
function handleMonitorEvent(event: MonitorEvent): void {
  switch (event.type) {
    case "status_change":
      logStatus(event.status, event.message);
      break;
    
    case "application_found":
      console.log(brightGreen(`✓ Application found: ${bold(event.name)}`));
      break;
    
    case "application_lost":
      console.log(yellow(`⚠ Application lost: ${bold(event.name)}`));
      break;
    
    case "transcription":
      logTranscription(event.result.text);
      break;
    
    case "error":
      console.error(brightRed(`✗ Error: ${event.error.message}`));
      break;
  }
}

/**
 * Log status changes
 */
function logStatus(status: string, message?: string): void {
  let statusText = "";
  
  switch (status) {
    case "initializing":
      statusText = cyan("⚙ Initializing...");
      break;
    
    case "waiting_for_application":
      statusText = yellow("⌛ Waiting for application...");
      break;
    
    case "capturing":
      statusText = brightGreen("🎤 Capturing audio...");
      break;
    
    case "transcribing":
      statusText = cyan("🔊 Transcribing audio...");
      break;
    
    case "error":
      statusText = brightRed("✗ Error");
      break;
    
    default:
      statusText = status;
  }
  
  if (message) {
    statusText += ` ${message}`;
  }
  
  console.log(statusText);
}

/**
 * Log transcription results
 */
function logTranscription(text: string): void {
  if (!text.trim()) return;
  
  console.log(brightGreen("📝 Transcription:"));
  console.log(`   ${text}`);
}

// If this module is run directly, start monitoring with command line arguments
if (import.meta.main) {
  const args = Deno.args;
  
  if (args.length < 1) {
    console.error(brightRed("Error: Missing application name"));
    console.log("Usage: deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi src/main.ts <application-name>");
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
}