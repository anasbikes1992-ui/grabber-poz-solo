#!/usr/bin/env node

/**
 * Copy approved agent skills into the local Gemini CLI skills directory.
 *
 * SECURITY: By default this script is a no-op dry-run listing.
 * Requires --confirm to write. Never follow symlinks. Only copies folders
 * that contain SKILL.md. Prefer home-dir sources over repo paths unless
 * --include-repo is passed.
 *
 * Usage:
 *   node scripts/copy-skills.mjs              # list only
 *   node scripts/copy-skills.mjs --confirm    # copy home-dir skill sources
 *   node scripts/copy-skills.mjs --confirm --include-repo
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const includeRepo = args.includes('--include-repo');

const homeDir = os.homedir();
const targetDir = path.join(homeDir, '.gemini', 'antigravity-cli', 'skills');

const homeSources = [
  path.join(homeDir, '.gemini', 'config', 'skills'),
  path.join(homeDir, '.gemini', 'antigravity-ide', 'builtin', 'skills'),
  path.join(homeDir, '.claude', 'skills'),
];

const repoSources = [
  path.join(process.cwd(), '.claude', 'skills'),
  path.join(process.cwd(), '.agents', 'skills'),
];

const candidateSources = includeRepo ? [...homeSources, ...repoSources] : homeSources;

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function copyFolderRecursiveSync(source, target, rootSource) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const curSource = path.join(source, entry.name);
    const curTarget = path.join(target, entry.name);

    let realSource;
    try {
      realSource = fs.realpathSync(curSource);
    } catch {
      console.warn(`  skip (unreadable): ${curSource}`);
      continue;
    }

    if (!isInside(realSource, rootSource)) {
      console.warn(`  skip (escapes source root / symlink): ${curSource}`);
      continue;
    }

    const st = fs.lstatSync(curSource);
    if (st.isSymbolicLink()) {
      console.warn(`  skip (symlink): ${curSource}`);
      continue;
    }
    if (st.isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget, rootSource);
    } else if (st.isFile()) {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

const discovered = [];

for (const src of candidateSources) {
  if (!fs.existsSync(src)) continue;
  console.log(`Found skill source: ${src}`);
  const rootReal = fs.realpathSync(src);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.isSymbolicLink?.()) continue;
    const skillFolderPath = path.join(src, entry.name);
    const hasSkillMd =
      fs.existsSync(path.join(skillFolderPath, 'SKILL.md')) ||
      fs.existsSync(path.join(skillFolderPath, 'skill.md'));
    if (!hasSkillMd) continue;
    discovered.push({ name: entry.name, from: skillFolderPath, root: rootReal });
  }
}

console.log(`\n======================================================`);
console.log(`Skills discovered: ${discovered.length}`);
if (!confirm) {
  console.log(`Mode: DRY RUN (no files written)`);
  console.log(`To install: node scripts/copy-skills.mjs --confirm`);
  console.log(`Repo paths: add --include-repo (review SKILL.md content first)`);
  console.log(`Target would be: ${targetDir}`);
  console.log(`======================================================`);
  discovered.slice(0, 30).forEach((s, i) => console.log(`  ${i + 1}. ${s.name}  ← ${s.from}`));
  if (discovered.length > 30) console.log(`  ... +${discovered.length - 30} more`);
  process.exit(0);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const copied = new Set();
for (const skill of discovered) {
  const destPath = path.join(targetDir, skill.name);
  copyFolderRecursiveSync(skill.from, destPath, skill.root);
  copied.add(skill.name);
  console.log(`  installed: ${skill.name}`);
}

console.log(`\n======================================================`);
console.log(`Copied skills to: ${targetDir}`);
console.log(`Unique skills installed: ${copied.size}`);
console.log(`======================================================`);
