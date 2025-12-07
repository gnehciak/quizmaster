import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function QuizProgress({ current, total, answers }) {
  const progress = ((current + 1) / total) * 100;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">
          Question {current + 1} of {total}
        </span>
        <span className="text-slate-500">
          {Math.round(progress)}% complete
        </span>
      </div>
      
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
        />
      </div>
      
      {/* Question dots */}
      <div className="flex gap-1.5 justify-center pt-2">
        {Array.from({ length: total }).map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx === current && "w-6 bg-indigo-500",
              idx < current && answers[idx] !== undefined && "bg-indigo-400",
              idx < current && answers[idx] === undefined && "bg-slate-300",
              idx > current && "bg-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}