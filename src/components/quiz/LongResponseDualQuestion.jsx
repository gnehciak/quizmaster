import React from 'react';
import { Textarea } from '@/components/ui/textarea';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

export default function LongResponseDualQuestion({
  question,
  selectedAnswer,
  onAnswer,
  showResults,
  isAdmin
}) {
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleChange = (e) => {
    if (showResults && !isAdmin) return;
    onAnswer(e.target.value);
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

  return (
    <div ref={containerRef} className="h-full flex relative bg-white">
      {/* Left Pane - Content/Question */}
      <div className="overflow-y-auto bg-slate-50 flex flex-col border-r border-slate-200" style={{ width: `${leftWidth}%` }}>
        <div className="flex-1 px-8 py-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200 h-full shadow-sm">
            <div 
              className="prose prose-slate max-w-none text-slate-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: question.question || '' }}
            />
          </div>
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "w-1 bg-slate-300 hover:bg-indigo-500 cursor-col-resize relative group transition-colors flex-shrink-0 z-10",
          isDragging && "bg-indigo-500"
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-400 group-hover:bg-indigo-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Right Pane - Answer Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Your Response</h3>
          {question.marking_criteria && (
            <div className="mt-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
               <span className="font-medium text-slate-700 block mb-1">Marking Criteria:</span> 
               <p>{question.marking_criteria}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 p-6 flex flex-col">
          <Textarea
            value={selectedAnswer || ''}
            onChange={handleChange}
            placeholder="Type your extended response here..."
            className="flex-1 w-full resize-none border-slate-200 focus-visible:ring-indigo-500 p-4 text-base leading-relaxed shadow-sm bg-white"
            disabled={showResults && !isAdmin}
          />
          <div className="mt-2 text-xs text-slate-400 text-right">
            {(selectedAnswer || '').length} characters
          </div>
        </div>
      </div>
    </div>
  );
}