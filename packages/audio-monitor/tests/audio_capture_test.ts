import { assertEquals, assertExists } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { AudioCapture } from "../src/audio_capture.ts";
import { AudioMonitorConfig } from "../src/types.ts";

// Mock Deno.Command
class MockCommand {
  constructor(private cmd: string, private options: Deno.CommandOptions) {}
  
  spawn(): MockChildProcess {
    return new MockChildProcess(this.cmd);
  }
  
  async output(): Promise<Deno.CommandOutput> {
    // Mock different commands
    switch (this.cmd) {
      case "ffmpeg":
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("ffmpeg version 4.4"),
          stderr: new TextEncoder().encode(""),
          signal: null
        };
      case "osascript":
        // Return true if the app name is "TestApp"
        const appExists = this.options.args?.some(arg => arg.includes("TestApp"));
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode(appExists ? "true" : "false"),
          stderr: new TextEncoder().encode(""),
          signal: null
        };
      case "pactl":
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("Sink Input #123\n  application.name = \"TestApp\""),
          stderr: new TextEncoder().encode(""),
          signal: null
        };
      case "powershell":
        // Return success if the app name is "TestApp"
        const psAppExists = this.options.args?.some(arg => arg.includes("TestApp"));
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode(psAppExists ? "Handles  NPM(K)    PM(K)      WS(K)" : ""),
          stderr: new TextEncoder().encode(""),
          signal: null
        };
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
}

class MockChildProcess {
  constructor(private cmd: string) {}
  
  stdout = {
    getReader: () => ({
      read: async () => ({
        value: new TextEncoder().encode("Mock audio data"),
        done: false
      }),
      releaseLock: () => {}
    })
  };
  
  stderr = {
    getReader: () => ({
      read: async () => ({ value: new Uint8Array(), done: true }),
      releaseLock: () => {}
    })
  };
}

Deno.test({
  name: "AudioCapture - initialization",
  fn: async () => {
    // Store original Command
    const originalCommand = Deno.Command;
    
    try {
      // Replace Command with mock
      (Deno as any).Command = MockCommand;
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp"
      };
      
      const capture = new AudioCapture(config);
      
      // Should initialize without error
      await capture.initialize();
      
      // Test finding application
      const found = await capture.findApplication("TestApp");
      assertEquals(found, true);
      
      const notFound = await capture.findApplication("NonExistentApp");
      assertEquals(notFound, false);
    } finally {
      // Restore original Command
      (Deno as any).Command = originalCommand;
    }
  }
});

Deno.test({
  name: "AudioCapture - start and stop capture",
  fn: async () => {
    // Store original Command
    const originalCommand = Deno.Command;
    
    try {
      // Replace Command with mock
      (Deno as any).Command = MockCommand;
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp",
        bufferSize: 0.1 // Small buffer for testing
      };
      
      const capture = new AudioCapture(config);
      await capture.initialize();
      
      // Start capture
      await capture.startCapture();
      
      // Wait a bit for buffer to fill
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get buffer
      const buffer = await capture.getNextBuffer();
      
      // Stop capture
      await capture.stopCapture();
      
      // Buffer should be null after stopping
      const emptyBuffer = await capture.getNextBuffer();
      
      // Assertions
      assertExists(buffer);
      assertEquals(buffer?.source, "mixed");
      assertEquals(emptyBuffer, null);
    } finally {
      // Restore original Command
      (Deno as any).Command = originalCommand;
    }
  }
});