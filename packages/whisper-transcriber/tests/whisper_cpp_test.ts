import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { WhisperConfig } from "../src/types.ts";
import { runWhisperCommand } from "../src/whisper_cpp.ts";

// Mock Deno.Command
class MockCommand {
  constructor(public cmd: string, public options: Deno.CommandOptions) {}
  
  async output(): Promise<Deno.CommandOutput> {
    // Mock different commands
    switch (this.cmd) {
      case "curl":
        return this.mockCurlOutput();
      case "git":
        return this.mockGitOutput();
      case "make":
        return this.mockMakeOutput();
      case "/mock/path/whisper":
        return this.mockWhisperOutput();
      default:
        return {
          success: false,
          code: 1,
          stdout: new TextEncoder().encode(""),
          stderr: new TextEncoder().encode(`Unknown command: ${this.cmd}`),
          signal: null
        };
    }
  }
  
  private mockCurlOutput(): Deno.CommandOutput {
    // Check if this is a model download
    if (this.options.args?.includes("ggml-base.en.bin")) {
      return {
        success: true,
        code: 0,
        stdout: new TextEncoder().encode("Downloaded model file"),
        stderr: new TextEncoder().encode(""),
        signal: null
      };
    }
    return {
      success: false,
      code: 1,
      stdout: new TextEncoder().encode(""),
      stderr: new TextEncoder().encode("Failed to download"),
      signal: null
    };
  }
  
  private mockGitOutput(): Deno.CommandOutput {
    // Check if this is a clone command
    if (this.options.args?.includes("clone")) {
      return {
        success: true,
        code: 0,
        stdout: new TextEncoder().encode("Cloned repository"),
        stderr: new TextEncoder().encode(""),
        signal: null
      };
    }
    return {
      success: false,
      code: 1,
      stdout: new TextEncoder().encode(""),
      stderr: new TextEncoder().encode("Git command failed"),
      signal: null
    };
  }
  
  private mockMakeOutput(): Deno.CommandOutput {
    return {
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("Built whisper.cpp"),
      stderr: new TextEncoder().encode(""),
      signal: null
    };
  }
  
  private mockWhisperOutput(): Deno.CommandOutput {
    return {
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("This is a mock transcription"),
      stderr: new TextEncoder().encode(""),
      signal: null
    };
  }
}

Deno.test({
  name: "whisper_cpp - runWhisperCommand",
  fn: async () => {
    // Store original Command
    const originalCommand = Deno.Command;
    
    try {
      // Replace Command with mock
      (Deno as any).Command = MockCommand;
      
      const config: WhisperConfig = {
        modelSize: "base",
        threads: 4
      };
      
      // Should return transcription
      const output = await runWhisperCommand(
        "/mock/path/whisper",
        "/mock/path/audio.wav",
        config
      );
      
      assertEquals(output, "This is a mock transcription");
    } finally {
      // Restore original Command
      (Deno as any).Command = originalCommand;
    }
  }
});