import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, GripVertical } from 'lucide-react';
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
  highlightedText = ''
}) {
  const passages = question.passages?.length > 0 
    ? question.passages 
    : [{ id: 'main', title: 'Passage', content: question.passage }];

  const highlightPassageText = (text) => {
    if (!highlightedText || !text) return text;
    
    const cleanText = text.replace(/<[^>]*>/g, '');
    const cleanHighlight = highlightedText.trim();
    
    if (!cleanText.includes(cleanHighlight)) return text;
    
    const regex = new RegExp(`(${cleanHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };
  
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
              dangerouslySetInnerHTML={{ __html: highlightPassageText(activePassage?.content) }}
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
          {question.rightPaneQuestion && (
            <div 
              className="text-base text-slate-700 mb-6 prose prose-slate max-w-none prose-p:my-0"
              dangerouslySetInnerHTML={{ __html: question.rightPaneQuestion }}
            />
          )}

          <div className="space-y-3">
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
                      {showResults && isWrong && (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
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