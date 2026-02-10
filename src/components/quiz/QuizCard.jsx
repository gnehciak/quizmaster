import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, FileEdit, Trash2, FileQuestion, Clock, Signal, Download, BarChart3, Copy, MoreHorizontal, Check, X, Sparkles, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Users, GraduationCap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TimeEditor, FeaturesEditor, AttemptsEditor } from '@/components/quiz/QuizCardEditors';
import { Brain, RefreshCw } from 'lucide-react';

export default function QuizCard({ quiz, onDelete, onEdit, onExport, index, viewMode = 'card', attempts = [], courses = [] }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(quiz.title);
  const queryClient = useQueryClient();
  
  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== quiz.title) {
      await base44.entities.Quiz.update(quiz.id, { title: editedTitle });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    }
    setIsEditingTitle(false);
  };
  
  const handleCancelEdit = () => {
    setEditedTitle(quiz.title);
    setIsEditingTitle(false);
  };

  // Data passed from parent to avoid N+1 queries

  const attemptCount = attempts?.length || 0;
  const averageScore = attempts?.length 
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attempts.length)
    : 0;
  
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const typeLabels = {
    multiple_choice: 'Multiple Choice',
    reading_comprehension: 'Reading',
    drag_drop_single: 'Drag & Drop (Single)',
    drag_drop_dual: 'Drag & Drop (Dual)',
    inline_dropdown_separate: 'Fill in Blanks (Separate)',
    inline_dropdown_same: 'Fill in Blanks (Same)',
    matching_list_dual: 'Matching List',
    long_response_dual: 'Long Response',
    information: 'Information'
  };

  const typeColors = {
    multiple_choice: 'bg-blue-100 text-blue-700',
    reading_comprehension: 'bg-violet-100 text-violet-700',
    drag_drop_single: 'bg-amber-100 text-amber-700',
    drag_drop_dual: 'bg-amber-100 text-amber-700',
    inline_dropdown_separate: 'bg-emerald-100 text-emerald-700',
    inline_dropdown_same: 'bg-emerald-100 text-emerald-700',
    matching_list_dual: 'bg-pink-100 text-pink-700',
    long_response_dual: 'bg-cyan-100 text-cyan-700',
    information: 'bg-slate-100 text-slate-700'
  };

  if (viewMode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-800 truncate">{quiz.title}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {quiz.category && (
                  <span>{quiz.category}</span>
                )}
                {quiz.status === 'published' ? (
                  <span className="text-emerald-600">• Published</span>
                ) : (
                  <span className="text-amber-600">• Draft</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Play className="w-4 h-4" />
              </Button>
            </Link>
            <Button onClick={() => onEdit(quiz)} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <FileEdit className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <BarChart3 className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              onClick={() => onDelete(quiz.id)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
      >
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-slate-800">{quiz.title}</h3>
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
            
            {quiz.description && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-1">{stripHtml(quiz.description)}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {quiz.category && (
                <Badge variant="outline" className="text-xs">
                  {quiz.category}
                </Badge>
              )}
              {quiz.timer_enabled && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {quiz.timer_duration}m
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)}>
              <Button variant="outline" size="sm" className="gap-2">
                <Play className="w-3.5 h-3.5" /> Start
              </Button>
            </Link>
            <Button onClick={() => onEdit(quiz)} variant="outline" size="sm" className="gap-2">
              <FileEdit className="w-3.5 h-3.5" /> Edit
            </Button>
            <div className="relative group/menu">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block min-w-[140px] bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-10">
                <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)}>
                  <button className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" /> Analytics
                  </button>
                </Link>
                <button onClick={() => onExport?.(quiz)} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md flex items-center gap-2">
                  <Download className="w-3 h-3" /> Export
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button onClick={() => onDelete(quiz.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden"
    >
      {/* Card Header: Category & Status */}
      <div className="px-4 pt-4 flex justify-between items-start mb-2 gap-2">
        <Badge variant="outline" className="font-normal text-[10px] text-slate-600 bg-slate-50 border-slate-200 flex items-center gap-1.5 py-0.5 px-2 max-w-[60%]">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", quiz.status === 'published' ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="truncate">{quiz.category || 'General'}</span>
        </Badge>
        
        <div className="flex items-center gap-2 shrink-0">
           {quiz.status === 'published' && (
             <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Published</span>
           )}
           {quiz.status !== 'published' && (
             <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Draft</span>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 flex-1 flex flex-col">
        {/* Title Section */}
        <div className="mb-2">
          {isEditingTitle ? (
            <div className="flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
              <textarea
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveTitle();
                  }
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 text-sm font-bold text-slate-900 bg-white border border-indigo-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm resize-none"
                rows={2}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSaveTitle(); }}
                  className="h-6 w-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                  className="h-6 w-6 rounded-md bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="group/title relative">
              <h3 className="text-base font-bold text-slate-900 leading-tight line-clamp-2 pr-6">
                {quiz.title}
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                className="absolute top-0 right-0 p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover/title:opacity-100 transition-all"
              >
                <FileEdit className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {quiz.description && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <p className="text-slate-500 text-xs line-clamp-1 mb-3 cursor-help">
                {stripHtml(quiz.description)}
              </p>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <p className="text-sm text-slate-700">{stripHtml(quiz.description)}</p>
            </HoverCardContent>
          </HoverCard>
        )}
        
        {!quiz.description && <div className="h-4 mb-3" />}

        <div className="mt-auto" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 border-y border-slate-100 mt-2">
        <TimeEditor quiz={quiz}>
          <div className="bg-white p-2 flex flex-col items-center justify-center gap-0.5 group/stat hover:bg-indigo-50 transition-colors cursor-pointer">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Time</div>
            <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
              <Clock className="w-3 h-3 text-amber-500" />
              {quiz.timer_enabled && quiz.timer_duration ? `${quiz.timer_duration}m` : '∞'}
            </div>
          </div>
        </TimeEditor>

        <FeaturesEditor quiz={quiz}>
          <div className="bg-white p-2 flex flex-col items-center justify-center gap-0.5 group/stat hover:bg-indigo-50 transition-colors cursor-pointer">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Features</div>
            <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
              {quiz.pausable && <Pause className="w-3 h-3 text-blue-500" />}
              {quiz.allow_tips && <Sparkles className="w-3 h-3 text-purple-500" />}
              {quiz.ai_explanation_enabled !== false && <Brain className="w-3 h-3 text-teal-500" />}
              {!quiz.pausable && !quiz.allow_tips && quiz.ai_explanation_enabled === false && <span className="text-slate-400">—</span>}
            </div>
          </div>
        </FeaturesEditor>
        
        <AttemptsEditor quiz={quiz}>
          <div className="bg-white p-2 flex flex-col items-center justify-center gap-0.5 group/stat hover:bg-indigo-50 transition-colors cursor-pointer">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Attempts</div>
            <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
              <RefreshCw className="w-3 h-3 text-emerald-500" />
              {quiz.attempts_allowed && quiz.attempts_allowed < 999 ? quiz.attempts_allowed : '∞'}
            </div>
          </div>
        </AttemptsEditor>

        <div className="bg-white p-2 flex flex-col items-center justify-center gap-0.5 group/stat hover:bg-slate-50 transition-colors">
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Avg Score</div>
          <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <GraduationCap className="w-3 h-3 text-purple-500" />
            {averageScore}%
          </div>
        </div>

        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="bg-white p-2 flex flex-col items-center justify-center gap-0.5 group/stat hover:bg-slate-50 transition-colors cursor-help">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Courses</div>
              <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs">
                <BookOpen className="w-3 h-3 text-blue-500" />
                {courses?.length || 0}
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-64" side="top" align="end">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Course Usage</h4>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{courses?.length || 0}</span>
              </div>
              {courses?.length > 0 ? (
                <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                  {courses.map(course => (
                    <Link 
                      key={course.id} 
                      to={createPageUrl(`CourseDetail?id=${course.id}`)}
                      className="text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-1.5 rounded transition-colors truncate flex items-center gap-2"
                    >
                      <BookOpen className="w-3 h-3 flex-shrink-0" />
                      {course.title}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Not used in any courses yet.</p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-white flex items-center gap-2">
        <Button 
          onClick={() => onEdit(quiz)}
          variant="default"
          size="sm"
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-8 text-xs font-medium"
        >
          Edit Quiz
        </Button>
        
        <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)}>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
            title="Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
        </Link>
        
        <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)}>
          <Button 
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
            title="Preview / Start"
          >
            <Play className="w-4 h-4" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 data-[state=open]:bg-slate-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => {
              copyToClipboard(quiz.id);
              toast.success('ID copied to clipboard');
            }}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.(quiz)}>
              <Download className="w-3.5 h-3.5 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(quiz.id)}
              className="text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Quiz
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}