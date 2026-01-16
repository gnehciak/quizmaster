import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, GripVertical, Sparkles, Loader2, RefreshCw, X, Trash2, FileEdit, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MatchingListQuestion({ 
  question,
  selectedAnswer,
  selectedAnswers = {}, 
  onAnswer, 
  showResults,
  singleQuestion = false,
  subQuestion = null,
  onRequestHelp = null,
  aiHelperContent = {},
  aiHelperLoading = {},
  isAdmin = false,
  tipsAllowed = 999,
  tipsUsed = 0,
  onRegenerateHelp = null,
  onDeleteHelp = null,
  onEditHelp = null,
  onEditPrompt = null,
  openedTips = new Set(),
  currentIndex = 0,
  onRequestExplanation,
  onGenerateExplanation = null,
  explanationContent = {},
  explanationLoading = {},
  openedExplanations = new Set(),
  onRegenerateExplanation,
  onDeleteExplanation,
  onGenerateAllExplanations = null,
  onEditExplanation = null,
  onEditExplanationPrompt = null
}) {
  const passages = question.passages?.length > 0 
    ? question.passages 
    : [{ id: 'main', title: 'Passage', content: question.passage }];
  
  const [activeTab, setActiveTab] = useState(passages[0]?.id);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleAnswer = (questionId, answer) => {
    if (showResults) return;
    if (singleQuestion) {
      onAnswer(answer);
    } else {
      onAnswer({
        ...selectedAnswers,
        [questionId]: answer
      });
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
      
      if (newLeftWidth >= 30 && newLeftWidth <= 70) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const activePassage = passages.find(p => p.id === activeTab) || passages[0];

  return (
    <div ref={containerRef} className="h-full flex relative">
      {/* Left Pane - Passage */}
      <div className="overflow-y-auto bg-slate-50 flex flex-col" style={{ width: `${leftWidth}%` }}>
        {/* Sticky Header */}
        <div className="sticky top-0 bg-slate-50 z-10 px-8 pt-8 pb-4 border-b border-slate-200">
          <div 
            className="text-sm text-slate-600 mb-4 prose prose-slate max-w-none prose-p:my-0"
            dangerouslySetInnerHTML={{ __html: question.question || "Using the passage below, read and answer the matching questions opposite." }}
          />
          
          {passages.length > 1 && (
            <div className="flex gap-2">
              {passages.map((passage) => (
                <button
                  key={passage.id}
                  onClick={() => setActiveTab(passage.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    activeTab === passage.id
                      ? "bg-white text-slate-800 shadow-sm border-slate-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent"
                  )}
                >
                  {passage.title}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Scrollable Passage Content */}
        <div className="flex-1 px-8 py-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200 h-full">
            <div 
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: activePassage?.content }}
            />
          </div>
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "w-1 bg-slate-300 hover:bg-indigo-500 cursor-col-resize relative group transition-colors flex-shrink-0",
          isDragging && "bg-indigo-500"
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-400 group-hover:bg-indigo-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Right Pane - Matching Questions */}
      <div className="overflow-y-auto flex-1 p-8">
        <div className="max-w-3xl">
          {showResults && Object.keys(selectedAnswers).length === 0 && !singleQuestion && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 mb-6">
              <X className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-700">Not Attempted</span>
            </div>
          )}
          {showResults && singleQuestion && (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 mb-6">
              <X className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-700">Not Attempted</span>
            </div>
          )}
          {question.rightPaneQuestion && (
            <div 
              className="text-base text-slate-700 mb-6 prose prose-slate max-w-none prose-p:my-0"
              dangerouslySetInnerHTML={{ __html: question.rightPaneQuestion }}
            />
          )}

          <div className="space-y-3">
            <div className="flex justify-end mb-2">
              {isAdmin && !singleQuestion && onGenerateAllExplanations && (
                <Button
                  onClick={onGenerateAllExplanations}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate All Explanations
                </Button>
              )}
            </div>
            {singleQuestion && subQuestion ? (
              <div
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                  !showResults && "border-slate-200 bg-white",
                  showResults && selectedAnswer === subQuestion.correctAnswer && "border-emerald-500 bg-emerald-50",
                  showResults && selectedAnswer && selectedAnswer !== subQuestion.correctAnswer && "border-red-400 bg-red-50"
                )}
              >
                <div 
                  className="flex-1 text-sm text-slate-800 prose prose-slate max-w-none prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: subQuestion.question }}
                />
                
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Select
                    value={selectedAnswer || ''}
                    onValueChange={(value) => handleAnswer(subQuestion.id, value)}
                    disabled={showResults}
                  >
                    <SelectTrigger
                      className={cn(
                        "w-full",
                        showResults && selectedAnswer === subQuestion.correctAnswer && "border-emerald-500 bg-emerald-50",
                        showResults && selectedAnswer && selectedAnswer !== subQuestion.correctAnswer && "border-red-400 bg-red-50"
                      )}
                    >
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {showResults && selectedAnswer === subQuestion.correctAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  )}
                  {showResults && selectedAnswer && selectedAnswer !== subQuestion.correctAnswer && (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ) : (
              question.matchingQuestions?.map((q, qIdx) => {
                const selectedAnswerItem = selectedAnswers[q.id];
                const isCorrect = showResults && selectedAnswerItem === q.correctAnswer;
                const isWrong = showResults && selectedAnswerItem && selectedAnswerItem !== q.correctAnswer;
                const showExplainButton = showResults && !isCorrect;
                const tipId = `matching-${currentIndex}-${q.id}`;
                const wasTipOpened = openedTips.has(tipId);
                const helpContent = aiHelperContent[q.id];
                const isLoadingHelp = aiHelperLoading[q.id];
                const isTipDisabled = !onRequestHelp || (!isAdmin && !wasTipOpened && tipsAllowed !== 999 && tipsUsed >= tipsAllowed);
                
                const explanationId = `matching-${currentIndex}-${q.id}`;
                const wasExplanationOpened = openedExplanations.has(explanationId);
                const explanation = explanationContent[q.id];
                const isLoadingExplanation = explanationLoading[q.id];

                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                      !showResults && "border-slate-200 bg-white",
                      isCorrect && "border-emerald-500 bg-emerald-50",
                      isWrong && "border-red-400 bg-red-50"
                    )}
                  >
                    <div 
                      className="flex-1 text-sm text-slate-800 prose prose-slate max-w-none prose-p:my-0"
                      dangerouslySetInnerHTML={{ __html: q.question }}
                    />
                    
                    <div className="flex items-center gap-3 min-w-[200px]">
                      {!showResults && onRequestHelp && (
                        <Popover onOpenChange={(open) => {
                          if (isTipDisabled) return;
                          if (!helpContent && open) onRequestHelp(q.id);
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={isTipDisabled}
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
                                  <h4 className="font-semibold text-sm text-slate-800">Clue</h4>
                                  {isAdmin && (onRegenerateHelp || onDeleteHelp || onEditHelp || onEditPrompt) && (
                                    <div className="flex items-center gap-1">
                                      {onRegenerateHelp && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onRegenerateHelp(q.id)}
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
                                          onClick={() => onEditHelp(q.id)}
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
                                          title="Edit Prompt"
                                        >
                                          <Code className="w-3 h-3" />
                                        </Button>
                                      )}
                                      {onDeleteHelp && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onDeleteHelp(q.id)}
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
                      
                      <Select
                        value={selectedAnswerItem || ''}
                        onValueChange={(value) => handleAnswer(q.id, value)}
                        disabled={showResults}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full",
                            isCorrect && "border-emerald-500 bg-emerald-50",
                            isWrong && "border-red-400 bg-red-50"
                          )}
                        >
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {showResults && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      )}
                      {showExplainButton && (
                        <>
                          {isWrong && (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                          {(onRequestExplanation || onGenerateExplanation) && (
                            explanation ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
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
                                              onClick={() => onRegenerateExplanation(q.id)}
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
                                              onClick={() => onEditExplanation(q.id)}
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
                                              onClick={() => onDeleteExplanation(q.id)}
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
                                className="h-7 w-7 p-0"
                                onClick={() => onGenerateExplanation && onGenerateExplanation(q.id)}
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
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}