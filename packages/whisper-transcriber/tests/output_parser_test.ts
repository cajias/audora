import { assertEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { WhisperTranscriber } from "../src/transcriber.ts";
import { TranscriptionResult } from "../src/types.ts";

// Create a test fixture for the output parser
// We'll use the protected methods via a test subclass
class TestableTranscriber extends WhisperTranscriber {
  constructor() {
    super();
    // Override cache dir to avoid env access
    (this as any).cacheDir = "/tmp/test";
  }
  
  public override parseWhisperOutput(output: string) {
    return super.parseWhisperOutput(output);
  }
  
  public override parseJsonOutput(json: any) {
    return super.parseJsonOutput(json);
  }
  
  public override parseTextOutput(output: string) {
    return super.parseTextOutput(output);
  }
  
  public override parseTimestamp(timestamp: string) {
    return super.parseTimestamp(timestamp);
  }
}

Deno.test("parseWhisperOutput - should parse JSON output", () => {
  const transcriber = new TestableTranscriber();
  
  const jsonOutput = JSON.stringify({
    text: "This is a test transcription.",
    language: "en",
    confidence: 0.95,
    segments: [
      {
        id: 0,
        start: 0,
        end: 2.5,
        text: "This is a test",
        confidence: 0.96
      },
      {
        id: 1,
        start: 2.5,
        end: 4.0,
        text: "transcription.",
        confidence: 0.94
      }
    ]
  });
  
  const result = transcriber.parseWhisperOutput(jsonOutput);
  
  assertEquals(result.text, "This is a test transcription.");
  assertEquals(result.detectedLanguage, "en");
  assertEquals(result.confidence, 0.95);
  assertEquals(result.segments?.length, 2);
  assertEquals(result.segments?.[0].text, "This is a test");
  assertEquals(result.segments?.[1].text, "transcription.");
});

Deno.test("parseWhisperOutput - should parse text output", () => {
  const transcriber = new TestableTranscriber();
  
  const textOutput = `[00:00:00 --> 00:00:02] This is a test
[00:00:02 --> 00:00:04] transcription.`;
  
  const result = transcriber.parseWhisperOutput(textOutput);
  
  assertEquals(result.text, "This is a test transcription.");
  assertEquals(result.segments?.length, 2);
  assertEquals(result.segments?.[0].text, "This is a test");
  assertEquals(result.segments?.[1].text, "transcription.");
});

Deno.test("parseTimestamp - should convert timestamp to seconds", () => {
  const transcriber = new TestableTranscriber();
  
  assertEquals(transcriber.parseTimestamp("00:00:00"), 0);
  assertEquals(transcriber.parseTimestamp("00:00:30"), 30);
  assertEquals(transcriber.parseTimestamp("00:01:00"), 60);
  assertEquals(transcriber.parseTimestamp("00:01:30"), 90);
  assertEquals(transcriber.parseTimestamp("01:00:00"), 3600);
  assertEquals(transcriber.parseTimestamp("01:30:45"), 5445);
});