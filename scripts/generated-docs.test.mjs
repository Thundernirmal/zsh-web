import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatedDocsFiles } from './generated-docs.mjs';

test('generated docs scan rejects directory, file and root symlinks without touching their targets', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-links-'));
  try {
    const docs = path.join(fixture, 'docs');
    const outside = path.join(fixture, 'outside');
    fs.mkdirSync(path.join(docs, 'nested'), { recursive: true });
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(docs, 'nested/obsolete.md'), 'obsolete');
    fs.writeFileSync(path.join(outside, 'keep.md'), 'keep');
    assert.deepEqual(generatedDocsFiles(docs), [path.join('nested', 'obsolete.md')]);
    for (const [target, name] of [[outside, 'linked'], [path.join(outside, 'keep.md'), 'index.md'], [path.join(outside, 'absent'), 'dangling']]) {
      const link = path.join(docs, name);
      fs.symlinkSync(target, link);
      assert.throws(() => generatedDocsFiles(docs), /must not contain symbolic links/);
      fs.unlinkSync(link);
      assert.equal(fs.readFileSync(path.join(outside, 'keep.md'), 'utf8'), 'keep');
    }
    const root = path.join(fixture, 'root-link');
    fs.symlinkSync(outside, root);
    assert.throws(() => generatedDocsFiles(root), /must not contain symbolic links/);
    fs.unlinkSync(root);
    fs.symlinkSync(path.join(fixture, 'absent'), root);
    assert.throws(() => generatedDocsFiles(root), /must not contain symbolic links/);
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
