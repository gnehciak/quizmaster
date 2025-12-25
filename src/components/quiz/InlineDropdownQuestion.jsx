import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Sparkles, Loader2, X, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function InlineDropdownQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults,
  onRequestHelp,
  aiHelperContent = {},
  aiHelperLoading = {},
  isAdmin = false,
  tipsAllowed = 999,
  tipsUsed = 0,
  openedTips = new Set(),
  currentIndex = 0,
  onRequestExplanation,
  explanationContent = {},
  explanationLoading = {},
  openedExplanations = new Set(),
  onRegenerateExplanation,
  onDeleteExplanation
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
        const isWrong = showResults && selectedValue !== blank.correctAnswer;
        
        const tipId = `blank-${currentIndex}-${blankId}`;
        const wasTipOpened = openedTips.has(tipId);
        const helpContent = aiHelperContent[blankId];
        const isLoadingHelp = aiHelperLoading[blankId];
        const isTipDisabled = !onRequestHelp || (!isAdmin && !wasTipOpened && tipsAllowed !== 999 && tipsUsed >= tipsAllowed);
        
        const explanationId = `blank-${currentIndex}-${blankId}`;
        const wasExplanationOpened = openedExplanations.has(explanationId);
        const explanation = explanationContent[blankId];
        const isLoadingExplanation = explanationLoading[blankId];

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
            
            {!showResults && onRequestHelp && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={isTipDisabled}
                    onClick={() => !isTipDisabled && !helpContent && onRequestHelp(blankId)}
                  >
                    {isLoadingHelp ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                    )}
                  </Button>
                </PopoverTrigger>
                {helpContent && (
                  <PopoverContent className="w-80 max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-slate-800">Word Definitions</h4>
                      <div 
                        className="text-sm text-slate-700 space-y-2 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: helpContent }}
                      />
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            )}
            
            {showResults && isCorrect && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
            {showResults && isWrong && (
              <span className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-slate-600">
                  Correct: <span className="font-medium text-emerald-600">{blank.correctAnswer}</span>
                </span>
                {onRequestExplanation && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => !explanation && onRequestExplanation(blankId)}
                      >
                        {isLoadingExplanation ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    {explanation && (
                      <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-slate-800">Explanation</h4>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                {onRegenerateExplanation && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRegenerateExplanation(blankId)}
                                    className="h-7 px-2 gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                  </Button>
                                )}
                                {onDeleteExplanation && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteExplanation(blankId)}
                                    className="h-7 px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <div 
                            className="text-sm text-slate-700 space-y-2 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: explanation }}
                          />
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                )}
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