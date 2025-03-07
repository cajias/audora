/**
 * Script to generate a coverage badge from LCOV data
 * 
 * This script reads the LCOV coverage data and generates a badge SVG file
 * that can be included in the README.md file.
 * 
 * Usage:
 * deno run --allow-read --allow-write scripts/coverage_badge.ts
 */

import { join } from "@std/path";

// Path to LCOV file
const lcovPath = join("coverage", "lcov.info");

// Read LCOV file
let lcovContent: string;
try {
  lcovContent = await Deno.readTextFile(lcovPath);
} catch (error) {
  console.error(`Error reading LCOV file: ${error.message}`);
  console.error("Run 'deno task coverage:report' first to generate LCOV data");
  Deno.exit(1);
}

// Parse LCOV data to get coverage percentage
const coverage = parseLcovCoverage(lcovContent);
console.log(`Coverage: ${coverage.toFixed(2)}%`);

// Generate badge SVG
const badgeSvg = generateCoverageBadge(coverage);

// Write badge to file
const badgePath = join("coverage", "badge.svg");
await Deno.writeTextFile(badgePath, badgeSvg);
console.log(`Badge written to ${badgePath}`);

/**
 * Parse LCOV data to get coverage percentage
 */
function parseLcovCoverage(lcovContent: string): number {
  let totalLines = 0;
  let coveredLines = 0;
  
  // Parse each file's coverage data
  const lines = lcovContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith("LF:")) {
      // Total lines
      totalLines += parseInt(line.substring(3), 10);
    } else if (line.startsWith("LH:")) {
      // Covered lines
      coveredLines += parseInt(line.substring(3), 10);
    }
  }
  
  // Calculate percentage
  if (totalLines === 0) {
    return 0;
  }
  
  return (coveredLines / totalLines) * 100;
}

/**
 * Generate a coverage badge SVG
 */
function generateCoverageBadge(coverage: number): string {
  // Determine color based on coverage
  let color = "#e05d44"; // red
  if (coverage >= 90) {
    color = "#4c1"; // bright green
  } else if (coverage >= 80) {
    color = "#97CA00"; // green
  } else if (coverage >= 70) {
    color = "#dfb317"; // yellow
  } else if (coverage >= 60) {
    color = "#fe7d37"; // orange
  }
  
  // Format coverage percentage
  const coverageText = `${coverage.toFixed(0)}%`;
  
  // Calculate badge width based on text length
  const coverageTextWidth = coverageText.length * 7 + 10;
  const totalWidth = 94 + coverageTextWidth;
  
  // Generate SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h70v20H0z"/>
    <path fill="${color}" d="M70 0h${coverageTextWidth + 24}v20H70z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="35" y="15" fill="#010101" fill-opacity=".3">coverage</text>
    <text x="35" y="14">coverage</text>
    <text x="${70 + coverageTextWidth / 2 + 12}" y="15" fill="#010101" fill-opacity=".3">${coverageText}</text>
    <text x="${70 + coverageTextWidth / 2 + 12}" y="14">${coverageText}</text>
  </g>
</svg>`;
}