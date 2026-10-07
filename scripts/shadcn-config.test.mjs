import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('configured shadcn stylesheet supports heading fonts and actual CLI ejection', () => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'shadcn-css-'));
  try {
    for (const file of ['components.json', 'tsconfig.json', 'src/styles']) fs.cpSync(path.join(repo, file), path.join(fixture, file), { recursive: true });
    const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
    // Exercise the real eject command's CSS work, without an npm uninstall
    // through the read-only fixture dependency link or any network operation.
    delete pkg.devDependencies.shadcn;
    fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify(pkg));
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
    const transform = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { getConfig } from '@shadcn/registry/internal/utils/get-config';
      import { transform } from '@shadcn/registry/internal/utils/transformers/index';
      import { transformFont } from '@shadcn/registry/internal/utils/transformers/transform-font';
      const config = await getConfig(process.cwd());
      const result = await transform({ filename: 'heading.tsx', raw: '<h1 className="cn-font-heading">Heading</h1>', config }, [transformFont]);
      assert.ok(result.includes('font-heading'), result);
      assert.ok(!result.includes('cn-font-heading'), result);
    `], { cwd: fixture, encoding: 'utf8' });
    assert.equal(transform.status, 0, transform.stderr);
    const eject = spawnSync(process.execPath, [path.join(repo, 'node_modules/shadcn/dist/index.js'), 'eject', '-y'], { cwd: fixture, encoding: 'utf8' });
    assert.equal(eject.status, 0, eject.stderr);
    const css = fs.readFileSync(path.join(fixture, JSON.parse(fs.readFileSync(path.join(fixture, 'components.json'), 'utf8')).tailwind.css), 'utf8');
    assert.ok(css.includes('ejected from shadcn@'), eject.stdout);
    assert.ok(!css.includes('@import "shadcn/tailwind.css"'));
    assert.equal((css.match(/:root\s*\{/g) ?? []).length, 1);
    assert.ok(css.includes('--font-heading:'));
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
