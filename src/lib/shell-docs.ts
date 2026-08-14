type CommandType = 'alias' | 'global_alias' | 'function';

export interface ShellCommand {
  name: string;
  command?: string;
  usage?: string;
  description?: string;
  type: CommandType;
  category?: string;
  source?: string;
  availability?: string;
  dependencies?: string;
  examples?: string[];
  features?: string[];
  notes?: string[];
  requires?: string[];
  optional?: string[];
  interactive?: boolean;
  plainMode?: boolean;
  richOutput?: boolean;
}

export interface ShellTip {
  text: string;
  category: string;
  source?: string;
  availability?: string;
}

export function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
