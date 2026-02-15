import React from 'react';
import { useLazyQuiz, QuizLoadingPlaceholder } from './LazyQuizLoader';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  PlayCircle, Clock, Lock, Pencil, BarChart3, RotateCcw, Pause
} from 'lucide-react';

export default function QuizBlockContent({ block, isAdmin, hasAccess, editMode, allQuizAttempts }) {
  const { ref, quiz, loading } = useLazyQuiz(block.quiz_id);

  if (!quiz) {
    return (
      <div ref={ref}>
        {loading ? (
          <QuizLoadingPlaceholder />
        ) : (
          <div className="p-4 bg-red-50 text-red-500 rounded-lg">Quiz not found</div>
        )}
      </div>
    );
  }

  const attempts = allQuizAttempts?.filter(a => a.quiz_id === quiz.id) || [];
  const pausedAttempt = attempts.find(a => a.paused === true);
  const completedAttempts = attempts.filter(a => a.completed === true || (!a.hasOwnProperty('completed') && !a.paused));
  const attemptsAllowed = quiz.attempts_allowed || 999;
  const attemptsUsed = completedAttempts.length;
  const sortedAttempts = completedAttempts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const latestAttempt = sortedAttempts[0];
  const hasCompleted = !!latestAttempt;
  const canRetry = hasCompleted && (attemptsUsed < attemptsAllowed);

  return (
    <div ref={ref} className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors w-full">
      <div className="flex-shrink-0">
        {hasCompleted && (hasAccess || isAdmin) ? (
          (() => {
            const pct = latestAttempt.percentage || 0;
            const bgColor = pct >= 80 ? 'bg-emerald-100' : pct >= 60 ? 'bg-lime-100' : pct >= 40 ? 'bg-amber-100' : pct >= 20 ? 'bg-orange-100' : 'bg-red-100';
            const borderColor = pct >= 80 ? 'border-emerald-200' : pct >= 60 ? 'border-lime-200' : pct >= 40 ? 'border-amber-200' : pct >= 20 ? 'border-orange-200' : 'border-red-200';
            const textColor = pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-lime-700' : pct >= 40 ? 'text-amber-700' : pct >= 20 ? 'text-orange-700' : 'text-red-700';
            return (
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2", bgColor, borderColor)}>
                <span className={cn("text-sm font-bold", textColor)}>{pct}%</span>
              </div>
            );
          })()
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-indigo-100">
            <PlayCircle className="w-6 h-6 text-indigo-500" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 text-lg">{quiz.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
          <span>{quiz.questions?.length || 0} questions</span>
          {quiz.timer_enabled && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {quiz.timer_duration}m
            </span>
          )}
          {quiz.pausable && (
            <Badge variant="secondary" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
              <Pause className="w-3 h-3 mr-1" />
              Pausable
            </Badge>
          )}
          {attemptsAllowed < 999 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {Math.max(0, attemptsAllowed - attemptsUsed)} attempts left
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin ? (
          <>
            <Link to={createPageUrl(`QuizAttempts?id=${quiz.id}`)}>
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-3 h-3" /> Stats
              </Button>
            </Link>
            {hasCompleted && (
              <Link to={createPageUrl(`ReviewAnswers?id=${quiz.id}&courseId=${block.courseId || ''}&attemptId=${latestAttempt.id}`)}>
                <Button variant="outline" size="sm">Review</Button>
              </Link>
            )}
            <Link to={createPageUrl(`CreateQuiz?id=${quiz.id}`)}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            </Link>
            {pausedAttempt ? (
              <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}&resumeAttemptId=${pausedAttempt.id}`)}>
                <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
                  <RotateCcw className="w-3 h-3" /> Resume
                </Button>
              </Link>
            ) : (
              <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                <Button size="sm">Start</Button>
              </Link>
            )}
          </>
        ) : (
          <>
            {hasAccess ? (
              <>
                {hasCompleted && (
                  <Link to={createPageUrl(`ReviewAnswers?id=${quiz.id}&courseId=${block.courseId || ''}&attemptId=${latestAttempt.id}`)}>
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                )}
                {pausedAttempt ? (
                  <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}&resumeAttemptId=${pausedAttempt.id}`)}>
                    <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
                      <RotateCcw className="w-3 h-3" /> Resume Quiz
                    </Button>
                  </Link>
                ) : canRetry ? (
                  <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                    <Button size="sm" className="gap-2">
                      <RotateCcw className="w-3 h-3" /> Retry
                    </Button>
                  </Link>
                ) : !hasCompleted ? (
                  <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}&courseId=${block.courseId || ''}`)}>
                    <Button size="sm">Start</Button>
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </>
        )}

        {isAdmin && editMode && (
          <div className="flex items-center gap-1 text-xs text-slate-400 border px-2 py-1 rounded bg-slate-50">
            ID: {quiz.id.substring(0, 6)}...
          </div>
        )}
      </div>
    </div>
  );
}