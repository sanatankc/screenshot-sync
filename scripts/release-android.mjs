#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const mobilePackagePath = path.join(repoRoot, "mobile/package.json");
const mobileAppConfigPath = path.join(repoRoot, "mobile/app.json");

function usage() {
  console.error("Usage: pnpm release:android <patch|minor|major|x.y.z[-prerelease]>");
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(current, bump) {
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(bump)) {
    return bump;
  }

  const parsed = parseSemver(current);

  switch (bump) {
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "major":
      return `${parsed.major + 1}.0.0`;
    default:
      throw new Error(`Unsupported bump: ${bump}`);
  }
}

function ensureCleanGit() {
  const output = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  if (output) {
    console.error("Git working tree must be clean before running release:android.");
    console.error(output);
    process.exit(1);
  }
}

function git(args) {
  execFileSync("git", args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

const bump = process.argv[2];
if (!bump) usage();

ensureCleanGit();

const mobilePackage = readJson(mobilePackagePath);
const mobileAppConfig = readJson(mobileAppConfigPath);
const currentVersion = mobileAppConfig.expo?.version ?? mobilePackage.version;
const nextVersion = bumpVersion(currentVersion, bump);
const tagName = `captr-android-v${nextVersion}`;

mobilePackage.version = nextVersion;
mobileAppConfig.expo.version = nextVersion;

writeJson(mobilePackagePath, mobilePackage);
writeJson(mobileAppConfigPath, mobileAppConfig);

git(["add", "mobile/package.json", "mobile/app.json"]);
git(["commit", "-m", `release(android): Captr v${nextVersion}`]);
git(["tag", tagName]);

console.log("");
console.log(`Created Android release commit and tag for Captr v${nextVersion}.`);
console.log(`Next steps:`);
console.log(`  git push`);
console.log(`  git push origin ${tagName}`);
console.log("");
console.log(`Pushing tag ${tagName} will trigger the GitHub Release workflow.`);
