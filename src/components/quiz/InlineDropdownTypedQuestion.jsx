import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export default function InlineDropdownTypedQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer,
  showResults = false
}) {
  const handleInputChange = (blankId, value) => {
    onAnswer({
      ...selectedAnswers,
      [blankId]: value
    });
  };

  // Parse text with blanks and render inline input fields
  const renderTextWithBlanks = () => {
    let text = question.textWithBlanks || "";
    text = text.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
    text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]+/g, ' ');
    
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    
    return parts.map((part, idx) => {
      const blankMatch = part.match(/\{\{([^}]+)\}\}/);
      
      if (blankMatch) {
        const blankId = blankMatch[1];
        const blank = question.blanks?.find(b => b.id === blankId);
        
        if (!blank) return null;
        
        const userAnswer = selectedAnswers[blankId] || '';
        const correctAnswer = blank.correctAnswer || '';
        const isCorrect = showResults && userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        const isWrong = showResults && userAnswer && userAnswer.toLowerCase().trim() !== correctAnswer.toLowerCase().trim();
        const hasAttempted = userAnswer.length > 0;
        
        return (
          <span key={idx} className="inline-flex items-center gap-1 mx-1 align-middle">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => handleInputChange(blankId, e.target.value)}
              disabled={showResults}
              placeholder="Type answer"
              className={cn(
                "h-9 px-3 rounded-lg border-2 text-sm transition-all inline-block w-auto min-w-[120px]",
                !showResults && "border-slate-300 hover:border-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200",
                !showResults && userAnswer && "border-indigo-500 bg-indigo-50",
                isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-700",
                isWrong && "border-red-400 bg-red-50 text-red-600",
                showResults && "cursor-not-allowed bg-slate-100"
              )}
            />
            
            {showResults && isCorrect && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
            {showResults && isWrong && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="w-4 h-4" />
                <span>Correct: <span className="font-medium">{correctAnswer}</span></span>
              </span>
            )}
            {showResults && !hasAttempted && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <span>Correct: <span className="font-medium">{correctAnswer}</span></span>
              </span>
            )}
          </span>
        );
      }
      
      return <span key={idx} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  const hasAnswers = selectedAnswers && Object.keys(selectedAnswers).length > 0;
  const isUnattempted = showResults && !hasAnswers;

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {isUnattempted && (
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Not Attempted</span>
          </div>
        )}
        <div 
          className="text-xl font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none prose-p:my-0"
          dangerouslySetInnerHTML={{ __html: question.question }}
        />
        
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 lg:p-8 border border-slate-200/60">
          <div className="text-lg leading-loose text-slate-700 whitespace-pre-wrap">
            {renderTextWithBlanks()}
          </div>
        </div>
      </div>
    </div>
  );
}