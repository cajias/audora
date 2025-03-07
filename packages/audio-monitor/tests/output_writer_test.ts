import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { OutputWriter } from "../src/output_writer.ts";
import { AudioMonitorConfig, TranscriptionResult } from "../src/types.ts";
import { join } from "@std/path";

// Mock Deno.writeTextFile
const originalWriteTextFile = Deno.writeTextFile;
let mockFileContent = "";

async function mockWriteTextFile(path: string | URL, data: string | ReadableStream<string>, options?: Deno.WriteFileOptions): Promise<void> {
  const content = typeof data === "string" ? data : "";
  const pathStr = path instanceof URL ? path.toString() : path;
  
  if (options?.append) {
    mockFileContent += content;
  } else {
    mockFileContent = content;
  }
}

Deno.test({
  name: "OutputWriter - text format",
  fn: async () => {
    try {
      // Replace writeTextFile with mock
      (Deno as any).writeTextFile = mockWriteTextFile;
      mockFileContent = "";
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp",
        outputFormat: "txt",
        outputDirectory: "./test-output",
        includeTimestamps: true
      };
      
      const writer = new OutputWriter(config);
      await writer.initialize();
      
      // Check header
      assertStringIncludes(mockFileContent, "Application: TestApp");
      assertStringIncludes(mockFileContent, "Session Start:");
      
      // Write transcription
      const result: TranscriptionResult = {
        text: "This is a test transcription.",
        segments: [
          { start: 0, end: 2.5, text: "This is a test" },
          { start: 2.5, end: 4.0, text: "transcription." }
        ],
        startTime: Date.now(),
        endTime: Date.now() + 4000,
        sessionId: "test-session",
        applicationName: "TestApp"
      };
      
      await writer.writeTranscription(result);
      
      // Check transcription
      assertStringIncludes(mockFileContent, "[00:00:00] This is a test");
      assertStringIncludes(mockFileContent, "[00:00:02] transcription.");
    } finally {
      // Restore original writeTextFile
      (Deno as any).writeTextFile = originalWriteTextFile;
    }
  }
});

Deno.test({
  name: "OutputWriter - json format",
  fn: async () => {
    try {
      // Replace writeTextFile with mock
      (Deno as any).writeTextFile = mockWriteTextFile;
      mockFileContent = "";
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp",
        outputFormat: "json",
        outputDirectory: "./test-output"
      };
      
      const writer = new OutputWriter(config);
      await writer.initialize();
      
      // Check header
      assertStringIncludes(mockFileContent, "\"application\": \"TestApp\"");
      assertStringIncludes(mockFileContent, "\"sessionStart\":");
      
      // Write transcription
      const result: TranscriptionResult = {
        text: "This is a test transcription.",
        segments: [
          { start: 0, end: 2.5, text: "This is a test" },
          { start: 2.5, end: 4.0, text: "transcription." }
        ],
        startTime: Date.now(),
        endTime: Date.now() + 4000,
        sessionId: "test-session",
        applicationName: "TestApp"
      };
      
      await writer.writeTranscription(result);
      
      // Check transcription
      assertStringIncludes(mockFileContent, "\"text\": \"This is a test transcription.\"");
      assertStringIncludes(mockFileContent, "\"sessionId\": \"test-session\"");
    } finally {
      // Restore original writeTextFile
      (Deno as any).writeTextFile = originalWriteTextFile;
    }
  }
});

Deno.test({
  name: "OutputWriter - srt format",
  fn: async () => {
    try {
      // Replace writeTextFile with mock
      (Deno as any).writeTextFile = mockWriteTextFile;
      mockFileContent = "";
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp",
        outputFormat: "srt",
        outputDirectory: "./test-output"
      };
      
      const writer = new OutputWriter(config);
      await writer.initialize();
      
      // Check header
      assertStringIncludes(mockFileContent, "WEBVTT");
      assertStringIncludes(mockFileContent, "Session: TestApp");
      
      // Write transcription
      const result: TranscriptionResult = {
        text: "This is a test transcription.",
        segments: [
          { start: 0, end: 2.5, text: "This is a test" },
          { start: 2.5, end: 4.0, text: "transcription." }
        ],
        startTime: Date.now(),
        endTime: Date.now() + 4000,
        sessionId: "test-session",
        applicationName: "TestApp"
      };
      
      await writer.writeTranscription(result);
      
      // Check transcription
      assertStringIncludes(mockFileContent, "1");
      assertStringIncludes(mockFileContent, "00:00:00,000 --> 00:00:02,500");
      assertStringIncludes(mockFileContent, "This is a test");
      assertStringIncludes(mockFileContent, "2");
      assertStringIncludes(mockFileContent, "00:00:02,500 --> 00:00:04,000");
      assertStringIncludes(mockFileContent, "transcription.");
    } finally {
      // Restore original writeTextFile
      (Deno as any).writeTextFile = originalWriteTextFile;
    }
  }
});

Deno.test({
  name: "OutputWriter - filename creation",
  fn: async () => {
    try {
      // Mock Deno.writeTextFile to capture filename
      let capturedPath = "";
      (Deno as any).writeTextFile = async (path: string | URL, data: string | ReadableStream<string>) => {
        capturedPath = path instanceof URL ? path.toString() : path;
        mockFileContent = typeof data === "string" ? data : "";
      };
      
      const config: AudioMonitorConfig = {
        applicationName: "TestApp",
        outputFormat: "txt",
        outputDirectory: "./test-output",
        filePrefix: "custom-prefix"
      };
      
      const writer = new OutputWriter(config);
      await writer.initialize();
      
      // Check filename format
      const expectedPathRegex = /\.\/test-output\/custom-prefix_TestApp_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}.*\.txt/;
      assertEquals(expectedPathRegex.test(capturedPath), true);
    } finally {
      // Restore original writeTextFile
      (Deno as any).writeTextFile = originalWriteTextFile;
    }
  }
});