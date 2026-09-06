import { Fragment } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { highlightText } from '@/components/HighlightText';
import { SyntaxCode } from '@/components/SyntaxCode';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { buildFeatureDetails, commandId, splitExample, type FeatureDetail } from '@/lib/command-search';
import { commandHref, formatLabel, type ShellCommand } from '@/lib/shell-docs';
import source from '@/data/source.json';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function Example({ example, query }: { example: string; query: string }) {
  const { command, annotation } = splitExample(example);
  return (
    <div className="group/example grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <pre className="detail-code flex-1" data-detail-code>
          <SyntaxCode code={command} query={query} />
        </pre>
        <CopyButton
          text={command}
          label="Copy example"
          className="size-7 shrink-0 opacity-70 group-hover/example:opacity-100 transition-opacity"
        />
      </div>
      {annotation && (
        <span
          className="text-pretty text-base leading-6 text-muted-foreground md:text-sm md:leading-5"
          data-detail-body
        >
          {highlightText(annotation, query)}
        </span>
      )}
    </div>
  );
}

function FeatureTable({
  id,
  commandName,
  features,
  query,
}: {
  id: string;
  commandName: string;
  features: FeatureDetail[];
  query: string;
}) {
  if (features.length === 0) return null;
  const hasFeatureExamples = features.some((feature) => feature.examples.length > 0);

  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-features`} data-feature-table>
      <div
        className="grid min-w-0 gap-0.5 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-3"
        data-feature-introduction
      >
        <h3 id={`${id}-features`} className="detail-section-heading" data-detail-section-heading>
          {hasFeatureExamples ? 'Features & Examples' : 'Features'}
        </h3>
        {hasFeatureExamples && (
          <p className="detail-body text-muted-foreground" data-detail-body>
            Examples appear only where they add useful detail.
          </p>
        )}
      </div>
      <dl className="grid md:hidden">
        {features.map((feature, index) => (
          <div
            key={`${feature.usage}:${feature.description}`}
            className="grid min-w-0 gap-1.5 pt-3 first:pt-0"
            data-feature-row
          >
            {feature.usage ? (
              <dt>
                <pre className="detail-code font-semibold" data-detail-code>
                  <SyntaxCode code={feature.usage} query={query} />
                </pre>
              </dt>
            ) : (
              <dt className="detail-label">General Feature</dt>
            )}
            <dd className="grid min-w-0 gap-2.5">
              <p className="detail-body" data-detail-body>
                {highlightText(feature.description, query)}
                    {feature.aliases?.length ? <span className="block text-sm text-muted-foreground">Also known as: {feature.aliases.join(', ')}</span> : null}
              </p>
              {feature.examples.length > 0 && (
                <div className="grid min-w-0 gap-1.5">
                  <span className="detail-label" data-detail-label>
                    Example
                  </span>
                  <div className="grid min-w-0 gap-2">
                    {feature.examples.map((example) => (
                      <Example key={example} example={example} query={query} />
                    ))}
                  </div>
                </div>
              )}
            </dd>
            {index < features.length - 1 && <dd><Separator className="mt-1" /></dd>}
          </div>
        ))}
      </dl>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableCaption className="sr-only">
            Features and descriptions{hasFeatureExamples ? ', with matching examples' : ''} for{' '}
            {commandName}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-1/4">
                Usage
              </TableHead>
              <TableHead scope="col">Description</TableHead>
              {hasFeatureExamples && <TableHead scope="col" className="w-1/3">Example</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={`${feature.usage}:${feature.description}`}>
                <TableHead scope="row" className="h-auto align-top whitespace-normal py-2">
                  {feature.usage ? (
                    <pre className="detail-code font-semibold">
                      <SyntaxCode code={feature.usage} query={query} />
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableHead>
                <TableCell className="align-top whitespace-normal text-pretty leading-6">
                  {highlightText(feature.description, query)}
                    {feature.aliases?.length ? <span className="block text-sm text-muted-foreground">Also known as: {feature.aliases.join(', ')}</span> : null}
                </TableCell>
                {hasFeatureExamples && (
                  <TableCell className="align-top whitespace-normal">
                    {feature.examples.length > 0 ? (
                      <div className="grid min-w-0 gap-2">
                        {feature.examples.map((example) => (
                          <Example key={example} example={example} query={query} />
                        ))}
                      </div>
                    ) : (
                      <span className="sr-only">No example documented</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ExampleList({
  id,
  examples,
  query,
  additional,
}: {
  id: string;
  examples: string[];
  query: string;
  additional: boolean;
}) {
  if (examples.length === 0) return null;
  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-examples`}>
      <div className="grid gap-0.5">
        <h3 id={`${id}-examples`} className="detail-section-heading" data-detail-section-heading>
          {additional ? 'Additional Examples' : 'Examples'}
        </h3>
        {additional && (
          <p className="detail-body text-muted-foreground" data-detail-body>
            General workflows that are not tied to one feature.
          </p>
        )}
      </div>
      <ul className="grid">
        {examples.map((example, index) => (
          <li key={example} className="grid min-w-0 gap-2 pt-2.5 first:pt-0">
            <Example example={example} query={query} />
            {index < examples.length - 1 && <Separator />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotesList({ id, notes, query }: { id: string; notes: string[]; query: string }) {
  if (notes.length === 0) return null;
  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-notes`}>
      <h3 id={`${id}-notes`} className="detail-section-heading" data-detail-section-heading>
        Notes
      </h3>
      <ul className="grid">
        {notes.map((note, index) => (
          <li key={note} className="detail-body grid gap-2 pt-2.5 first:pt-0" data-detail-body>
            <span className="min-w-0">{highlightText(note, query)}</span>
            {index < notes.length - 1 && <Separator />}
          </li>
        ))}
      </ul>
    </section>
  );
}


export default function CommandDetails({ command, query = "" }: { command: ShellCommand; query?: string }) {
            const detailId = commandId(command).replace(/[^A-Za-z0-9_-]/g, '-');
            const { features, unmatchedExamples } = buildFeatureDetails(command);
            const hasFeatures = features.length > 0;
            const displayExamples = unmatchedExamples;
            const notes = command.notes ?? [];
            const hasReferenceDetails = hasFeatures || displayExamples.length > 0 || notes.length > 0;
            // Function syntax is a placeholder template, not a runnable command:
            // the prominent copy action must hand over a concrete example
            // instead, and only fall back to an explicitly labeled template copy.
            const firstRunnableExample = command.examples?.length
              ? splitExample(command.examples[0]).command
              : undefined;
            const syntaxDetails: Array<{
              label: string;
              value: string;
              copyText: string;
              copyLabel: string;
            }> = [];
            if (command.command) {
              if ((command.type === 'function' || command.type === 'action')) {
                syntaxDetails.push({
                  label: 'Syntax',
                  value: command.command,
                  copyText: firstRunnableExample ?? command.command,
                  copyLabel: firstRunnableExample
                    ? `Copy example: ${firstRunnableExample}`
                    : 'Copy syntax template',
                });
              } else {
                syntaxDetails.push({
                  label: 'Expands To',
                  value: command.command,
                  copyText: command.command,
                  copyLabel: 'Copy expansion',
                });
              }
            }
            if (command.usage && command.usage !== command.command) {
              syntaxDetails.push({
                label: 'Usage',
                value: command.usage,
                copyText: command.usage,
                copyLabel: 'Copy usage',
              });
            }

 const caution = command.mutation === 'write'
   ? 'Changes files, packages, Git history or running processes. Review the arguments before running.'
   : command.mutation === 'mixed'
   ? 'Some subcommands change stored data or packages. Check the selected operation before running.'
   : command.mutation === 'session' ? 'Changes the current shell session or working directory.' : undefined;
 return <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      {firstRunnableExample && <section className="grid min-w-0 gap-2" aria-label="Runnable example">
        <h3 className="detail-section-heading" data-detail-section-heading>Try an example</h3>
        <Example example={firstRunnableExample} query={query} />
      </section>}
                  <div className="grid gap-2.5">
                    {syntaxDetails.map((detail, index) => (
                      <Fragment key={detail.label}>
                        {index > 0 && <Separator />}
                        <div className="grid min-w-0 gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="detail-section-heading" data-detail-section-heading>
                              {detail.label}
                            </h3>
                            <CopyButton
                              text={detail.copyText}
                              label={detail.copyLabel}
                              className="size-7 shrink-0"
                            />
                          </div>
                          <pre className="detail-code font-semibold" data-detail-code>
                            <SyntaxCode code={detail.value} query={query} />
                          </pre>
                        </div>
                      </Fragment>
                    ))}
                    {(command.availability || command.dependencies) && (
                      <dl className="grid min-w-0 gap-x-4 gap-y-1.5 text-base leading-7 sm:grid-cols-[7rem_minmax(0,1fr)] sm:text-sm sm:leading-6">
                        {command.availability && (
                          <Fragment>
                            <dt className="font-medium text-muted-foreground">Availability</dt>
                            <dd className="min-w-0 text-pretty text-foreground">
                              {highlightText(command.availability, query)}
                            </dd>
                          </Fragment>
                        )}
                        {command.dependencies && (
                          <Fragment>
                            <dt className="font-medium text-muted-foreground">Dependencies</dt>
                            <dd className="min-w-0 text-pretty text-foreground">
                              {highlightText(command.dependencies, query)}
                            </dd>
                          </Fragment>
                        )}
                      </dl>
                    )}
                  </div>

                  {caution && (
                    <p
                      className="border-l-2 border-primary pl-3 text-sm leading-6 text-muted-foreground"
                      data-command-caution
                    >
                      {caution}
                    </p>
                  )}

                  {(command.interactive ||
                    command.terminalAdaptive ||
                    command.requires?.length ||
                    command.optional?.length) && (
                    <div className="flex flex-wrap gap-1.5">
                      {command.interactive && (
                        <Badge variant="metadata" title="Must run in an interactive shell">
                          Interactive terminal
                        </Badge>
                      )}
                      {command.terminalAdaptive && (
                        <Badge
                          variant="metadata"
                          title="Styled output when the terminal supports it; plain output otherwise"
                        >
                          Adapts to terminal
                        </Badge>
                      )}
                      {command.requires?.map((requirement) => (
                        <Badge key={`${commandId(command)}:requires:${requirement}`} variant="metadata">
                          Requires {formatLabel(requirement)}
                        </Badge>
                      ))}
                      {command.optional?.map((dependency) => (
                        <Badge key={`${commandId(command)}:optional:${dependency}`} variant="metadata">
                          Uses {formatLabel(dependency)} if available
                        </Badge>
                      ))}
                    </div>
                  )}

                  {hasReferenceDetails && (
                    <div className="grid min-w-0 gap-5">
                      {hasFeatures && (
                        <FeatureTable
                          id={detailId}
                          commandName={command.name}
                          features={features}
                          query={query}
                        />
                      )}
                      {hasFeatures && displayExamples.length > 0 && <Separator />}
                      <ExampleList
                        id={detailId}
                        examples={displayExamples}
                        query={query}
                        additional={hasFeatures}
                      />
                      {(hasFeatures || displayExamples.length > 0) && notes.length > 0 && <Separator />}
                      <NotesList id={detailId} notes={notes} query={query} />
                    </div>
                  )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {command.source && <a className="footer-link break-all" href={`${source.repository}/blob/${source.commit}/${command.source}`}>{command.source}</a>}
        <CopyButton text={`https://zsh.nirmalkatariya.com${commandHref(command)}`} icon="link" label={`Copy link to ${command.name}`} />
      </div>
</div>;
}
