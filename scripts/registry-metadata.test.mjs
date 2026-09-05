import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registryMetadata } from './registry-metadata.mjs';

const defaults = '_ZSH_COMMAND_MUTATION[$_zsh_registry_id]=read';
test('registry metadata preserves action/session distinctions and canonical parents', () => {
  const records = registryMetadata(`${defaults}\n  plan) _ZSH_COMMAND_CANONICAL[$_zsh_registry_id]=upkg ;;\n  upkg) _ZSH_COMMAND_MUTATION[$_zsh_registry_id]=mixed ;;\n  cd|theme) _ZSH_COMMAND_MUTATION[$_zsh_registry_id]=session ;;`, ['upkg', 'plan', 'cd', 'theme']);
  assert.deepEqual(records.get('plan'), { canonical: 'upkg', mutation: 'read' });
  assert.equal(records.get('upkg').mutation, 'mixed');
  assert.equal(records.get('cd').mutation, 'session');
});
test('registry metadata rejects unknown defaults, commands and categories', () => {
  assert.throws(() => registryMetadata('', ['upkg']), /default/);
  assert.throws(() => registryMetadata(`${defaults}\n  ghost) _ZSH_COMMAND_MUTATION[$_zsh_registry_id]=write ;;`, ['upkg']), /unknown command/);
  assert.throws(() => registryMetadata(`${defaults}\n  upkg) _ZSH_COMMAND_MUTATION[$_zsh_registry_id]=safe ;;`, ['upkg']), /Unknown mutation/);
});
