import React from 'react';
import { Info } from 'lucide-react';

export default function InformationQuestion({ question }) {
  return (
    <div className="h-full flex items-start justify-center overflow-y-auto p-6">
      <div className="max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          {question.question && (
            <div 
              className="text-xl font-bold text-slate-800 prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: question.question }}
            />
          )}
        </div>
        
        {question.passage && (
          <div 
            className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-blue-50/50 border border-blue-100 rounded-xl p-6"
            dangerouslySetInnerHTML={{ __html: question.passage }}
          />
        )}

        {question.passages?.length > 0 && (
          <div className="space-y-4">
            {question.passages.map((passage, idx) => (
              <div key={passage.id || idx} className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                {passage.title && (
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">{passage.title}</h3>
                )}
                <div 
                  className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: passage.content }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}