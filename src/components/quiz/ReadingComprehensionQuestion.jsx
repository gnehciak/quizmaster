import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

export default function ReadingComprehensionQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults 
}) {
  const handleAnswer = (questionId, answer) => {
    if (showResults) return;
    onAnswer({
      ...selectedAnswers,
      [questionId]: answer
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Left Pane - Passage */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 lg:p-8 border border-slate-200/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Reading Passage
          </span>
        </div>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base lg:text-lg">
            {question.passage}
          </p>
        </div>
      </div>

      {/* Right Pane - Questions */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">
          {question.question || "Answer the following questions:"}
        </h3>
        
        <div className="space-y-8">
          {question.comprehensionQuestions?.map((q, qIdx) => (
            <motion.div 
              key={q.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: qIdx * 0.1 }}
              className="space-y-3"
            >
              <p className="font-medium text-slate-700">
                {qIdx + 1}. {q.question}
              </p>
              
              <div className="space-y-2">
                {q.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === option;
                  const isCorrect = showResults && option === q.correctAnswer;
                  const isWrong = showResults && isSelected && option !== q.correctAnswer;
                  
                  return (
                    <motion.button
                      key={optIdx}
                      whileHover={{ scale: showResults ? 1 : 1.01 }}
                      whileTap={{ scale: showResults ? 1 : 0.98 }}
                      onClick={() => handleAnswer(q.id, option)}
                      disabled={showResults}
                      className={cn(
                        "w-full p-3 rounded-xl text-left text-sm transition-all duration-200",
                        "border-2 flex items-center justify-between gap-3",
                        !showResults && !isSelected && "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50",
                        !showResults && isSelected && "border-indigo-500 bg-indigo-50",
                        isCorrect && "border-emerald-500 bg-emerald-50",
                        isWrong && "border-red-400 bg-red-50"
                      )}
                    >
                      <span className={cn(
                        isCorrect && "text-emerald-700 font-medium",
                        isWrong && "text-red-600",
                        !showResults && isSelected && "text-indigo-700 font-medium"
                      )}>
                        {option}
                      </span>
                      
                      {showResults && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                      {showResults && isWrong && (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}