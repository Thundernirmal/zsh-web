import { useState, useCallback, type MouseEvent } from 'react';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
          return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    },
    [text],
  );

  const IconComponent = copied ? CheckIcon : icon === 'link' ? LinkIcon : CopyIcon;

  return (
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
      )}
    >
      <IconComponent
        className={cn('size-3.5 transition-transform duration-150', copied && 'scale-110')}
        aria-hidden="true"
      />
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </Button>
  );
}
