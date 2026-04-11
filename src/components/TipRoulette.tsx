import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import tipsData from '../data/tips.json';

type Tip = { text: string; category: string };

export default function TipRoulette() {
  const tips: Tip[] = tipsData;
  const [currentTip, setCurrentTip] = useState<string>('Discover shell wisdom — click below!');
  const [announcedTip, setAnnouncedTip] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const prefersReduced = useReducedMotion();
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTipRef = useRef(currentTip);

  const stopSpin = (tipText: string) => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    setCurrentTip(tipText);
    setAnnouncedTip(tipText);
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

    const finalTip = tips[Math.floor(Math.random() * tips.length)].text;
    finalTipRef.current = finalTip;

    if (isSpinning) {
      stopSpin(finalTipRef.current);
      return;
    }

    if (prefersReduced) {
      setCurrentTip(finalTip);
      setAnnouncedTip(finalTip);
      return;
    }

    setIsSpinning(true);
    let iterations = 0;
    const maxIterations = 12;

    spinIntervalRef.current = setInterval(() => {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip.text);
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

      <div className="roulette-display" style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTip}
            className="roulette-text"
            {...motionProps}
          >
            {currentTip}
          </motion.p>
        </AnimatePresence>
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
