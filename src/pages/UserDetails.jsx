import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  Loader2,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function UserDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  const { data: currentUser, isLoading: currentUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return null;
      }
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizAttempts = [] } = useQuery({
    queryKey: ['userAttempts', userId],
    queryFn: () => base44.entities.QuizAttempt.list(),
    enabled: !!userId && currentUser?.role === 'admin'
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: courseAccess = [] } = useQuery({
    queryKey: ['allCourseAccess'],
    queryFn: () => base44.entities.CourseAccess.list(),
    enabled: currentUser?.role === 'admin'
  });

  // Access control
  if (currentUserLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">Only administrators can view user details.</p>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const user = users.find(u => u.id === userId);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">User not found</h2>
          <Link to={createPageUrl('UserManagement')}>
            <Button>Back to User Management</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter attempts for this user
  const userAttempts = quizAttempts.filter(a => a.user_email === user.email);
  const userCourseAccess = courseAccess.filter(a => a.user_email === user.email);

  // Calculate stats
  const totalAttempts = userAttempts.length;
  const averageScore = userAttempts.length > 0 
    ? Math.round(userAttempts.reduce((acc, a) => acc + a.percentage, 0) / userAttempts.length)
    : 0;
  const coursesEnrolled = userCourseAccess.length;

  // Group attempts by course
  const attemptsByCourse = {};
  userAttempts.forEach(attempt => {
    if (!attemptsByCourse[attempt.course_id]) {
      attemptsByCourse[attempt.course_id] = [];
    }
    attemptsByCourse[attempt.course_id].push(attempt);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to={createPageUrl('UserManagement')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">User Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">{user.full_name || 'Unnamed User'}</h2>
                  <div className="flex items-center gap-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.created_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {format(new Date(user.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  user.role === 'admin' 
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                )}>
                  {user.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Quiz Attempts</p>
                <p className="text-2xl font-bold text-slate-800">{totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Average Score</p>
                <p className="text-2xl font-bold text-slate-800">{averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Courses Enrolled</p>
                <p className="text-2xl font-bold text-slate-800">{coursesEnrolled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Course Performance</h3>
          
          {Object.keys(attemptsByCourse).length === 0 ? (
            <p className="text-slate-500 text-center py-8">No quiz attempts yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(attemptsByCourse).map(([courseId, attempts]) => {
                const course = courses.find(c => c.id === courseId);
                if (!course) return null;

                const courseAverage = Math.round(
                  attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length
                );

                return (
                  <div key={courseId} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-800">{course.title}</h4>
                        <p className="text-sm text-slate-500">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800">{courseAverage}%</div>
                        <p className="text-xs text-slate-500">Average</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {attempts.slice(0, 5).map((attempt, idx) => {
                        const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                        return (
                          <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={cn(
                                "w-4 h-4",
                                attempt.percentage >= 70 ? "text-emerald-500" : "text-slate-400"
                              )} />
                              <span className="text-slate-700">{quiz?.title || 'Unknown Quiz'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "font-medium",
                                attempt.percentage >= 70 ? "text-emerald-600" : "text-slate-600"
                              )}>
                                {attempt.score}/{attempt.total} ({attempt.percentage}%)
                              </span>
                              <span className="text-slate-500 text-xs">
                                {format(new Date(attempt.created_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Enrolled Courses</h3>
          
          {userCourseAccess.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Not enrolled in any courses</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userCourseAccess.map((access) => {
                const course = courses.find(c => c.id === access.course_id);
                if (!course) return null;

                return (
                  <div key={access.id} className="border border-slate-200 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-800 mb-1">{course.title}</h4>
                    <p className="text-sm text-slate-500 mb-2">{course.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(
                        "px-2 py-1 rounded-full font-medium",
                        access.unlock_method === 'admin' && "bg-purple-100 text-purple-700",
                        access.unlock_method === 'code' && "bg-blue-100 text-blue-700",
                        access.unlock_method === 'purchase' && "bg-emerald-100 text-emerald-700"
                      )}>
                        {access.unlock_method === 'admin' ? 'Admin Access' : 
                         access.unlock_method === 'code' ? 'Code Unlocked' : 'Purchased'}
                      </span>
                      <span className="text-slate-500">
                        {format(new Date(access.created_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}