'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

export type ScreenDirection = 'forward' | 'backward' | 'neutral';

export function ScreenTransition({
  transitionKey,
  direction = 'forward',
  pace = 'step',
  className,
  children,
}: {
  transitionKey: string;
  direction?: ScreenDirection;
  pace?: 'step' | 'result';
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion || direction === 'neutral' ? 0 : direction === 'forward' ? 12 : -12;
  const duration = reduceMotion ? 0.06 : pace === 'result' ? 0.38 : 0.24;

  return (
    <AnimatePresence mode="wait" initial={false} custom={offset}>
      <motion.div
        key={transitionKey}
        className={className}
        data-transition-direction={direction}
        data-transition-pace={pace}
        custom={offset}
        initial={{ opacity: 0, x: offset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -offset }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
