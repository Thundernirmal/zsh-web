import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('extractor validates and restores the pinned guide outputs and removes obsolete pages', (t) => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const source = process.env.ZSH_CONFIG_DIR ?? (fs.existsSync(path.join(repo, '.zsh-config')) ? path.join(repo, '.zsh-config') : path.join(os.homedir(), '.config/zsh'));
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'src/data/source.json'), 'utf8'));
  if (!fs.existsSync(source) || spawnSync('git', ['-C', source, 'cat-file', '-e', `${manifest.commit}^{commit}`]).status !== 0) {
    t.skip('Pinned Zsh source checkout is unavailable; sync:check still requires it.');
    return;
  }
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-extract-'));
  try {
    const shell = path.join(fixture, 'shell');
    execFileSync('git', ['clone', '--quiet', '--shared', source, shell]);
    execFileSync('git', ['-C', shell, 'checkout', '--quiet', '--detach', manifest.commit]);
    const project = path.join(fixture, 'project');
    for (const dir of ['scripts', 'src/lib/guide-topics.mjs', 'src/data', 'src/content/docs/docs']) fs.cpSync(path.join(repo, dir), path.join(project, dir), { recursive: true });
    fs.writeFileSync(path.join(project, 'package.json'), '{"type":"module"}');
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'), 'dir');
    const run = (...args) => spawnSync(process.execPath, ['scripts/extract.mjs', ...args], { cwd: project, encoding: 'utf8', env: { ...process.env, ZSH_CONFIG_DIR: shell } });
    assert.equal(run('--check').status, 0);
    const outside = path.join(fixture, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'keep.md'), 'keep');
    const linked = path.join(project, 'src/content/docs/docs/linked');
    fs.symlinkSync(outside, linked);
    for (const args of [[], ['--check']]) {
      const result = run(...args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /must not contain symbolic links/);
      assert.equal(fs.readFileSync(path.join(outside, 'keep.md'), 'utf8'), 'keep');
    }
    fs.unlinkSync(linked);
    const missing = ['src/data/docs-links.json', 'src/data/docs-search.json', 'src/content/docs/docs/nix.md'];
    for (const file of missing) fs.unlinkSync(path.join(project, file));
    const obsolete = 'src/content/docs/docs/notes/obsolete.md';
    fs.mkdirSync(path.dirname(path.join(project, obsolete)), { recursive: true });
    fs.writeFileSync(path.join(project, obsolete), '# Obsolete');
    const check = run('--check');
    assert.equal(check.status, 1);
    for (const file of [...missing, obsolete]) assert.ok(check.stderr.includes(file), check.stderr);
    const sync = run();
    assert.equal(sync.status, 0, sync.stderr);
    assert.ok(!fs.existsSync(path.join(project, obsolete)));
    for (const file of missing) assert.equal(fs.readFileSync(path.join(project, file), 'utf8'), fs.readFileSync(path.join(repo, file), 'utf8'));
    assert.equal(run('--check').status, 0);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
