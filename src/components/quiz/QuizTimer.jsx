import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuizTimer({ durationInMinutes, onTimeUp, isActive = true }) {
  const totalSeconds = durationInMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const percentageLeft = (secondsLeft / totalSeconds) * 100;

  // Determine urgency level
  const isUrgent = percentageLeft <= 20;
  const isWarning = percentageLeft <= 50 && percentageLeft > 20;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300",
        isUrgent && "bg-red-50 border-red-300 shadow-lg shadow-red-100",
        isWarning && "bg-amber-50 border-amber-300",
        !isUrgent && !isWarning && "bg-indigo-50 border-indigo-200"
      )}
    >
      <div className="relative">
        <motion.div
          animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {isUrgent ? (
            <AlertCircle className="w-6 h-6 text-red-600" />
          ) : (
            <Clock className={cn(
              "w-6 h-6",
              isWarning ? "text-amber-600" : "text-indigo-600"
            )} />
          )}
        </motion.div>
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <motion.span
            key={minutes}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "text-2xl font-bold tabular-nums",
              isUrgent && "text-red-700",
              isWarning && "text-amber-700",
              !isUrgent && !isWarning && "text-indigo-700"
            )}
          >
            {String(minutes).padStart(2, '0')}
          </motion.span>
          <span className={cn(
            "text-2xl font-bold",
            isUrgent && "text-red-700",
            isWarning && "text-amber-700",
            !isUrgent && !isWarning && "text-indigo-700"
          )}>:</span>
          <motion.span
            key={seconds}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "text-2xl font-bold tabular-nums",
              isUrgent && "text-red-700",
              isWarning && "text-amber-700",
              !isUrgent && !isWarning && "text-indigo-700"
            )}
          >
            {String(seconds).padStart(2, '0')}
          </motion.span>
        </div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">
          Time Remaining
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            isUrgent && "bg-red-500",
            isWarning && "bg-amber-500",
            !isUrgent && !isWarning && "bg-indigo-500"
          )}
          initial={{ width: '100%' }}
          animate={{ width: `${percentageLeft}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Pulsing indicator when urgent */}
      <AnimatePresence>
        {isUrgent && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-1 -right-1 w-3 h-3"
          >
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}