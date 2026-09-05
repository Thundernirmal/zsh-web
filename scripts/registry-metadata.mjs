// Parse the registry's deliberately small declarative case arms without
// executing shell startup code. Unknown assignments fail closed on drift.
export function registryMetadata(source, names) {
  const metadata = new Map(names.map((name) => [name, { canonical: name, mutation: 'read' }]));
  if (!source.includes('_ZSH_COMMAND_MUTATION[$_zsh_registry_id]=read')) {
    throw new Error('Command registry mutation default is missing or unsupported');
  }
  for (const line of source.split('\n')) {
    if (!line.includes('_ZSH_COMMAND_') || !line.includes(') _ZSH_COMMAND_')) continue;
    const match = line.trim().match(/^([^\s)]+)\) _ZSH_COMMAND_(CANONICAL|MUTATION)\[\$_zsh_registry_id\]=([a-z][a-z0-9-]*) ;;$/);
    if (!match) throw new Error(`Unsupported command metadata arm: ${line.trim()}`);
    const [, pattern, field, value] = match;
    if (field === 'MUTATION' && !['read', 'write', 'mixed', 'session'].includes(value)) {
      throw new Error(`Unknown mutation category: ${value}`);
    }
    if (field === 'CANONICAL' && !metadata.has(value)) throw new Error(`Unknown canonical command: ${value}`);
    for (const name of pattern.split('|')) {
      const record = metadata.get(name);
      if (!record) throw new Error(`Metadata references unknown command: ${name}`);
      record[field.toLowerCase()] = value;
    }
  }
  return metadata;
}
