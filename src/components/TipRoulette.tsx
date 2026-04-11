import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import tipsData from '../data/tips.json';

type Tip = { text: string; category: string };

export default function TipRoulette() {
  const tips: Tip[] = tipsData;
  const [currentTip, setCurrentTip] = useState<string>('Discover shell wisdom — click below!');
  const [isSpinning, setIsSpinning] = useState(false);
  const prefersReduced = useReducedMotion();

  const spin = () => {
    if (isSpinning) return;
    const finalTip = tips[Math.floor(Math.random() * tips.length)];

    if (prefersReduced) {
      // Skip cycling, show final tip immediately
      setCurrentTip(finalTip.text);
      return;
    }

    setIsSpinning(true);
    let iterations = 0;
    const maxIterations = 12;
    const interval = setInterval(() => {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip.text);
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setCurrentTip(finalTip.text);
        setIsSpinning(false);
      }
    }, 80);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          height: '140px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={currentTip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              fontSize: '0.95rem',
              margin: 0,
              color: 'var(--ctp-text)',
              fontWeight: 500,
              lineHeight: 1.5
            }}
            aria-live="polite"
          >
            {currentTip}
          </motion.p>
        </AnimatePresence>
      </div>
      <button
        className="btn"
        onClick={spin}
        disabled={isSpinning}
        style={{ width: '100%' }}
      >
        {isSpinning ? 'Spinning…' : '✨ Show Random Tip'}
      </button>
    </div>
  );
}