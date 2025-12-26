import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, GripVertical, Loader2, Sparkles, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReadingComprehensionQuestion({ 
  question, 
  selectedAnswer,
  selectedAnswers = {}, 
  onAnswer, 
  showResults,
  singleQuestion = false,
  subQuestion = null,
  highlightedPassages = {},
  aiHelperContent = '',
  aiHelperLoading = false,
  onRequestHelp = null,
  onRegenerateHelp = null,
  onDeleteHelp = null,
  isAdmin = false,
  tipsAllowed = 999,
  tipsUsed = 0,
  tipOpened = false,
  onRequestExplanation = null,
  onRegenerateExplanation = null,
  onDeleteExplanation = null,
  openedExplanations = new Set()
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
      
      // Constrain between 30% and 70%
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

  // Keyboard shortcuts for answer selection (1-4 keys)
  useEffect(() => {
    if (showResults) return;

    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      const options = singleQuestion ? subQuestion?.options : question.comprehensionQuestions?.[0]?.options;
      
      if (!options) return;

      // Numbers 1-4 for answer selection
      if (key >= '1' && key <= '4') {
        const index = parseInt(key) - 1;
        if (index < options.length) {
          onAnswer(options[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResults, singleQuestion, subQuestion, question, onAnswer]);

  return (
    <div ref={containerRef} className="h-full flex relative">
      {/* Left Pane - Passage */}
      <div className="overflow-y-auto bg-slate-50 flex flex-col" style={{ width: `${leftWidth}%` }}>
        {/* Sticky Header */}
        <div className="sticky top-0 bg-slate-50 z-10 px-8 pt-8 pb-4 border-b border-slate-200">
          <div 
            className="text-sm text-slate-600 mb-4 prose prose-slate max-w-none prose-p:my-0"
            dangerouslySetInnerHTML={{ __html: question.question || "Using the passage below, read and answer the questions opposite." }}
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
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: highlightedPassages[activePassage?.id] || activePassage?.content }}
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

      {/* Right Pane - Questions */}
      <div className="overflow-y-auto flex-1 p-8">
        <div className="max-w-2xl space-y-8">
          {singleQuestion && subQuestion ? (
            <div className="space-y-3">
              {showResults && (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <X className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Not Attempted</span>
                </div>
              )}
              <div 
                className="font-medium text-slate-800 text-base prose prose-slate max-w-none prose-p:my-0"
                dangerouslySetInnerHTML={{ __html: subQuestion.question }}
              />
              
              <div className="space-y-2">
                {subQuestion.options.map((option, optIdx) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = showResults && option === subQuestion.correctAnswer;
                  const isWrong = showResults && isSelected && option !== subQuestion.correctAnswer;
                  
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleAnswer(subQuestion.id, option)}
                      disabled={showResults}
                      className={cn(
                        "w-full p-4 rounded-lg text-left transition-all",
                        "border-2 flex items-center gap-3 group",
                        !showResults && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        !showResults && isSelected && "border-slate-800 bg-slate-50",
                        isCorrect && "border-emerald-500 bg-emerald-50",
                        isWrong && "border-red-400 bg-red-50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        !showResults && !isSelected && "border-slate-300 group-hover:border-slate-400",
                        !showResults && isSelected && "border-slate-800 bg-slate-800",
                        isCorrect && "border-emerald-500 bg-emerald-500",
                        isWrong && "border-red-500 bg-red-500"
                      )}>
                        {(isSelected || isCorrect || isWrong) && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      
                      <span className={cn(
                        "text-sm flex-1",
                        isCorrect && "text-emerald-700 font-medium",
                        isWrong && "text-red-600",
                        !showResults && isSelected && "text-slate-800 font-medium"
                      )}>
                        {option}
                      </span>
                      
                      {!showResults && optIdx < 4 && (
                        <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-200 text-slate-600 rounded border border-slate-300">
                          {optIdx + 1}
                        </kbd>
                      )}
                      
                      {showResults && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      )}
                      {showResults && isWrong && (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {showResults && subQuestion.explanation && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
                  <div 
                    className="text-sm text-blue-800 prose prose-slate max-w-none prose-p:my-0"
                    dangerouslySetInnerHTML={{ __html: subQuestion.explanation }}
                  />
                </div>
              )}



              {!showResults && !aiHelperLoading && !aiHelperContent && onRequestHelp && (
                <div className="mt-4">
                  <Button
                    onClick={onRequestHelp}
                    disabled={!isAdmin && !tipOpened && tipsAllowed !== 999 && tipsUsed >= tipsAllowed}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    I need help
                  </Button>
                </div>
              )}

              {aiHelperLoading && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin mr-2" />
                  <span className="text-sm text-slate-600">{showResults ? 'Loading explanation...' : 'Loading help...'}</span>
                </div>
              )}

              {!aiHelperLoading && aiHelperContent && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg relative">
                  <div 
                    className="text-sm text-slate-700 leading-relaxed prose prose-slate max-w-none prose-p:my-0"
                    dangerouslySetInnerHTML={{ __html: aiHelperContent }}
                  />
                  {isAdmin && ((showResults && (onRegenerateExplanation || onDeleteExplanation)) || (!showResults && (onRegenerateHelp || onDeleteHelp))) && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {showResults && onDeleteExplanation && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onDeleteExplanation}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete explanation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {!showResults && onDeleteHelp && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onDeleteHelp}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete AI tip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {showResults && onRegenerateExplanation && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onRegenerateExplanation}
                          disabled={aiHelperLoading}
                          className="h-8 w-8 p-0"
                          title="Regenerate explanation"
                        >
                          {aiHelperLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {!showResults && onRegenerateHelp && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onRegenerateHelp}
                          disabled={aiHelperLoading}
                          className="h-8 w-8 p-0"
                          title="Regenerate AI tip"
                        >
                          {aiHelperLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              </div>
          ) : (
            question.comprehensionQuestions?.map((q, qIdx) => (
              <div key={q.id} className="space-y-3">
                <div 
                  className="font-medium text-slate-800 text-base prose prose-slate max-w-none prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: q.question }}
                />
                
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[q.id] === option;
                    const isCorrect = showResults && option === q.correctAnswer;
                    const isWrong = showResults && isSelected && option !== q.correctAnswer;
                    
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswer(q.id, option)}
                        disabled={showResults}
                        className={cn(
                          "w-full p-4 rounded-lg text-left transition-all",
                          "border-2 flex items-center gap-3 group",
                          !showResults && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          !showResults && isSelected && "border-slate-800 bg-slate-50",
                          isCorrect && "border-emerald-500 bg-emerald-50",
                          isWrong && "border-red-400 bg-red-50"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          !showResults && !isSelected && "border-slate-300 group-hover:border-slate-400",
                          !showResults && isSelected && "border-slate-800 bg-slate-800",
                          isCorrect && "border-emerald-500 bg-emerald-500",
                          isWrong && "border-red-500 bg-red-500"
                        )}>
                          {(isSelected || isCorrect || isWrong) && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        
                        <span className={cn(
                          "text-sm flex-1",
                          isCorrect && "text-emerald-700 font-medium",
                          isWrong && "text-red-600",
                          !showResults && isSelected && "text-slate-800 font-medium"
                        )}>
                          {option}
                        </span>
                        
                        {!showResults && optIdx < 4 && (
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-200 text-slate-600 rounded border border-slate-300">
                            {optIdx + 1}
                          </kbd>
                        )}
                        
                        {showResults && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        )}
                        {showResults && isWrong && (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}