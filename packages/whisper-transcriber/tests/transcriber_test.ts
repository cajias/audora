import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { WhisperTranscriber } from "../src/transcriber.ts";
import { TranscriberStatus } from "../src/types.ts";
import * as whisperCpp from "../src/whisper_cpp.ts";

// Create mock functions
const mockSetupWhisperCpp = async () => "/mock/path/to/whisper";
const mockRunWhisperCommand = async () => "This is a mock transcription result.";

// Create a test fixture
Deno.test({
  name: "WhisperTranscriber - basic initialization",
  fn: async () => {
    // Create a mock module
    const mockWhisperCpp = {
      setupWhisperCpp: mockSetupWhisperCpp,
      runWhisperCommand: mockRunWhisperCommand
    };
    
    try {
      const transcriber = new WhisperTranscriber({
        modelSize: "tiny"
      });
      
      // Inject mocks
      (transcriber as any).setupWhisperCpp = mockSetupWhisperCpp;
      (transcriber as any).runWhisperCommand = mockRunWhisperCommand;
      
      // Check initial state
      assertEquals(transcriber.getStatus(), "idle" as TranscriberStatus);
      
      // Initialize
      await transcriber.initialize();
      
      // Should be ready after initialization
      assertEquals(transcriber.getStatus(), "ready" as TranscriberStatus);
      
      // Add some audio data
      const audioData = new Uint8Array(1600); // 0.05 seconds of 16kHz mono audio
      transcriber.addAudioData(audioData);
      
      // Transcribe
      const result = await transcriber.transcribe();
      
      // Check result
      assertExists(result);
      assertEquals(result.text, "This is a mock transcription result.");
      
      // Status should be back to ready
      assertEquals(transcriber.getStatus(), "ready" as TranscriberStatus);
      
      // Clear buffer
      transcriber.clearAudioBuffer();
      
      // Transcribe empty buffer
      const emptyResult = await transcriber.transcribe();
      assertEquals(emptyResult.text, "");
    } finally {
      // No cleanup needed
    }
  }
});

Deno.test({
  name: "WhisperTranscriber - error handling",
  fn: async () => {
    try {
      const transcriber = new WhisperTranscriber();
      
      // Inject mock that throws
      (transcriber as any).setupWhisperCpp = async () => {
        throw new Error("Mock initialization error");
      };
      
      // Initialize should throw
      await assertRejects(
        async () => {
          await transcriber.initialize();
        },
        Error,
        "Failed to initialize Whisper transcriber"
      );
      
      // Status should be error
      assertEquals(transcriber.getStatus(), "error" as TranscriberStatus);
      
      // Transcribe should throw if not initialized
      await assertRejects(
        async () => {
          await transcriber.transcribe();
        },
        Error,
        "Transcriber is not ready"
      );
    } finally {
      // No cleanup needed
    }
  }
});