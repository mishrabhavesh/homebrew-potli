#!/usr/bin/env node
// Updates a Homebrew Cask's `version` and `sha256 arm:/intel:` lines in
// place. Used by .github/workflows/release-homebrew.yml after a macOS CI
// build produces fresh DMGs — keeps the homebrew-potli tap in sync with
// every version bump on main without any manual copy/paste of checksums.
//
// Usage: node update-cask.js <path-to-potli.rb> <version> <arm_sha256> <intel_sha256>

const fs = require("fs");

const [, , caskPath, version, armSha256, intelSha256] = process.argv;

if (!caskPath || !version || !armSha256 || !intelSha256) {
  console.error("Usage: update-cask.js <path-to-potli.rb> <version> <arm_sha256> <intel_sha256>");
  process.exit(1);
}

if (!/^[0-9a-f]{64}$/i.test(armSha256) || !/^[0-9a-f]{64}$/i.test(intelSha256)) {
  console.error("arm_sha256/intel_sha256 must each be a 64-character hex sha256 digest.");
  process.exit(1);
}

let contents = fs.readFileSync(caskPath, "utf8");

const versionRegex = /version\s+"[^"]*"/;
if (!versionRegex.test(contents)) {
  console.error(`Could not find a version "..." line in ${caskPath}`);
  process.exit(1);
}
contents = contents.replace(versionRegex, `version "${version}"`);

// Matches the two-line "sha256 arm: \"...\",\n       intel: \"...\"" block,
// preserving whatever indentation already precedes `intel:` so re-running
// this script doesn't slowly drift the file's formatting.
const sha256Regex = /sha256\s+arm:\s*"[a-f0-9]+",\s*\n(\s*)intel:\s*"[a-f0-9]+"/i;
if (!sha256Regex.test(contents)) {
  console.error(`Could not find the sha256 arm: ..., intel: ... block in ${caskPath}`);
  process.exit(1);
}
contents = contents.replace(
  sha256Regex,
  (_match, intelIndent) => `sha256 arm:   "${armSha256}",\n${intelIndent}intel: "${intelSha256}"`
);

fs.writeFileSync(caskPath, contents);
console.log(`Updated ${caskPath} -> version ${version}, arm ${armSha256.slice(0, 8)}…, intel ${intelSha256.slice(0, 8)}…`);
