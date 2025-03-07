/**
 * Integration with whisper.cpp for local transcription
 * 
 * This module handles downloading, building, and running whisper.cpp
 * for local transcription without requiring an API key.
 */

import {dirname, join} from "@std/path";
import {ensureDir} from "@std/fs";
import {WhisperConfig} from "./types.ts";

// URLs for whisper.cpp and models
const WHISPER_CPP_REPO = "https://github.com/ggerganov/whisper.cpp.git";
const WHISPER_MODELS_BASE_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

// Model file names by size
const MODEL_FILES: Record<string, string> = {
  "tiny": "ggml-tiny.en.bin",
  "base": "ggml-base.en.bin",
  "small": "ggml-small.en.bin",
  "medium": "ggml-medium.en.bin",
  "large": "ggml-large.bin"
};

/**
 * Download and build whisper.cpp if not already available
 */
export async function setupWhisperCpp(config: WhisperConfig): Promise<string> {
  // Validate model size
  const modelSize = config.modelSize || "base";
  if (!MODEL_FILES[modelSize]) {
    throw new Error(`Unknown model size: ${modelSize}`);
  }
  
  const homeDir = Deno.env.get("HOME") || ".";
  const whisperDir = join(homeDir, ".cache", "audora", "whisper.cpp");
  
  // Ensure directory exists
  await ensureDir(whisperDir);
  
  // Check if whisper.cpp is already cloned and built
  const whisperBinary = join(whisperDir, "main");
  try {
    const stat = await Deno.stat(whisperBinary);
    if (!stat.isFile) {
      console.log("Cloning and building whisper.cpp...");
      await cloneAndBuildWhisperCpp(whisperDir);
    } else {
      console.log("whisper.cpp binary already exists");
    }
  } catch {
    console.log("Cloning and building whisper.cpp...");
    await cloneAndBuildWhisperCpp(whisperDir);
  }

  // Download model if needed
  const modelPath = join(whisperDir, "models", MODEL_FILES[modelSize]);
  try {
    const modelStat = await Deno.stat(modelPath);
    if (!modelStat.isFile) {
      console.log(`Downloading ${modelSize} model...`);
      await downloadWhisperModel(modelSize, whisperDir);
    } else {
      console.log(`Model ${modelSize} already exists at ${modelPath}`);
    }
  } catch {
    console.log(`Downloading ${modelSize} model...`);
    await downloadWhisperModel(modelSize, whisperDir);
  }

  return whisperBinary;
}

/**
 * Clone and build whisper.cpp
 */
async function cloneAndBuildWhisperCpp(whisperDir: string): Promise<void> {
  // Clone the repository
  console.log("Cloning whisper.cpp repository...");
  const cloneProcess = new Deno.Command("git", {
    args: ["clone", "--depth", "1", WHISPER_CPP_REPO, whisperDir],
    stdout: "piped",
    stderr: "piped"
  });
  
  const cloneOutput = await cloneProcess.output();
  if (!cloneOutput.success) {
    const error = new TextDecoder().decode(cloneOutput.stderr);
    throw new Error(`Failed to clone whisper.cpp: ${error}`);
  }
  
  // Build whisper.cpp
  console.log("Building whisper.cpp...");
  
  // First, check if we have a GPU available
  const hasGPU = await checkGPUAvailability();
  
  // Build command based on available hardware
  const buildCmd = hasGPU ? "make" : "make no_gpu";
  
  const buildProcess = new Deno.Command(buildCmd, {
    cwd: whisperDir,
    stdout: "piped",
    stderr: "piped"
  });
  
  const buildOutput = await buildProcess.output();
  if (!buildOutput.success) {
    const error = new TextDecoder().decode(buildOutput.stderr);
    throw new Error(`Failed to build whisper.cpp: ${error}`);
  }
  
  console.log("Successfully built whisper.cpp");
}

/**
 * Check if GPU acceleration is available
 */
async function checkGPUAvailability(): Promise<boolean> {
  // Check for NVIDIA GPU
  try {
    const nvidiaSmi = new Deno.Command("nvidia-smi", {
      stdout: "null",
      stderr: "null"
    });
    const result = await nvidiaSmi.output();
    if (result.success) {
      return true;
    }
  } catch {
    // nvidia-smi not available
  }
  
  // Check for Apple Silicon
  if (Deno.build.os === "darwin") {
    try {
      const sysctl = new Deno.Command("sysctl", {
        args: ["-n", "machdep.cpu.brand_string"],
        stdout: "piped"
      });
      const result = await sysctl.output();
      if (result.success) {
        const cpu = new TextDecoder().decode(result.stdout);
        if (cpu.includes("Apple M")) {
          return true; // Apple Silicon has good GPU acceleration
        }
      }
    } catch {
      // sysctl failed
    }
  }
  
  return false;
}

/**
 * Download a Whisper model
 */
async function downloadWhisperModel(modelSize: string, whisperDir: string): Promise<void> {
  const modelFile = MODEL_FILES[modelSize];
  if (!modelFile) {
    throw new Error(`Unknown model size: ${modelSize}`);
  }
  
  const modelUrl = `${WHISPER_MODELS_BASE_URL}/${modelFile}`;
  const modelsDir = join(whisperDir, "models");
  
  // Ensure models directory exists
  await ensureDir(modelsDir);
  
  // Download the model using curl (more reliable than fetch for large files)
  const downloadProcess = new Deno.Command("curl", {
    args: [
      "-L",                                    // Follow redirects
      "-C", "-",                              // Resume download if interrupted
      "--output", join(modelsDir, modelFile), // Output file
      modelUrl                                // URL to download from
    ],
    stdout: "piped",
    stderr: "piped"
  });
  
  const downloadOutput = await downloadProcess.output();
  if (!downloadOutput.success) {
    const error = new TextDecoder().decode(downloadOutput.stderr);
    throw new Error(`Failed to download model: ${error}`);
  }
  
  console.log(`Successfully downloaded ${modelSize} model`);
}

/**
 * Run whisper.cpp on an audio file
 */
export async function runWhisperCommand(
  whisperBinary: string,
  audioFile: string,
  config: WhisperConfig
): Promise<string> {
  const modelSize = config.modelSize || "base";
  const modelFile = MODEL_FILES[modelSize];
  const modelPath = join(dirname(whisperBinary), "models", modelFile);
  
  // Build command arguments
  const args = [
    "-m", modelPath,           // Model path
    "-f", audioFile,           // Input file
    "-t", String(config.threads || 4), // Number of threads
    "-otxt",                   // Output format: text
    "--output-json"           // Also output JSON
  ];
  
  // Add language if specified
  if (config.language) {
    args.push("-l", config.language);
  }
  
  // Add translation flag if needed
  if (config.translate) {
    args.push("--translate");
  }
  
  // Run whisper command
  const whisperProcess = new Deno.Command(whisperBinary, {
    args,
    stdout: "piped",
    stderr: "piped"
  });
  
  // Set timeout if specified
  const controller = new AbortController();
  const timeoutId = config.timeout ? setTimeout(() => controller.abort(), config.timeout) : null;
  
  try {
    const output = await whisperProcess.output();
    
    if (output.success) {
      return new TextDecoder().decode(output.stdout);
    }
      const stderr = new TextDecoder().decode(output.stderr);
      throw new Error(`Whisper transcription failed: ${stderr}`);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}