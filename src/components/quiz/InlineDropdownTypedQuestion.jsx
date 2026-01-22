import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import RichTextEditor from '@/components/quiz/RichTextEditor';

export default function InlineDropdownTypedQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer,
  showResults = false
}) {
  const [answers, setAnswers] = useState(selectedAnswers);

  const handleInputChange = (blankId, value) => {
    const newAnswers = { ...answers, [blankId]: value };
    setAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  if (!question.blanks || question.blanks.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        No blanks configured for this question
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Question Text */}
      <div className="space-y-4">
        <div 
          className="prose prose-slate max-w-none text-slate-800 leading-relaxed prose-p:my-2"
          dangerouslySetInnerHTML={{ __html: question.textWithBlanks || question.question }}
        />
      </div>

      {/* Blanks Input Section */}
      <div className="bg-slate-50 rounded-lg p-6 space-y-4 border border-slate-200">
        <h3 className="font-semibold text-slate-700">Fill in the Blanks</h3>
        
        <div className="space-y-4">
          {question.blanks.map((blank, idx) => {
            const userAnswer = answers[blank.id] || '';
            const correctAnswer = blank.correctAnswer || '';
            const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
            const hasAttempted = userAnswer.length > 0;

            return (
              <div key={blank.id} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Blank {idx + 1}
                </label>
                
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => handleInputChange(blank.id, e.target.value)}
                    disabled={showResults}
                    placeholder={`Enter answer for blank ${idx + 1}`}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-base",
                      !showResults && "focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
                      showResults && "cursor-not-allowed bg-slate-100",
                      !showResults && "border-slate-300 hover:border-slate-400",
                      showResults && hasAttempted && isCorrect && "border-emerald-500 bg-emerald-50",
                      showResults && hasAttempted && !isCorrect && "border-red-500 bg-red-50"
                    )}
                  />
                  
                  {showResults && hasAttempted && (
                    <div className="flex items-center gap-1 text-sm font-medium">
                      {isCorrect ? (
                        <span className="text-emerald-700">✓ Correct</span>
                      ) : (
                        <span className="text-red-700">✗ Incorrect</span>
                      )}
                    </div>
                  )}
                </div>

                {showResults && hasAttempted && !isCorrect && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                    <strong>Correct answer:</strong> {correctAnswer}
                  </div>
                )}

                {showResults && !hasAttempted && (
                  <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-600">
                    <strong>Correct answer:</strong> {correctAnswer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}