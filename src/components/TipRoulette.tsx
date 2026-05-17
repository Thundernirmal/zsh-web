import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import tipsData from '../data/tips.json';

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
    <div className="roulette">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcedTip}
      </div>

      <div className="roulette-display">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTip?.text ?? 'Discover shell wisdom — click below!'}
            className="roulette-text"
            {...motionProps}
          >
            {currentTip?.text ?? 'Discover shell wisdom — click below!'}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="roulette-meta">
        {currentTip ? (
          <>
            <span className="badge badge-category" data-category={currentTip.category}>
              {formatLabel(currentTip.category)}
            </span>
            {currentTip.source && (
              <span className="badge badge-subtle">{formatLabel(currentTip.source)}</span>
            )}
            {currentTip.availability && (
              <span className="roulette-meta-text">{currentTip.availability}</span>
            )}
          </>
        ) : (
          <>
            <span className="badge badge-category roulette-placeholder" aria-hidden="true">category</span>
            <span className="badge badge-subtle roulette-placeholder" aria-hidden="true">source</span>
          </>
        )}
      </div>

      <button
        className="btn roulette-button"
        type="button"
        onClick={spin}
      >
        {isSpinning ? 'Show Tip Now' : 'Show Random Tip'}
      </button>
    </div>
  );
}
