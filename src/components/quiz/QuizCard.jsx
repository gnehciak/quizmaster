import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, FileEdit, Trash2, FileQuestion, Clock, Signal, Download, BarChart3, Copy, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

export default function QuizCard({ quiz, onDelete, onEdit, onExport, index }) {
  const questionCount = quiz.questions?.length || 0;
  
  const getQuestionTypes = () => {
    if (!quiz.questions) return [];
    const types = new Set(quiz.questions.map(q => q.type));
    return Array.from(types);
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You might want to add a toast here if available, but for now simple copy
  };

  const typeLabels = {
    multiple_choice: 'Multiple Choice',
    reading_comprehension: 'Reading',
    drag_drop_single: 'Drag & Drop (Single)',
    drag_drop_dual: 'Drag & Drop (Dual)',
    inline_dropdown_separate: 'Fill in Blanks (Separate)',
    inline_dropdown_same: 'Fill in Blanks (Same)',
    matching_list_dual: 'Matching List'
  };

  const typeColors = {
    multiple_choice: 'bg-blue-100 text-blue-700',
    reading_comprehension: 'bg-violet-100 text-violet-700',
    drag_drop_single: 'bg-amber-100 text-amber-700',
    drag_drop_dual: 'bg-amber-100 text-amber-700',
    inline_dropdown_separate: 'bg-emerald-100 text-emerald-700',
    inline_dropdown_same: 'bg-emerald-100 text-emerald-700',
    matching_list_dual: 'bg-pink-100 text-pink-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900/70">
              {quiz.category || 'General'}
            </span>
          </div>
          
          <Badge 
            variant={quiz.status === 'published' ? 'default' : 'secondary'}
            className={cn(
              "text-[10px] px-2 py-0.5 h-5",
              quiz.status === 'published' 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            {quiz.status || 'draft'}
          </Badge>
        </div>

        <div className="flex-1 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {quiz.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-3 group/id">
            <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
              ID: {quiz.id.substring(0, 8)}...{quiz.id.substring(quiz.id.length - 4)}
            </code>
            <button 
              onClick={(e) => {
                e.preventDefault();
                copyToClipboard(quiz.id);
              }}
              className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
              title="Copy ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          {quiz.description && (
            <p className="text-slate-600 text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
              {stripHtml(quiz.description)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-4 h-4" />
            <span>{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
          </div>
          
          {quiz.timer_enabled && quiz.timer_duration && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Clock className="w-4 h-4" />
              <span>{quiz.timer_duration} min</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 min-h-[24px]">
          {getQuestionTypes().slice(0, 2).map(type => (
            <Badge 
              key={type} 
              variant="secondary"
              className={cn("text-[10px] px-2 py-0.5 h-6", typeColors[type])}
            >
              {typeLabels[type]}
            </Badge>
          ))}
          {getQuestionTypes().length > 2 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-6 bg-slate-100 text-slate-600">
              +{getQuestionTypes().length - 2} more
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          <Button 
            onClick={() => onEdit(quiz)}
            className="col-span-2 gap-2 bg-slate-900 hover:bg-slate-800 text-white h-9"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Edit
          </Button>

          <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)} className="col-span-1">
            <Button 
              variant="outline"
              className="w-full gap-2 h-9 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
              disabled={questionCount === 0}
              title="Start Quiz"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)} className="col-span-1">
            <Button 
              variant="outline" 
              className="w-full h-9 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
              title="Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <div className="col-span-1 relative group/menu">
            <Button 
              variant="outline" 
              className="w-full h-9 hover:bg-slate-50"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
            {/* Simple CSS hover dropdown for extra actions */}
            <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-10">
              <button 
                onClick={() => onExport?.(quiz)}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md flex items-center gap-2"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button 
                onClick={() => onDelete(quiz.id)}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}