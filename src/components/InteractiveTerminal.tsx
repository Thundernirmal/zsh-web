import { useEffect, useRef, useState } from 'react';

export type TerminalCommand = {
	name: string;
	description?: string;
	usage?: string;
	type: 'alias' | 'global_alias' | 'function';
	category?: string;
	examples?: string[];
};

export type TerminalTip = { text: string; category: string };

interface Props {
	commands: TerminalCommand[];
	tips: TerminalTip[];
	featuredTip: string;
	upkgExample: string;
	npkgExample: string;
}

const ansi = {
	reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
	blue: '\x1b[38;2;137;180;250m', green: '\x1b[38;2;166;227;161m',
	mauve: '\x1b[38;2;203;166;247m', peach: '\x1b[38;2;250;179;135m',
	red: '\x1b[38;2;243;139;168m', muted: '\x1b[38;2;166;173;200m',
};

const clean = (value: string) => value.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');

export default function InteractiveTerminal({ commands, tips, featuredTip, upkgExample, npkgExample }: Props) {
	const terminalElement = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const host = terminalElement.current;
		if (!host) return;
		let disposed = false;
		let disposeTerminal: (() => void) | undefined;

		void (async () => {
			try {
				const { FitAddon, Terminal, init } = await import('ghostty-web');
				await init();
				if (disposed) return;

				const terminal = new Terminal({
					cols: 80, rows: 14,
					cursorBlink: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
					cursorStyle: 'block',
					fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
					fontSize: window.matchMedia('(max-width: 639px)').matches ? 12 : 14,
					scrollback: 500,
					theme: {
						background: '#14141f', foreground: '#cdd6f4', cursor: '#f2cdcd', cursorAccent: '#14141f',
						selectionBackground: '#45475a', selectionForeground: '#cdd6f4', black: '#45475a', red: '#f38ba8',
						green: '#a6e3a1', yellow: '#f9e2af', blue: '#89b4fa', magenta: '#cba6f7', cyan: '#94e2d5',
						white: '#bac2de', brightBlack: '#6c7086', brightRed: '#f38ba8', brightGreen: '#a6e3a1',
						brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7', brightCyan: '#89dceb', brightWhite: '#cdd6f4',
					},
				});
				const fit = new FitAddon();
				terminal.loadAddon(fit);
				terminal.open(host);
				fit.fit();
				fit.observeResize();
				if (terminal.textarea) {
					terminal.textarea.setAttribute('aria-label', 'Interactive shell demo input');
					terminal.textarea.setAttribute('autocapitalize', 'off');
					terminal.textarea.setAttribute('autocomplete', 'off');
					terminal.textarea.setAttribute('spellcheck', 'false');
				}

				const prompt = () => terminal.write(`${ansi.blue}nirmal@Tiger${ansi.reset}  ${ansi.mauve}~${ansi.reset}  ${ansi.muted}❯${ansi.reset} `);
				const line = (value = '') => terminal.write(`${value}\r\n`);
				const describe = (name: string) => {
					const entry = commands.find((item) => item.name.toLowerCase() === name.toLowerCase());
					if (!entry) return line(`${ansi.red}describe:${ansi.reset} no documented command named ${clean(name)}`);
					line(`${ansi.bold}${ansi.green}${clean(entry.name)}${ansi.reset}  ${ansi.dim}${entry.type.replace('_', ' ')}${ansi.reset}`);
					if (entry.description) line(`  ${clean(entry.description)}`);
					if (entry.usage) line(`  ${ansi.peach}usage:${ansi.reset} ${clean(entry.usage)}`);
					for (const example of entry.examples?.slice(0, 3) ?? []) line(`  ${ansi.muted}$ ${clean(example)}${ansi.reset}`);
				};
				const showCommands = (query: string) => {
					const needle = query.toLowerCase();
					const matches = commands.filter((item) => `${item.name} ${item.description ?? ''} ${item.category ?? ''}`.toLowerCase().includes(needle));
					if (!matches.length) return line(`${ansi.muted}No documented commands match “${clean(query)}”.${ansi.reset}`);
					for (const item of matches.slice(0, 9)) line(`${ansi.green}${clean(item.name).padEnd(16)}${ansi.reset}${ansi.muted}${clean(item.description ?? item.type).slice(0, 58)}${ansi.reset}`);
					if (matches.length > 9) line(`${ansi.dim}…and ${matches.length - 9} more. Refine the query or browse /commands.${ansi.reset}`);
				};
				const run = (value: string) => {
					const [command = '', ...args] = value.trim().split(/\s+/);
					const argument = args.join(' ');
					switch (command.toLowerCase()) {
						case '': break;
						case 'help':
							line(`${ansi.bold}Available demo commands${ansi.reset}`);
							line(`${ansi.green}tips${ansi.reset} [category]       show a shell tip`);
							line(`${ansi.green}commands${ansi.reset} [query]     search ${commands.length} documented commands`);
							line(`${ansi.green}describe${ansi.reset} <name>      inspect one command`);
							line(`${ansi.green}upkg search${ansi.reset} <query> run the package-search demo`);
							line(`${ansi.green}npkg find${ansi.reset} <query>   run the package-picker demo`);
							line(`${ansi.green}about  clear  pwd  whoami${ansi.reset}`);
							break;
						case 'tips': {
							const matches = argument ? tips.filter((tip) => tip.category.toLowerCase().includes(argument.toLowerCase())) : tips;
							const tip = matches[Math.floor(Math.random() * matches.length)];
							line(tip ? `${ansi.mauve}tip:${ansi.reset} ${clean(tip.text)} ${ansi.dim}[${clean(tip.category)}]${ansi.reset}` : `${ansi.muted}No tips match that category.${ansi.reset}`);
							break;
						}
						case 'commands': showCommands(argument); break;
						case 'describe':
							if (argument) describe(argument);
							else line(`${ansi.muted}usage: describe <command>${ansi.reset}`);
							break;
						case 'upkg':
							if (args[0] === 'search') {
								line(`${ansi.dim}manager   package    summary${ansi.reset}`);
								line(`${ansi.peach}dnf${ansi.reset}       ${ansi.green}${clean(args.slice(1).join(' ') || 'ripgrep')}${ansi.reset}    Search package names across detected managers`);
							} else line(`${ansi.muted}Try: ${upkgExample}${ansi.reset}`);
							break;
						case 'npkg':
							if (args[0] === 'find') line(`${ansi.green}Interactive picker ready${ansi.reset} ${ansi.muted}with preview metadata for ${clean(args.slice(1).join(' ') || 'nvim')}${ansi.reset}`);
							else line(`${ansi.muted}Try: ${npkgExample}${ansi.reset}`);
							break;
						case 'about': line(`A browser-only shell demo rendered by ${ansi.mauve}Ghostty WASM${ansi.reset}. No commands leave this page.`); break;
						case 'pwd': line('/home/nirmal'); break;
						case 'whoami': line('nirmal'); break;
						case 'clear': terminal.clear(); break;
						default: line(`${ansi.red}zsh: command not found:${ansi.reset} ${clean(command)}  ${ansi.dim}(try “help”)${ansi.reset}`);
					}
				};

				let input = '';
				let historyIndex = 0;
				const history: string[] = [];
				const replaceInput = (next: string) => {
					if (input.length) terminal.write(`\b \b`.repeat(input.length));
					input = next;
					terminal.write(input);
				};
				const subscription = terminal.onData((data) => {
					if (data === '\r' || data === '\n') {
						line();
						if (input.trim()) history.push(input);
						historyIndex = history.length;
						run(input);
						input = '';
						prompt();
					} else if (data === '\x7f' || data === '\b') {
						if (input.length) { input = input.slice(0, -1); terminal.write('\b \b'); }
					} else if (data === '\x03') {
						line('^C'); input = ''; prompt();
					} else if (data === '\x0c') {
						terminal.clear(); input = ''; prompt();
					} else if (data === '\x1b[A' && history.length) {
						historyIndex = Math.max(0, historyIndex - 1); replaceInput(history[historyIndex] ?? '');
					} else if (data === '\x1b[B') {
						historyIndex = Math.min(history.length, historyIndex + 1); replaceInput(history[historyIndex] ?? '');
					} else if (data === '\t') {
						const match = ['help', 'tips', 'commands', 'describe', 'upkg', 'npkg', 'about', 'clear', 'pwd', 'whoami'].find((candidate) => candidate.startsWith(input));
						if (match) replaceInput(`${match} `);
					} else if (!data.startsWith('\x1b')) {
						const printable = clean(data.replace(/[\r\n]/g, '')); input += printable; terminal.write(printable);
					}
				});

				line(`${ansi.bold}${ansi.mauve}Nirmal's Shell${ansi.reset}  ${ansi.dim}interactive Ghostty WASM demo${ansi.reset}`);
				line(`${ansi.mauve}tip:${ansi.reset} ${clean(featuredTip)}`);
				line(`${ansi.dim}Type “help” for commands. Everything runs locally in your browser.${ansi.reset}`);
				line(); prompt(); terminal.blur(); host.blur(); setReady(true);
				disposeTerminal = () => { subscription.dispose(); fit.dispose(); terminal.dispose(); };
			} catch (error) {
				console.error('Could not initialize the Ghostty terminal', error);
				if (!disposed) setFailed(true);
			}
		})();

		return () => { disposed = true; disposeTerminal?.(); };
	}, [commands, featuredTip, npkgExample, tips, upkgExample]);

	return (
		<div className="relative">
			<div ref={terminalElement} className="h-56 cursor-text caret-transparent overflow-hidden p-3 sm:h-80 sm:p-5" data-terminal-ready={ready ? 'true' : 'false'} />
			{!ready && (
				<pre className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap p-4 text-sm leading-6 sm:p-6" aria-hidden={failed}>
					<code><span className="block"><span className="text-category-navigation">nirmal@Tiger</span>  <span className="text-category-nix">~</span>  <span className="text-muted-foreground">❯</span> tips</span><span className="block"><span className="text-primary">tip:</span> <span className="text-muted-foreground">{featuredTip}</span></span><span className="mt-3 block text-muted-foreground">{failed ? 'Interactive terminal unavailable. The command library is still available below.' : 'Loading Ghostty WASM…'}</span></code>
				</pre>
			)}
			<span className="sr-only" role="status" aria-live="polite">{failed ? 'Interactive terminal could not be loaded.' : ready ? 'Interactive terminal ready. Type help for available commands.' : 'Loading interactive terminal.'}</span>
		</div>
	);
}
