import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, GripVertical, Sparkles, Loader2, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DragDropDualQuestion({ 
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
  currentIndex = 0
}) {
  const passages = question.passages?.length > 0 
    ? question.passages 
    : [{ id: 'main', title: 'Passage', content: question.passage }];
  
  const [activeTab, setActiveTab] = useState(passages[0]?.id);
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [activeHelpZone, setActiveHelpZone] = useState(null);
  const containerRef = useRef(null);

  const activePassage = passages.find(p => p.id === activeTab) || passages[0];

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

  const handleDragStart = (e, item, fromZone = null) => {
    if (showResults) return;
    setDraggedItem({ item, fromZone });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (showResults) return;
    e.preventDefault();
  };

  const handleDrop = (e, zoneId) => {
    if (showResults) return;
    e.preventDefault();
    
    if (draggedItem) {
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
    }
  };

  const handleDropToAvailable = (e) => {
    if (showResults) return;
    e.preventDefault();
    
    if (draggedItem && draggedItem.fromZone) {
      const newAnswers = { ...selectedAnswers };
      delete newAnswers[draggedItem.fromZone];
      onAnswer(newAnswers);
      setDraggedItem(null);
    }
  };

  const availableOptions = question.options?.filter(opt => 
    !Object.values(selectedAnswers).includes(opt)
  ) || [];

  const hasAnswers = selectedAnswers && Object.keys(selectedAnswers).length > 0;
  const isUnattempted = showResults && !hasAnswers;

  return (
    <div ref={containerRef} className="h-full flex relative">
      {/* Left Pane - Passage */}
      <div className="overflow-y-auto bg-slate-50 flex flex-col" style={{ width: `${leftWidth}%` }}>
        <div className="sticky top-0 bg-slate-50 z-10 px-8 pt-8 pb-4 border-b border-slate-200">
          <div 
            className="text-sm text-slate-600 mb-4 prose prose-slate max-w-none prose-p:my-0"
            dangerouslySetInnerHTML={{ __html: question.question || "Read the passage and complete the drag and drop activity." }}
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
        
        <div className="flex-1 px-8 py-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200 h-full">
            <div 
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: (activeHelpZone && highlightedPassages && highlightedPassages[activeHelpZone] && highlightedPassages[activeHelpZone][activePassage?.id])
                  ? highlightedPassages[activeHelpZone][activePassage?.id] 
                  : activePassage?.content 
              }}
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

      {/* Right Pane - Drag & Drop Activity */}
      <div className="overflow-y-auto flex-1 p-8">
        <div className="max-w-2xl space-y-8">
          {/* Question Text */}
          {question.rightPaneQuestion && (
            <div className="pb-4 border-b border-slate-200">
              <div 
                className="text-lg font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none prose-p:my-0"
                dangerouslySetInnerHTML={{ __html: question.rightPaneQuestion }}
              />
            </div>
          )}
          
          {/* Available Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-600">Drag from here:</h3>
            <div 
              className="flex flex-wrap gap-2 min-h-[60px]"
              onDragOver={handleDragOver}
              onDrop={handleDropToAvailable}
            >
              {availableOptions.map((option, idx) => (
                <motion.div
                  key={idx}
                  draggable={!showResults}
                  onDragStart={(e) => handleDragStart(e, option, null)}
                  onDragEnd={() => setDraggedItem(null)}
                  className={cn(
                    "px-4 py-2 bg-white border-2 border-slate-300 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-2",
                    "hover:border-indigo-400 hover:shadow-md transition-all",
                    showResults && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  {option}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Drop Zones */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-600">Drop here:</h3>
            {question.dropZones?.map((zone) => {
              const droppedItem = selectedAnswers[zone.id];
              const isCorrect = showResults && droppedItem === zone.correctAnswer;
              const isWrong = showResults && droppedItem && droppedItem !== zone.correctAnswer;
              const tipId = `dropzone-${currentIndex}-${zone.id}`;
              const wasTipOpened = openedTips.has(tipId);
              const helpContent = aiHelperContent[zone.id];
              const isLoadingHelp = aiHelperLoading[zone.id];
              const isTipDisabled = !onRequestHelp || (!isAdmin && !wasTipOpened && tipsAllowed !== 999 && tipsUsed >= tipsAllowed);

              return (
                <div
                  key={zone.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, zone.id)}
                  className={cn(
                    "min-h-[80px] border-2 border-dashed rounded-lg p-4 transition-all",
                    !droppedItem && "border-slate-300 bg-slate-50",
                    droppedItem && !showResults && "border-slate-800 bg-slate-50",
                    isCorrect && "border-emerald-500 bg-emerald-50",
                    isWrong && "border-red-400 bg-red-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{zone.label}</span>
                    <div className="flex items-center gap-2">
                      {!showResults && onRequestHelp && (
                        <Popover onOpenChange={(open) => {
                          if (isTipDisabled) return;
                          setActiveHelpZone(open ? zone.id : null);
                          if (!helpContent && open) onRequestHelp(zone.id);
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-2"
                                  onClick={() => setActiveHelpZone(zone.id)}
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Show Highlights
                                </Button>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      )}
                      
                      {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {showResults && isWrong && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>
                  
                  {droppedItem && (
                    <div 
                      className={cn(
                        "mt-2 px-3 py-2 bg-white border border-slate-300 rounded-lg inline-flex items-center gap-2",
                        !showResults && "cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                      )}
                      draggable={!showResults}
                      onDragStart={(e) => handleDragStart(e, droppedItem, zone.id)}
                      onDragEnd={() => setDraggedItem(null)}
                    >
                      {!showResults && <GripVertical className="w-4 h-4 text-slate-400" />}
                      {droppedItem}
                    </div>
                  )}
                  
                  {showResults && isWrong && (
                    <div className="mt-2 text-xs text-slate-600">
                      Correct: <span className="font-medium">{zone.correctAnswer}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}