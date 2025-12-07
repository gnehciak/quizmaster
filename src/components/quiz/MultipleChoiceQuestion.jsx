import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function MultipleChoiceQuestion({ 
  question, 
  selectedAnswer, 
  onAnswer, 
  showResults 
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-medium text-slate-800 leading-relaxed">
        {question.question}
      </h3>
      
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = showResults && option === question.correctAnswer;
          const isWrong = showResults && isSelected && option !== question.correctAnswer;
          
          return (
            <motion.button
              key={idx}
              whileHover={{ scale: showResults ? 1 : 1.01 }}
              whileTap={{ scale: showResults ? 1 : 0.99 }}
              onClick={() => !showResults && onAnswer(option)}
              disabled={showResults}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-all duration-200",
                "border-2 flex items-center justify-between gap-4",
                !showResults && !isSelected && "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50",
                !showResults && isSelected && "border-indigo-500 bg-indigo-50",
                isCorrect && "border-emerald-500 bg-emerald-50",
                isWrong && "border-red-400 bg-red-50"
              )}
            >
              <span className={cn(
                "font-medium",
                isCorrect && "text-emerald-700",
                isWrong && "text-red-600",
                !showResults && isSelected && "text-indigo-700"
              )}>
                {option}
              </span>
              
              {showResults && isCorrect && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              )}
              {showResults && isWrong && (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}