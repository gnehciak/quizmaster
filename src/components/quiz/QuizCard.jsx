import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, FileEdit, Trash2, FileQuestion, Clock, Signal, Download, BarChart3, Copy, MoreHorizontal, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Users, GraduationCap, BookOpen } from 'lucide-react';

export default function QuizCard({ quiz, onDelete, onEdit, onExport, index, viewMode = 'card' }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(quiz.title);
  const queryClient = useQueryClient();
  const questionCount = quiz.questions?.length || 0;
  
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

  const { data: attempts } = useQuery({
    queryKey: ['quizAttempts', quiz.id],
    queryFn: () => base44.entities.QuizAttempt.filter({ quiz_id: quiz.id }),
  });

  const { data: courses } = useQuery({
    queryKey: ['quizCourses', quiz.id],
    queryFn: () => base44.entities.Course.filter({ quiz_ids: quiz.id }),
  });

  const attemptCount = attempts?.length || 0;
  const averageScore = attempts?.length 
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attempts.length)
    : 0;
  
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
  };

  const typeLabels = {
    multiple_choice: 'Multiple Choice',
    reading_comprehension: 'Reading',
    drag_drop_single: 'Drag & Drop (Single)',
    drag_drop_dual: 'Drag & Drop (Dual)',
    inline_dropdown_separate: 'Fill in Blanks (Separate)',
    inline_dropdown_same: 'Fill in Blanks (Same)',
    matching_list_dual: 'Matching List',
    long_response_dual: 'Long Response'
  };

  const typeColors = {
    multiple_choice: 'bg-blue-100 text-blue-700',
    reading_comprehension: 'bg-violet-100 text-violet-700',
    drag_drop_single: 'bg-amber-100 text-amber-700',
    drag_drop_dual: 'bg-amber-100 text-amber-700',
    inline_dropdown_separate: 'bg-emerald-100 text-emerald-700',
    inline_dropdown_same: 'bg-emerald-100 text-emerald-700',
    matching_list_dual: 'bg-pink-100 text-pink-700',
    long_response_dual: 'bg-cyan-100 text-cyan-700'
  };

  if (viewMode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {questionCount}
            </div>
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
      >
        <div className="flex gap-6">
          <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-indigo-600">{questionCount}</span>
              <span className="text-[10px] text-indigo-400 font-medium">Q</span>
            </div>
          </div>

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
              <Button variant="outline" size="sm" className="gap-2" disabled={questionCount === 0}>
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
            {isEditingTitle ? (
              <div className="flex items-start gap-2 flex-1 animate-in fade-in zoom-in-95 duration-200">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="flex-1 text-lg font-bold text-slate-800 bg-white border border-indigo-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSaveTitle(); }}
                    className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                    className="h-8 w-8 rounded-md bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
                  {quiz.title}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(true)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
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
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 ml-1">
            <div className="flex items-center gap-1.5" title="Total Attempts">
              <Users className="w-3.5 h-3.5" />
              <span>{attemptCount}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Average Score">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{averageScore}%</span>
            </div>
          </div>

          <div className="ml-auto">
             <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help hover:text-indigo-600 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{courses?.length || 0}</span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-64">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900">Used in Courses</h4>
                  {courses?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {courses.map(course => (
                        <Link 
                          key={course.id} 
                          to={createPageUrl(`CourseDetail?id=${course.id}`)}
                          className="text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-50 p-1.5 rounded transition-colors truncate"
                        >
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
        </div>

        <div className="flex flex-wrap gap-2 mb-6 min-h-[24px]">
          {getQuestionTypes().map(type => (
            <Badge 
              key={type} 
              variant="secondary"
              className={cn("text-[10px] px-2 py-0.5 h-6", typeColors[type])}
            >
              {typeLabels[type]}
            </Badge>
          ))}
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