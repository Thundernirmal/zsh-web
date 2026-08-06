import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RefreshCwIcon } from 'lucide-react';
import tipsData from '../data/tips.json';
import { CategoryBadge } from '@/components/CategoryBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Tip = {
  text: string;
  category: string;
  source?: string;
  availability?: string;
};

function formatLabel(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function TipRoulette() {
  const tips: Tip[] = tipsData;
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [announcedTip, setAnnouncedTip] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const prefersReduced = useReducedMotion();
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTipRef = useRef<Tip | null>(currentTip);

  const stopSpin = (tip: Tip) => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    setCurrentTip(tip);
    setAnnouncedTip(tip.text);
    setIsSpinning(false);
  };

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  const spin = () => {
    if (tips.length === 0) return;

    const finalTip = tips[Math.floor(Math.random() * tips.length)];
    finalTipRef.current = finalTip;

    if (isSpinning) {
      stopSpin(finalTipRef.current);
      return;
    }

    if (prefersReduced) {
      setCurrentTip(finalTip);
      setAnnouncedTip(finalTip.text);
      return;
    }

    setIsSpinning(true);
    let iterations = 0;
    const maxIterations = 12;

    spinIntervalRef.current = setInterval(() => {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip);
      iterations++;

      if (iterations >= maxIterations) {
        stopSpin(finalTip);
      }
    }, 80);
  };

  const motionProps = prefersReduced
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.18 },
      };

  return (
    <div className="grid min-h-52 content-start gap-3">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcedTip}
      </div>

      <div className="flex min-h-24 items-center border-l-2 border-primary py-2 pl-3">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={currentTip?.text ?? 'Discover shell wisdom — click below!'}
            className="text-pretty text-base leading-7 text-foreground"
            {...motionProps}
          >
            {currentTip?.text ?? 'Discover shell wisdom — click below!'}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex min-h-10 flex-wrap content-center items-center gap-x-1.5 gap-y-1">
        {currentTip ? (
          <>
            <CategoryBadge category={currentTip.category} />
            {currentTip.source && (
              <Badge variant="metadata">{formatLabel(currentTip.source)}</Badge>
            )}
            {currentTip.availability && (
              <span className="basis-full text-pretty text-xs leading-5 text-muted-foreground">
                {currentTip.availability}
              </span>
            )}
          </>
        ) : (
          <>
            <Badge variant="outline" className="opacity-50" aria-hidden="true">Category</Badge>
            <Badge variant="metadata" className="opacity-50" aria-hidden="true">Source</Badge>
          </>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={spin}
        className="w-full sm:w-auto"
      >
        <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
        {isSpinning ? 'Show Tip Now' : 'Show Random Tip'}
      </Button>
    </div>
  );
}
