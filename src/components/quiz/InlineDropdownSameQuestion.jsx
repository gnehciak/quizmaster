import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InlineDropdownSameQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults 
}) {
  const handleAnswer = (blankId, answer) => {
    if (showResults) return;
    onAnswer({
      ...selectedAnswers,
      [blankId]: answer
    });
  };

  const renderTextWithDropdowns = () => {
    const text = question.textWithBlanks || '';
    const parts = text.split(/(\{\{blank_\d+\}\})/g);
    
    return parts.map((part, idx) => {
      const blankMatch = part.match(/\{\{(blank_\d+)\}\}/);
      
      if (blankMatch) {
        const blankId = blankMatch[1];
        const blank = question.blanks?.find(b => b.id === blankId);
        const selectedAnswer = selectedAnswers[blankId];
        const isCorrect = showResults && selectedAnswer === blank?.correctAnswer;
        const isWrong = showResults && selectedAnswer && selectedAnswer !== blank?.correctAnswer;
        
        return (
          <span key={idx} className="inline-block mx-1 align-middle">
            {showResults ? (
              <span className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 font-medium",
                isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-700",
                isWrong && "border-red-400 bg-red-50 text-red-600",
                !selectedAnswer && "border-slate-300 bg-slate-50 text-slate-500"
              )}>
                {selectedAnswer || '—'}
                {isCorrect && <CheckCircle2 className="w-4 h-4" />}
                {isWrong && <XCircle className="w-4 h-4" />}
              </span>
            ) : (
              <Select
                value={selectedAnswer || ''}
                onValueChange={(value) => handleAnswer(blankId, value)}
              >
                <SelectTrigger className="w-[200px] h-9 inline-flex">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {question.options?.filter(o => o).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </span>
        );
      }
      
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <p className="text-lg font-medium text-slate-800 leading-relaxed">
        {renderTextWithDropdowns()}
      </p>
      
      {showResults && question.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-slate-700">{question.explanation}</p>
        </div>
      )}
    </motion.div>
  );
}