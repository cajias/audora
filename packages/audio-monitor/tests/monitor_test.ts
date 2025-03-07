import { assertEquals, assertRejects } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { AudioMonitor } from "../src/monitor.ts";
import { AudioMonitorConfig, MonitorEvent } from "../src/types.ts";

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
      default:
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode(""),
          stderr: new TextEncoder().encode(""),
          signal: null
        };
    }
  }
}

class MockFailingCommand {
  constructor(private cmd: string, private options: Deno.CommandOptions) {}
  
  async output(): Promise<Deno.CommandOutput> {
    return {
      success: false,
      code: 1,
      stdout: new TextEncoder().encode(""),
      stderr: new TextEncoder().encode("Mock error"),
      signal: null
    };
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
  name: "AudioMonitor - basic initialization",
  fn: async () => {
    // Store original Command
    const originalCommand = Deno.Command;
    
    try {
      // Replace Command with mock
      (Deno as any).Command = MockCommand;
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp"
      };
      
      const monitor = new AudioMonitor(config);
      
      // Track events
      const events: MonitorEvent[] = [];
      monitor.addEventListener(event => events.push(event));
      
      // Initialize
      await monitor.initialize();
      
      // Check status
      assertEquals(monitor.getStatus(), "waiting_for_application");
      
      // Check events
      assertEquals(events.length, 2);
      assertEquals(events[0].type, "status_change");
      assertEquals((events[0] as any).status, "initializing");
      assertEquals(events[1].type, "status_change");
      assertEquals((events[1] as any).status, "waiting_for_application");
    } finally {
      // Restore original Command
      (Deno as any).Command = originalCommand;
    }
  }
});

Deno.test({
  name: "AudioMonitor - error handling",
  fn: async () => {
    // Store original Command
    const originalCommand = Deno.Command;
    
    try {
      // Replace Command with mock that always fails
      (Deno as any).Command = MockFailingCommand;
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp"
      };
      
      const monitor = new AudioMonitor(config);
      
      // Track events
      const events: MonitorEvent[] = [];
      monitor.addEventListener(event => events.push(event));
      
      // Should throw on initialization
      await assertRejects(
        () => monitor.initialize(),
        Error
      );
      
      // Check events
      assertEquals(events.length, 2);
      assertEquals(events[0].type, "status_change");
      assertEquals((events[0] as any).status, "initializing");
      assertEquals(events[1].type, "status_change");
      assertEquals((events[1] as any).status, "error");
    } finally {
      // Restore original Command
      (Deno as any).Command = originalCommand;
    }
  }
});

Deno.test({
  name: "AudioMonitor - event listeners",
  fn: () => {
    const config: AudioMonitorConfig = {
      applicationName: "TestApp"
    };
    
    const monitor = new AudioMonitor(config);
    
    // Add listeners
    const events1: MonitorEvent[] = [];
    const events2: MonitorEvent[] = [];
    
    const listener1 = (event: MonitorEvent) => events1.push(event);
    const listener2 = (event: MonitorEvent) => events2.push(event);
    
    monitor.addEventListener(listener1);
    monitor.addEventListener(listener2);
    
    // Emit an event
    (monitor as any).emitEvent({ type: "status_change", status: "idle" });
    
    // Remove one listener
    monitor.removeEventListener(listener1);
    
    // Emit another event
    (monitor as any).emitEvent({ type: "status_change", status: "initializing" });
    
    // Check events
    assertEquals(events1.length, 1);
    assertEquals(events2.length, 2);
  }
});