import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GripVertical, CheckCircle2, XCircle, RotateCcw, Sparkles, Loader2, RefreshCw, X, Trash2, FileEdit, Code } from 'lucide-react';
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
  
  // Get all used answers
  const usedAnswers = Object.values(selectedAnswers);
  
  // Available options (not yet placed)
  const availableOptions = question.options.filter(opt => !usedAnswers.includes(opt));

  const handleDragStart = (e, option, fromZone = null) => {
    if (showResults) return;
    setDraggedItem({ item: option, fromZone });
    e.dataTransfer.effectAllowed = 'move';
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
    <div className="h-full p-8 overflow-y-auto">
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
          <AnimatePresence mode="popLayout">
            {availableOptions.map((option) => (
              <motion.div
                key={option}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                draggable={!showResults}
                onDragStart={(e) => handleDragStart(e, option, null)}
                onDragEnd={() => setDraggedItem(null)}
                className={cn(
                  "px-4 py-2.5 bg-white rounded-xl border-2 border-slate-200",
                  "flex items-center gap-2 cursor-grab active:cursor-grabbing",
                  "hover:border-indigo-300 hover:shadow-md transition-all",
                  showResults && "cursor-default opacity-50"
                )}
              >
                <GripVertical className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700">{option}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          
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
            <motion.div
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
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  draggable={!showResults}
                  onDragStart={(e) => handleDragStart(e, placedAnswer, zone.id)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl flex items-center justify-between gap-2",
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
                </motion.div>
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
            </motion.div>
          );
        })}
      </div>
    </div>
    </div>
  );
}