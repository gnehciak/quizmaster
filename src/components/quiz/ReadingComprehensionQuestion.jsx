import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, BookOpen } from 'lucide-react';

export default function ReadingComprehensionQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults 
}) {
  const passages = question.passages?.length > 0 
    ? question.passages 
    : [{ id: 'main', title: 'Passage', content: question.passage }];
  
  const [activeTab, setActiveTab] = useState(passages[0]?.id);

  const handleAnswer = (questionId, answer) => {
    if (showResults) return;
    onAnswer({
      ...selectedAnswers,
      [questionId]: answer
    });
  };

  const activePassage = passages.find(p => p.id === activeTab) || passages[0];

  return (
    <div className="h-full grid grid-cols-2 divide-x divide-slate-200">
      {/* Left Pane - Passage */}
      <div className="p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-2xl">
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-4">
              {question.question || "Using the passage below, read and answer the questions opposite."}
            </p>
            
            {passages.length > 1 && (
              <div className="flex gap-2 mb-4">
                {passages.map((passage) => (
                  <button
                    key={passage.id}
                    onClick={() => setActiveTab(passage.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      activeTab === passage.id
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {passage.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {activePassage?.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Questions */}
      <div className="p-8 overflow-y-auto">
        <div className="max-w-2xl space-y-8">
          {question.comprehensionQuestions?.map((q, qIdx) => (
            <div key={q.id} className="space-y-3">
              <p className="font-medium text-slate-800 text-base">
                {q.question}
              </p>
              
              <div className="space-y-2">
                {q.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[q.id] === option;
                  const isCorrect = showResults && option === q.correctAnswer;
                  const isWrong = showResults && isSelected && option !== q.correctAnswer;
                  
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleAnswer(q.id, option)}
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
                        "text-sm",
                        isCorrect && "text-emerald-700 font-medium",
                        isWrong && "text-red-600",
                        !showResults && isSelected && "text-slate-800 font-medium"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}