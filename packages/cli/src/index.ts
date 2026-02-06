#!/usr/bin/env node

import { argv, exit } from "node:process";
import { init } from "./commands/init.js";
import { ingest } from "./commands/ingest.js";
import { extract } from "./commands/extract.js";

const args = argv.slice(2);
const command = args[0];

const USAGE = `marginalia — AI book reading engine

Usage:
  marginalia init [--claude-code] [--openclaw]    Set up reading skills in your project
  marginalia ingest <file>                        Parse a book file, output chapter metadata as JSON
  marginalia extract <file> <chapter-index>       Extract a single chapter's text from a book

Examples:
  npx marginalia init                             Install skills for all detected platforms
  npx marginalia init --claude-code               Install Claude Code skill only
  npx marginalia ingest book.epub                 Parse EPUB and output book.json
  npx marginalia extract book.epub 3              Print chapter 3 text to stdout

Learn more: https://github.com/abutlabs/marginalia`;

async function main(): Promise<void> {
  switch (command) {
    case "init":
      await init(args.slice(1));
      break;
    case "ingest":
      if (!args[1]) {
        console.error("Error: missing file path\nUsage: marginalia ingest <file>");
        exit(1);
      }
      await ingest(args[1]);
      break;
    case "extract":
      if (!args[1] || !args[2]) {
        console.error("Error: missing arguments\nUsage: marginalia extract <file> <chapter-index>");
        exit(1);
      }
      await extract(args[1], parseInt(args[2], 10));
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(USAGE);
      break;
    case "--version":
    case "-v":
      console.log("marginalia 0.1.0");
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  exit(1);
});
