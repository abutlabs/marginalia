import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_CODE_SKILL } from "../skills/claude-code.js";
import { OPENCLAW_SKILL } from "../skills/openclaw.js";

export async function init(args: string[]): Promise<void> {
  const cwd = process.cwd();
  const claudeOnly = args.includes("--claude-code");
  const openclawOnly = args.includes("--openclaw");
  const both = !claudeOnly && !openclawOnly;

  let installed = 0;

  if (both || claudeOnly) {
    installed += installClaudeCode(cwd);
  }

  if (both || openclawOnly) {
    installed += installOpenClaw(cwd);
  }

  if (installed === 0) {
    console.log("\nNothing to install — skills already exist.");
  }

  console.log(`
Next steps:
  1. Start reading:  /read-book <path-to-epub-or-text>
  2. Continue:        /read-book continue
  3. Check progress:  /read-book status

Reading state is stored in .marginalia/ — add it to .gitignore if you want.
Learn more: https://github.com/abutlabs/marginalia`);
}

function installClaudeCode(cwd: string): number {
  const skillDir = join(cwd, ".claude", "skills", "read-book");
  const skillPath = join(skillDir, "SKILL.md");

  if (existsSync(skillPath)) {
    console.log("[claude-code] Skill already installed at .claude/skills/read-book/SKILL.md");
    return 0;
  }

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillPath, CLAUDE_CODE_SKILL);
  console.log("[claude-code] Installed /read-book skill at .claude/skills/read-book/SKILL.md");
  return 1;
}

function installOpenClaw(cwd: string): number {
  const skillDir = join(cwd, ".openclaw", "skills");
  const skillPath = join(skillDir, "marginalia.md");

  if (existsSync(skillPath)) {
    console.log("[openclaw] Skill already installed at .openclaw/skills/marginalia.md");
    return 0;
  }

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillPath, OPENCLAW_SKILL);
  console.log("[openclaw] Installed /marginalia skill at .openclaw/skills/marginalia.md");
  return 1;
}
