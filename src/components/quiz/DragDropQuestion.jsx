import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GripVertical, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DragDropQuestion({ 
  question, 
  selectedAnswers = {}, 
  onAnswer, 
  showResults 
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  
  // Get all used answers
  const usedAnswers = Object.values(selectedAnswers);
  
  // Available options (not yet placed)
  const availableOptions = question.options.filter(opt => !usedAnswers.includes(opt));

  const handleDragStart = (e, option) => {
    if (showResults) return;
    setDraggedItem(option);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, zoneId) => {
    e.preventDefault();
    if (showResults || !draggedItem) return;
    
    // Remove from previous zone if exists
    const newAnswers = { ...selectedAnswers };
    Object.keys(newAnswers).forEach(key => {
      if (newAnswers[key] === draggedItem) {
        delete newAnswers[key];
      }
    });
    
    // Add to new zone
    newAnswers[zoneId] = draggedItem;
    onAnswer(newAnswers);
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium text-slate-800 leading-relaxed">
          {question.question}
        </h3>
        
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
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60">
        <p className="text-sm text-slate-500 mb-4 font-medium">
          Drag items to their correct positions:
        </p>
        
        <div className="flex flex-wrap gap-3">
          <AnimatePresence mode="popLayout">
            {availableOptions.map((option) => (
              <motion.div
                key={option}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                draggable={!showResults}
                onDragStart={(e) => handleDragStart(e, option)}
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
      <div className="grid gap-4 sm:grid-cols-2">
        {question.dropZones?.map((zone) => {
          const placedAnswer = selectedAnswers[zone.id];
          const isCorrect = showResults && placedAnswer === zone.correctAnswer;
          const isWrong = showResults && placedAnswer && placedAnswer !== zone.correctAnswer;
          const showCorrectAnswer = showResults && !isCorrect;
          
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
                
                {showResults && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {showResults && isWrong && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              {placedAnswer ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl flex items-center justify-between gap-2",
                    !showResults && "bg-white border border-indigo-200",
                    isCorrect && "bg-emerald-100 border border-emerald-300",
                    isWrong && "bg-red-100 border border-red-300"
                  )}
                >
                  <span className={cn(
                    "font-medium",
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
              
              {showCorrectAnswer && (
                <p className="mt-2 text-xs text-emerald-600 font-medium">
                  Correct: {zone.correctAnswer}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}