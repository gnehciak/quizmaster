import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InlineDropdownQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults 
}) {
  const handleSelect = (blankId, value) => {
    if (showResults) return;
    onAnswer({
      ...selectedAnswers,
      [blankId]: value
    });
  };

  // Parse text with blanks - format: "Text {{blank_id}} more text"
  const renderTextWithBlanks = () => {
    let text = question.textWithBlanks || "";
    // Replace block-level HTML tags with newlines
    text = text.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
    text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Clean up multiple consecutive newlines (more than 2)
    text = text.replace(/\n{3,}/g, '\n\n');
    // Clean up multiple consecutive spaces/tabs but keep newlines
    text = text.replace(/[ \t]+/g, ' ');
    
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    
    return parts.map((part, idx) => {
      const blankMatch = part.match(/\{\{([^}]+)\}\}/);
      
      if (blankMatch) {
        const blankId = blankMatch[1];
        const blank = question.blanks?.find(b => b.id === blankId);
        
        if (!blank) return null;
        
        const selectedValue = selectedAnswers[blankId];
        const isCorrect = showResults && selectedValue === blank.correctAnswer;
        const isWrong = showResults && selectedValue && selectedValue !== blank.correctAnswer;
        
        return (
          <span key={idx} className="inline-flex items-center gap-1 mx-1 align-middle">
            <Select
              value={selectedValue || ""}
              onValueChange={(value) => handleSelect(blankId, value)}
              disabled={showResults}
            >
              <SelectTrigger 
                className={cn(
                  "w-auto min-w-[140px] h-9 inline-flex text-sm",
                  "border-2 rounded-lg",
                  !showResults && "border-slate-300 hover:border-indigo-400",
                  !showResults && selectedValue && "border-indigo-500 bg-indigo-50",
                  isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-700",
                  isWrong && "border-red-400 bg-red-50 text-red-600"
                )}
              >
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {blank.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {showResults && isCorrect && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
            {showResults && isWrong && (
              <span className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-emerald-600 font-medium">
                  ({blank.correctAnswer})
                </span>
              </span>
            )}
          </span>
        );
      }
      
      return <span key={idx} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
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