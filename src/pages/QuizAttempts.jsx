import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  Calendar,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function QuizAttempts() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        return null;
      }
    },
  });

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['quizAttempts', quizId],
    queryFn: () => base44.entities.QuizAttempt.filter({ quiz_id: quizId }),
    enabled: !!quizId
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  // Calculate stats
  const stats = React.useMemo(() => {
    if (attempts.length === 0) return null;

    const totalAttempts = attempts.length;
    const uniqueUsers = new Set(attempts.map(a => a.user_email)).size;
    const averageScore = attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts;
    const passRate = (attempts.filter(a => a.percentage >= 70).length / totalAttempts) * 100;
    const averageTime = attempts.reduce((acc, a) => acc + (a.time_taken || 0), 0) / totalAttempts;

    // Score distribution
    const scoreRanges = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0
    };

    attempts.forEach(a => {
      if (a.percentage <= 20) scoreRanges['0-20%']++;
      else if (a.percentage <= 40) scoreRanges['21-40%']++;
      else if (a.percentage <= 60) scoreRanges['41-60%']++;
      else if (a.percentage <= 80) scoreRanges['61-80%']++;
      else scoreRanges['81-100%']++;
    });

    // Top performers
    const topPerformers = [...attempts]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    // Recent attempts
    const recentAttempts = [...attempts]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 20);

    return {
      totalAttempts,
      uniqueUsers,
      averageScore: averageScore.toFixed(1),
      passRate: passRate.toFixed(1),
      averageTime: Math.round(averageTime),
      scoreRanges,
      topPerformers,
      recentAttempts
    };
  }, [attempts]);

  if (userLoading || quizLoading || attemptsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Quiz not found</h2>
          <Link to={createPageUrl('ManageQuizzes')}>
            <Button>Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-4">Only admins can view quiz analytics</p>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl('ManageQuizzes')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>
              <p className="text-sm text-slate-600">Quiz Analytics & Attempts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* No attempts state */}
        {attempts.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">No attempts yet</h2>
            <p className="text-slate-600">This quiz hasn't been attempted by any users yet.</p>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Attempts */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-indigo-500" />
                  <Badge variant="secondary" className="text-xs">Total</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {stats.totalAttempts}
                </div>
                <div className="text-sm text-slate-600">Attempts</div>
              </div>

              {/* Unique Users */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-purple-500" />
                  <Badge variant="secondary" className="text-xs">Users</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {stats.uniqueUsers}
                </div>
                <div className="text-sm text-slate-600">Unique Users</div>
              </div>

              {/* Average Score */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-amber-500" />
                  <Badge variant="secondary" className="text-xs">Avg</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {stats.averageScore}%
                </div>
                <div className="text-sm text-slate-600">Average Score</div>
              </div>

              {/* Pass Rate */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <Badge variant="secondary" className="text-xs">Pass Rate</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                  {stats.passRate}%
                </div>
                <div className="text-sm text-slate-600">Scored ≥70%</div>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-6">Score Distribution</h2>
              <div className="space-y-4">
                {Object.entries(stats.scoreRanges).map(([range, count]) => {
                  const percentage = (count / stats.totalAttempts) * 100;
                  return (
                    <div key={range}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{range}</span>
                        <span className="text-sm text-slate-600">{count} attempts</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Top Performers
              </h2>
              <div className="space-y-3">
                {stats.topPerformers.map((attempt, idx) => (
                  <div 
                    key={attempt.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-100"
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${idx === 0 ? 'bg-amber-100 text-amber-700' : ''}
                      ${idx === 1 ? 'bg-slate-100 text-slate-700' : ''}
                      ${idx === 2 ? 'bg-orange-100 text-orange-700' : ''}
                      ${idx > 2 ? 'bg-slate-50 text-slate-600' : ''}
                    `}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{attempt.user_email}</div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(attempt.created_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-emerald-600">
                        {attempt.percentage}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {attempt.score}/{attempt.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Attempts */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Recent Attempts
              </h2>
              <div className="space-y-2">
                {stats.recentAttempts.map((attempt) => (
                  <div 
                    key={attempt.id}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{attempt.user_email}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(attempt.created_date), 'MMM d, yyyy • h:mm a')}
                        {attempt.time_taken && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={
                          attempt.percentage >= 70 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {attempt.percentage}%
                      </Badge>
                      <div className="text-xs text-slate-500 mt-1">
                        {attempt.score}/{attempt.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}