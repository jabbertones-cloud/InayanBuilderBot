#!/usr/bin/env node
/**
 * Deterministic helper for a simple iOS game greenfield: prints scaffold checklist + exemplar links.
 * Optional: --spec path/to/spec.json { "title", "orientation", "engine": "spritekit"|"swiftui" }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const DEFAULT_SPEC = {
  title: "GreenfieldIOSGame",
  orientation: "portrait",
  engine: "spritekit",
};

function getArg(name, argv) {
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return null;
}

const specPath = getArg("--spec", process.argv);
let spec = { ...DEFAULT_SPEC };
if (specPath && fs.existsSync(specPath)) {
  try {
    spec = { ...DEFAULT_SPEC, ...JSON.parse(fs.readFileSync(specPath, "utf8")) };
  } catch {
    console.error("magic-run-ios-game: invalid JSON spec");
    process.exit(1);
  }
}

const out = {
  ok: true,
  kind: "ios_game_scaffold_plan",
  spec,
  steps: [
    "Create Xcode project (iOS App, Swift, SwiftUI or SpriteKit Game template).",
    "Add single scene / root SwiftUI + SKView bridge if using SpriteKit.",
    "Add XCTest target; wire xcodebuild test in CI (GitHub Actions macOS runner).",
    "Document signing, bundle id, and TestFlight path in README.",
  ],
  exemplars: [
    { name: "SpriteKit-SwiftUI-Template", url: "https://github.com/shial4/SpriteKit-SwiftUI-Template" },
    { name: "spaceshooter-spritekit-ios-game", url: "https://github.com/T0MM11Y/spaceshooter-spritekit-ios-game" },
  ],
  output_dir_suggestion: path.join(rootDir, "..", "ios-greenfield-game"),
  generated_at: new Date().toISOString(),
};

console.log(JSON.stringify(out, null, 2));
