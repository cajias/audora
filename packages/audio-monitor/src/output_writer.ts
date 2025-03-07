/**
 * Handles writing transcription output to files
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { AudioMonitorConfig, TranscriptionResult } from "./types.ts";

/**
 * Class for writing transcription output to files
 */
export class OutputWriter {
  private config: AudioMonitorConfig;
  private currentFile: string | null = null;
  private sessionStartTime: number;
  
  constructor(config: AudioMonitorConfig) {
    this.config = {
      outputDirectory: "./transcriptions",
      outputFormat: "txt",
      filePrefix: "transcription",
      includeTimestamps: true,
      appendToExisting: false,
      ...config
    };
    
    this.sessionStartTime = Date.now();
  }
  
  /**
   * Initialize the output writer
   */
  async initialize(): Promise<void> {
    // Ensure output directory exists
    await ensureDir(this.config.outputDirectory!);
    
    // Create new file for this session
    this.currentFile = this.createFilename();
    
    // Write header if needed
    if (!this.config.appendToExisting) {
      await this.writeHeader();
    }
  }
  
  /**
   * Write a transcription result to file
   */
  async writeTranscription(result: TranscriptionResult): Promise<void> {
    if (!this.currentFile) {
      throw new Error("OutputWriter not initialized");
    }
    
    let output = "";
    
    switch (this.config.outputFormat) {
      case "txt":
        output = this.formatAsText(result);
        break;
      case "json":
        output = this.formatAsJson(result);
        break;
      case "srt":
        output = this.formatAsSrt(result);
        break;
      default:
        throw new Error(`Unknown output format: ${this.config.outputFormat}`);
    }
    
    await Deno.writeTextFile(this.currentFile, output, { append: true });
  }
  
  /**
   * Create a filename for the current session
   */
  private createFilename(): string {
    const timestamp = new Date(this.sessionStartTime)
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");
    
    const filename = `${this.config.filePrefix}_${this.config.applicationName}_${timestamp}.${this.config.outputFormat}`;
    return join(this.config.outputDirectory!, filename);
  }
  
  /**
   * Write header information to the file
   */
  private async writeHeader(): Promise<void> {
    if (!this.currentFile) return;
    
    const header = this.createHeader();
    await Deno.writeTextFile(this.currentFile, header);
  }
  
  /**
   * Create header content based on format
   */
  private createHeader(): string {
    const date = new Date(this.sessionStartTime).toISOString();
    
    switch (this.config.outputFormat) {
      case "txt":
        return [
          "=".repeat(80),
          `Application: ${this.config.applicationName}`,
          `Session Start: ${date}`,
          "=".repeat(80),
          "\n"
        ].join("\n");
      
      case "json":
        return JSON.stringify({
          application: this.config.applicationName,
          sessionStart: date,
          transcriptions: []
        }, null, 2);
      
      case "srt":
        return `WEBVTT\n\nSession: ${this.config.applicationName}\nStart: ${date}\n\n`;
      
      default:
        return "";
    }
  }
  
  /**
   * Format transcription as plain text
   */
  private formatAsText(result: TranscriptionResult): string {
    const lines: string[] = [];
    
    if (this.config.includeTimestamps && result.segments) {
      for (const segment of result.segments) {
        const timestamp = this.formatTimestamp(segment.start);
        lines.push(`[${timestamp}] ${segment.text}`);
      }
    } else {
      lines.push(result.text);
    }
    
    return lines.join("\n") + "\n";
  }
  
  /**
   * Format transcription as JSON
   */
  private formatAsJson(result: TranscriptionResult): string {
    return JSON.stringify(result, null, 2) + ",\n";
  }
  
  /**
   * Format transcription as SRT subtitles
   */
  private formatAsSrt(result: TranscriptionResult): string {
    if (!result.segments) {
      return "";
    }
    
    const lines: string[] = [];
    let index = 1;
    
    for (const segment of result.segments) {
      lines.push(
        String(index++),
        `${this.formatSrtTimestamp(segment.start)} --> ${this.formatSrtTimestamp(segment.end)}`,
        segment.text,
        ""
      );
    }
    
    return lines.join("\n");
  }
  
  /**
   * Format a timestamp as HH:MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const date = new Date(seconds * 1000);
    return date.toISOString().substr(11, 8);
  }
  
  /**
   * Format a timestamp as SRT format (HH:MM:SS,mmm)
   */
  private formatSrtTimestamp(seconds: number): string {
    const date = new Date(seconds * 1000);
    return date.toISOString().substr(11, 12).replace(".", ",");
  }
}