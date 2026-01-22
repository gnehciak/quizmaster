import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Sparkles, Loader2, X, RefreshCw, Trash2, FileEdit, Code } from 'lucide-react';
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

export default function InlineDropdownSameQuestion({ 
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
  onRegenerateHelp = null,
  onDeleteHelp = null,
  onEditHelp = null,
  onEditPrompt = null,
  onRequestExplanation = null,
  onGenerateExplanation = null,
  onRegenerateExplanation = null,
  onDeleteExplanation = null,
  onEditExplanation = null,
  onEditExplanationPrompt = null,
  explanationContent = {},
  explanationLoading = {},
  openedExplanations = new Set()
}) {
  const handleAnswer = (blankId, answer) => {
    if (showResults) return;
    onAnswer({
      ...selectedAnswers,
      [blankId]: answer
    });
  };

  const renderTextWithDropdowns = () => {
    let text = question.textWithBlanks || '';
    // Replace block-level HTML tags with newlines
    text = text.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
    text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Clean up multiple consecutive newlines (more than 2)
    text = text.replace(/\n{3,}/g, '\n\n');
    // Clean up multiple consecutive spaces/tabs but keep newlines
    text = text.replace(/[ \t]+/g, ' ');
    
    const parts = text.split(/(\{\{blank_\d+\}\})/g);
    
    return parts.map((part, idx) => {
      const blankMatch = part.match(/\{\{(blank_\d+)\}\}/);
      
      if (blankMatch) {
        const blankId = blankMatch[1];
        const blank = question.blanks?.find(b => b.id === blankId);
        const selectedAnswer = selectedAnswers[blankId];
        const isCorrect = showResults && selectedAnswer === blank?.correctAnswer;
        const isWrong = showResults && selectedAnswer && selectedAnswer !== blank?.correctAnswer;
        const showExplainButton = showResults && !isCorrect;
        
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
            {showResults ? (
              <>
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
                {showExplainButton && (
                  <>
                    <span className="text-xs text-slate-600">
                      Correct: <span className="font-medium text-emerald-600">{blank.correctAnswer}</span>
                    </span>
                    {(onRequestExplanation || onGenerateExplanation) && (
                      explanation ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-slate-800">Explanation</h4>
                                {isAdmin && (onRegenerateExplanation || onDeleteExplanation || onEditExplanation || onEditExplanationPrompt) && (
                                  <div className="flex items-center gap-1">
                                    {onRegenerateExplanation && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRegenerateExplanation(blankId)}
                                        className="h-7 px-2 gap-1"
                                        title="Regenerate"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {onEditExplanation && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditExplanation(blankId)}
                                        className="h-7 px-2 gap-1"
                                        title="Edit Explanation"
                                      >
                                        <FileEdit className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {onEditExplanationPrompt && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onEditExplanationPrompt}
                                        className="h-7 px-2 gap-1"
                                        title="Edit Prompt"
                                      >
                                        <Code className="w-3 h-3" />
                                      </Button>
                                    )}
                                    {onDeleteExplanation && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDeleteExplanation(blankId)}
                                        className="h-7 px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete"
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
                        </Popover>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onGenerateExplanation && onGenerateExplanation(blankId)}
                          disabled={isLoadingExplanation}
                        >
                          {isLoadingExplanation ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                          )}
                        </Button>
                      )
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <Select
                   value={selectedAnswer || ''}
                   onValueChange={(value) => handleAnswer(blankId, value)}
                 >
                   <SelectTrigger 
                     className={cn(
                       "w-auto min-w-[120px] h-8 inline-flex text-sm",
                       "border-2 rounded-lg",
                       "border-slate-300 hover:border-indigo-400"
                     )}
                   >
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
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-slate-800">Word Definitions</h4>
                            {isAdmin && (onRegenerateHelp || onDeleteHelp || onEditHelp || onEditPrompt) && (
                              <div className="flex items-center gap-1">
                                {onRegenerateHelp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRegenerateHelp(blankId)}
                                    disabled={isLoadingHelp}
                                    className="h-7 px-2 gap-1"
                                    title="Regenerate"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </Button>
                                )}
                                {onEditHelp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditHelp(blankId)}
                                    className="h-7 px-2 gap-1"
                                    title="Edit Tip"
                                  >
                                    <FileEdit className="w-3 h-3" />
                                  </Button>
                                )}
                                {onEditPrompt && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onEditPrompt}
                                    className="h-7 px-2 gap-1"
                                    title="View Prompt"
                                  >
                                    <Code className="w-3 h-3" />
                                  </Button>
                                )}
                                {onDeleteHelp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteHelp(blankId)}
                                    className="h-7 px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          <div 
                            className="text-sm text-slate-700 space-y-2 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: helpContent }}
                          />
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                )}
              </>
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
          className="text-xl font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none prose-p:my-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-md"
          dangerouslySetInnerHTML={{ __html: question.question }}
        />
        
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 lg:p-8 border border-slate-200/60">
          <div className="text-lg leading-loose text-slate-700 whitespace-pre-wrap">
            {renderTextWithDropdowns()}
          </div>
        </div>
        
        {showResults && question.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div 
              className="text-sm text-slate-700 prose prose-slate max-w-none prose-p:my-0"
              dangerouslySetInnerHTML={{ __html: question.explanation }}
            />
          </div>
        )}
      </div>
    </div>
  );
}