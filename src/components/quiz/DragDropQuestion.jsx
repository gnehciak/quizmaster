import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GripVertical, CheckCircle2, XCircle, RotateCcw, Sparkles, Loader2, RefreshCw, X, Trash2, FileEdit, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DragDropQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults,
  onRequestHelp,
  aiHelperContent = {},
  aiHelperLoading = {},
  highlightedPassages = {},
  isAdmin = false,
  tipsAllowed = 999,
  tipsUsed = 0,
  onRegenerateHelp,
  openedTips = new Set(),
  currentIndex = 0,
  onRequestExplanation,
  onGenerateExplanation = null,
  explanationContent = {},
  explanationLoading = {},
  explanationHighlightedPassages = {},
  openedExplanations = new Set(),
  onRegenerateExplanation,
  onDeleteExplanation,
  onGenerateAllExplanations = null,
  onEditExplanation = null,
  onEditExplanationPrompt = null
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const scrollContainerRef = useRef(null);
  const scrollAnimRef = useRef(null);
  const scrollSpeedRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [scrollDirection, setScrollDirection] = useState(null); // 'down', 'up', or null

  const SCROLL_ZONE = 100;
  const MAX_SCROLL_SPEED = 10;

  const stopAutoScroll = useCallback(() => {
    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
    scrollSpeedRef.current = 0;
    setScrollDirection(null);
  }, []);

  const startAutoScroll = useCallback(() => {
    if (scrollAnimRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const tick = () => {
      if (scrollSpeedRef.current !== 0 && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += scrollSpeedRef.current;
      }
      scrollAnimRef.current = requestAnimationFrame(tick);
    };
    scrollAnimRef.current = requestAnimationFrame(tick);
  }, []);

  // Use a document-level dragover listener so we always detect cursor position
  useEffect(() => {
    const handleGlobalDragOver = (e) => {
      if (!isDraggingRef.current || !scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const y = e.clientY;

      // Only act when cursor is within the horizontal bounds of our container
      if (e.clientX < rect.left || e.clientX > rect.right) {
        stopAutoScroll();
        return;
      }

      const distFromBottom = rect.bottom - y;
      const distFromTop = y - rect.top;

      // Check if there's actually room to scroll
      const canScrollDown = container.scrollTop + container.clientHeight < container.scrollHeight - 2;
      const canScrollUp = container.scrollTop > 2;

      if (distFromBottom < SCROLL_ZONE && distFromBottom > -20 && canScrollDown) {
        const intensity = 1 - Math.max(0, distFromBottom) / SCROLL_ZONE;
        scrollSpeedRef.current = intensity * MAX_SCROLL_SPEED;
        setScrollDirection('down');
        startAutoScroll();
      } else if (distFromTop < SCROLL_ZONE && distFromTop > -20 && canScrollUp) {
        const intensity = 1 - Math.max(0, distFromTop) / SCROLL_ZONE;
        scrollSpeedRef.current = -intensity * MAX_SCROLL_SPEED;
        setScrollDirection('up');
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      stopAutoScroll();
    };
  }, [startAutoScroll, stopAutoScroll]);

  // Get all used answers
  const usedAnswers = Object.values(selectedAnswers);
  
  // Available options (not yet placed)
  const availableOptions = question.options.filter(opt => !usedAnswers.includes(opt));

  const handleDragStart = (e, option, fromZone = null) => {
    if (showResults) return;
    setDraggedItem({ item: option, fromZone });
    isDraggingRef.current = true;
    e.dataTransfer.setData('text/plain', option);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    isDraggingRef.current = false;
    stopAutoScroll();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, zoneId) => {
    e.preventDefault();
    if (showResults || !draggedItem) return;
    
    const newAnswers = { ...selectedAnswers };
    
    // Remove from previous zone if it was in one
    if (draggedItem.fromZone) {
      delete newAnswers[draggedItem.fromZone];
    } else {
      // Remove from any other zone if exists
      Object.keys(newAnswers).forEach(key => {
        if (newAnswers[key] === draggedItem.item) {
          delete newAnswers[key];
        }
      });
    }
    
    // Add to new zone
    newAnswers[zoneId] = draggedItem.item;
    onAnswer(newAnswers);
    setDraggedItem(null);
  };

  const handleDropToAvailable = (e) => {
    e.preventDefault();
    if (showResults || !draggedItem) return;
    
    const newAnswers = { ...selectedAnswers };
    
    // Remove from zone
    if (draggedItem.fromZone) {
      delete newAnswers[draggedItem.fromZone];
      onAnswer(newAnswers);
    }
    
    setDraggedItem(null);
  };

  const handleRemoveFromZone = (zoneId) => {
    if (showResults) return;
    const newAnswers = { ...selectedAnswers };
    delete newAnswers[zoneId];
    onAnswer(newAnswers);
  };

  const handleReset = () => {
    onAnswer({});
  };

  const hasAnswers = selectedAnswers && Object.keys(selectedAnswers).length > 0;
  const isUnattempted = showResults && !hasAnswers;

  return (
    <div className="h-full relative" ref={scrollContainerRef} style={{ overflowY: 'auto' }}>
      <div className="p-8">
        <div className="max-w-3xl mx-auto space-y-8">
        {isUnattempted && (
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Not Attempted</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div 
            className="text-xl font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none prose-p:my-0"
            dangerouslySetInnerHTML={{ __html: question.question }}
          />
          
          {!showResults && Object.keys(selectedAnswers).length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        {/* Draggable Options */}
        <div 
          className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60"
          onDragOver={handleDragOver}
          onDrop={handleDropToAvailable}
        >
          <p className="text-sm text-slate-500 mb-4 font-medium">
            Drag items to their correct positions:
          </p>
          
          <div className="flex flex-wrap gap-3 min-h-[60px]">
              {availableOptions.map((option) => (
                <div
                  key={option}
                  draggable={!showResults}
                  onDragStart={(e) => handleDragStart(e, option, null)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "px-4 py-2.5 bg-white rounded-xl border-2 border-slate-200",
                    "flex items-center gap-2 cursor-grab active:cursor-grabbing select-none",
                    "hover:border-indigo-300 hover:shadow-md transition-all",
                    showResults && "cursor-default opacity-50"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{option}</span>
                </div>
              ))}
            
            {availableOptions.length === 0 && !showResults && (
              <p className="text-sm text-slate-400 italic">All items placed</p>
            )}
          </div>
        </div>

        {/* Drop Zones */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-slate-600">Drop Zones:</h3>
          {isAdmin && onGenerateAllExplanations && (
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
        <div className="grid gap-4 sm:grid-cols-2">
          {question.dropZones?.map((zone) => {
            const placedAnswer = selectedAnswers[zone.id];
            const isCorrect = showResults && placedAnswer === zone.correctAnswer;
            const isWrong = showResults && placedAnswer && placedAnswer !== zone.correctAnswer;
            const showCorrectAnswer = showResults && !isCorrect;
            const showExplainButton = showResults && !isCorrect;
            const tipId = `dropzone-${currentIndex}-${zone.id}`;
            const wasTipOpened = openedTips.has(tipId);
            const helpContent = aiHelperContent[zone.id];
            const isLoadingHelp = aiHelperLoading[zone.id];
            const isTipDisabled = !onRequestHelp || (!isAdmin && !wasTipOpened && tipsAllowed !== 999 && tipsUsed >= tipsAllowed);
            
            const explanationId = `dropzone-${currentIndex}-${zone.id}`;
            const wasExplanationOpened = openedExplanations.has(explanationId);
            const explanation = explanationContent[zone.id];
            const isLoadingExplanation = explanationLoading[zone.id];
            
            return (
              <div
                key={zone.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, zone.id)}
                className={cn(
                  "p-5 rounded-2xl border-2 border-dashed transition-all min-h-[100px]",
                  !placedAnswer && !showResults && "border-slate-300 bg-slate-50/50",
                  placedAnswer && !showResults && "border-indigo-400 bg-indigo-50/50",
                  isCorrect && "border-emerald-400 bg-emerald-50",
                  isWrong && "border-red-400 bg-red-50"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    {zone.label}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {!showResults && onRequestHelp && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={isTipDisabled}
                            onClick={() => !isTipDisabled && !helpContent && onRequestHelp(zone.id)}
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
                                {isAdmin && onRegenerateHelp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRegenerateHelp(zone.id)}
                                    className="h-7 px-2 gap-1"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                  </Button>
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
                    
                    {showResults && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                    {showResults && isWrong && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                
                {placedAnswer ? (
                  <div
                    draggable={!showResults}
                    onDragStart={(e) => handleDragStart(e, placedAnswer, zone.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 select-none",
                      !showResults && "bg-white border border-indigo-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all",
                      isCorrect && "bg-emerald-100 border border-emerald-300",
                      isWrong && "bg-red-100 border border-red-300",
                      showResults && "cursor-default"
                    )}
                  >
                    {!showResults && (
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={cn(
                      "font-medium flex-1",
                      isCorrect && "text-emerald-700",
                      isWrong && "text-red-700"
                    )}>
                      {placedAnswer}
                    </span>
                    
                    {!showResults && (
                      <button 
                        onClick={() => handleRemoveFromZone(zone.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm italic">
                    Drop answer here
                  </div>
                )}
                
                {showExplainButton && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-emerald-600 font-medium">
                      Correct: {zone.correctAnswer}
                    </p>
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
                                        onClick={() => onRegenerateExplanation(zone.id)}
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
                                        onClick={() => onEditExplanation(zone.id)}
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
                                        onClick={() => onDeleteExplanation(zone.id)}
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
                          onClick={() => onGenerateExplanation && onGenerateExplanation(zone.id)}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Scroll Direction Indicators */}
      <AnimatePresence>
        {scrollDirection === 'down' && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg">
              <ChevronDown className="w-4 h-4 animate-bounce" />
              <span className="text-sm font-medium">Scrolling down</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>
        )}
        {scrollDirection === 'up' && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg">
              <ChevronUp className="w-4 h-4 animate-bounce" />
              <span className="text-sm font-medium">Scrolling up</span>
              <ChevronUp className="w-4 h-4 animate-bounce" />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}