import { useState, useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  size?: 'xs' | 'sm' | 'icon' | 'default';
  label?: string;
  icon?: 'copy' | 'link';
}

export function CopyButton({
  text,
  className,
  variant = 'ghost',
  size = 'xs',
  label = 'Copy to clipboard',
  icon = 'copy',
}: CopyButtonProps) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copied = feedback === 'copied';
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef(0);
  useEffect(() => () => {
    clearTimeout(timer.current);
    request.current += 1;
  }, []);

  const handleCopy = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(timer.current);
      const current = ++request.current;
      setFeedback('idle');
      try {
        await navigator.clipboard.writeText(text);
        if (current !== request.current) return;
        setFeedback('copied');
        timer.current = setTimeout(() => setFeedback('idle'), 1600);
      } catch {
        if (current === request.current) setFeedback('failed');
      }
    },
    [text],
  );

  const IconComponent = copied ? CheckIcon : icon === 'link' ? LinkIcon : CopyIcon;

  return (
    <span className="inline-flex max-w-full shrink-0 flex-col items-end gap-1">
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : label}
      title={copied ? 'Copied!' : label}
      className={cn(
        'relative inline-flex items-center justify-center transition-colors',
        copied
          ? 'text-category-search bg-category-search/10 border-category-search/30'
          : 'text-muted-foreground hover:text-foreground',
        className,
        "min-h-11 min-w-11 sm:min-h-0 sm:min-w-0",
      )}
    >
      <IconComponent
        className={cn('size-3.5 transition-transform duration-150', copied && 'scale-110')}
        aria-hidden="true"
      />
    </Button>
    <span role="status" className={feedback === 'failed' ? 'max-w-44 whitespace-normal text-sm text-foreground' : 'sr-only'}>
      {feedback === 'failed' ? 'Could not copy; select the text manually.' : copied ? 'Copied to clipboard' : ''}
    </span>
    </span>
  );
}
