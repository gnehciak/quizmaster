import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, FileEdit, Trash2, FileQuestion, Clock, Signal, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

export default function QuizCard({ quiz, onDelete, onEdit, onExport, index }) {
  const questionCount = quiz.questions?.length || 0;
  
  const getQuestionTypes = () => {
    if (!quiz.questions) return [];
    const types = new Set(quiz.questions.map(q => q.type));
    return Array.from(types);
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
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-100">
              <Lightbulb className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {quiz.category || 'Uncategorized'}
            </span>
          </div>
          
          <Badge 
            variant={quiz.status === 'published' ? 'default' : 'secondary'}
            className={cn(
              quiz.status === 'published' 
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {quiz.status || 'draft'}
          </Badge>
        </div>

        <div className="flex-1 mb-4">
          <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
            {quiz.title}
          </h3>
          {quiz.description && (
            <p className="text-slate-500 text-sm line-clamp-2">
              {quiz.description}
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

        <div className="flex flex-wrap gap-2 mb-6">
          {getQuestionTypes().map(type => (
            <Badge 
              key={type} 
              variant="secondary"
              className={cn("text-xs", typeColors[type])}
            >
              {typeLabels[type]}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)} className="flex-1">
            <Button 
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
              disabled={questionCount === 0}
            >
              <Play className="w-4 h-4" />
              Start Quiz
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onExport?.(quiz)}
            className="hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
            title="Export Quiz"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onEdit(quiz)}
            className="hover:bg-indigo-50 hover:border-indigo-300"
          >
            <FileEdit className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onDelete(quiz.id)}
            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}