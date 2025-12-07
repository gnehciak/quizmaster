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
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <h3 className="text-lg font-medium text-slate-800 leading-relaxed">
          {question.question}
        </h3>
        
        <div className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = showResults && option === question.correctAnswer;
            const isWrong = showResults && isSelected && option !== question.correctAnswer;
            
            return (
              <button
                key={idx}
                onClick={() => !showResults && onAnswer(option)}
                disabled={showResults}
                className={cn(
                  "w-full p-4 rounded-lg text-left transition-all",
                  "border-2 flex items-center gap-3 group",
                  !showResults && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  !showResults && isSelected && "border-slate-800 bg-slate-50",
                  isCorrect && "border-emerald-500 bg-emerald-50",
                  isWrong && "border-red-400 bg-red-50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  !showResults && !isSelected && "border-slate-300 group-hover:border-slate-400",
                  !showResults && isSelected && "border-slate-800 bg-slate-800",
                  isCorrect && "border-emerald-500 bg-emerald-500",
                  isWrong && "border-red-500 bg-red-500"
                )}>
                  {(isSelected || isCorrect || isWrong) && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                
                <span className={cn(
                  "font-medium",
                  isCorrect && "text-emerald-700",
                  isWrong && "text-red-600",
                  !showResults && isSelected && "text-slate-800"
                )}>
                  {option}
                </span>
                
                {showResults && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-auto" />
                )}
                {showResults && isWrong && (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </div>

        {showResults && question.explanation && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
            <p className="text-sm text-blue-800">{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}