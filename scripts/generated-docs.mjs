import fs from 'node:fs';
import path from 'node:path';

// Validate the whole generated tree before sync writes or removes anything.
// Dirent traversal never descends through symbolic links, including file links.
export function generatedDocsFiles(directory) {
  const files = [];
  const walk = (current) => {
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Generated docs must not contain symbolic links: ${current}`);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Generated docs must not contain symbolic links: ${file}`);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.relative(directory, file));
    }
  };
  if (fs.lstatSync(directory, { throwIfNoEntry: false })) walk(directory);
  return files;
}
