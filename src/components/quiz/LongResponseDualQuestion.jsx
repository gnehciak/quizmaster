import React from 'react';
import { Textarea } from '@/components/ui/textarea';

export default function LongResponseDualQuestion({
  question,
  selectedAnswer,
  onAnswer,
  showResults,
  isAdmin
}) {
  const handleChange = (e) => {
    if (showResults && !isAdmin) return;
    onAnswer(e.target.value);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden max-w-7xl mx-auto">
      {/* Left Pane - Content/Question */}
      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
        <div 
          className="prose prose-slate max-w-none prose-img:rounded-lg prose-headings:text-slate-800"
          dangerouslySetInnerHTML={{ __html: question.question || '' }}
        />
      </div>

      {/* Right Pane - Answer Area */}
      <div className="flex-1 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Your Response</h3>
          {question.marking_criteria && (
            <div className="mt-2 text-xs text-slate-500 bg-white p-2 rounded border border-slate-200">
               <span className="font-medium text-slate-700">Marking Criteria:</span> 
               <p className="mt-1">{question.marking_criteria}</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 p-4 flex flex-col">
          <Textarea
            value={selectedAnswer || ''}
            onChange={handleChange}
            placeholder="Type your extended response here..."
            className="flex-1 w-full resize-none border-slate-200 focus-visible:ring-indigo-500 p-4 text-base leading-relaxed"
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