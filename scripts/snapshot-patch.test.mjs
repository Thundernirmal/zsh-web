import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workflow = fs.readFileSync(new URL('../.github/workflows/update-shell.yml', import.meta.url), 'utf8');
const exportRun = workflow.match(/- name: Export a reviewable snapshot patch\n {8}run: \|\n([\s\S]*?)(?= {6}- name:)/)?.[1]
  .split('\n').map((line) => line.replace(/^ {10}/, '')).join('\n');

test('snapshot artifact applies changed, new, and deleted guide pages alongside data', () => {
  assert.ok(exportRun, 'workflow must expose its snapshot export commands');
  assert.ok(workflow.includes('path: ${{ runner.temp }}/shell-snapshot.patch'));
  const parent = new URL('../.playwright-mcp/', import.meta.url);
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent.pathname, 'snapshot-patch-check-'));
  const git = (...args) => execFileSync('git', args, { cwd: fixture, encoding: 'utf8' });
  const write = (file, content) => {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  try {
    git('init', '--quiet');
    git('config', 'user.email', 'snapshot-test@example.invalid');
    git('config', 'user.name', 'Snapshot regression test');
    write('src/data/source.json', '{"commit":"before"}\n');
    write('src/content/docs/docs/index.md', '# Old overview\n');
    write('src/content/docs/docs/obsolete.md', '# Removed topic\n');
    write('README.md', 'Unrelated baseline\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'Fixture baseline');
    write('src/data/source.json', '{"commit":"after"}\n');
    write('src/content/docs/docs/index.md', '# Updated overview\n');
    write('src/content/docs/docs/new-topic.md', '# New topic\n');
    fs.unlinkSync(path.join(fixture, 'src/content/docs/docs/obsolete.md'));
    write('README.md', 'Unrelated change\n');
    execFileSync('bash', ['-e', '-c', exportRun], { cwd: fixture, env: { ...process.env, RUNNER_TEMP: fixture } });
    const patch = path.join(fixture, 'shell-snapshot.patch');
    assert.ok(!fs.readFileSync(patch, 'utf8').includes('diff --git a/README.md'));
    // Restore the receiving checkout, then apply exactly the artifact that CI exports.
    git('reset', '--hard', '--quiet', 'HEAD');
    git('apply', '--check', patch);
    git('apply', patch);
    assert.equal(fs.readFileSync(path.join(fixture, 'src/data/source.json'), 'utf8'), '{"commit":"after"}\n');
    assert.equal(fs.readFileSync(path.join(fixture, 'src/content/docs/docs/index.md'), 'utf8'), '# Updated overview\n');
    assert.equal(fs.readFileSync(path.join(fixture, 'src/content/docs/docs/new-topic.md'), 'utf8'), '# New topic\n');
    assert.ok(!fs.existsSync(path.join(fixture, 'src/content/docs/docs/obsolete.md')));
    assert.equal(fs.readFileSync(path.join(fixture, 'README.md'), 'utf8'), 'Unrelated baseline\n');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
