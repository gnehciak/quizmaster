import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  TrendingUp, 
  BookOpen, 
  Award,
  Clock,
  Target,
  Loader2,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function Profile() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['quizAttempts', user?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const [viewMode, setViewMode] = useState('course');

  if (userLoading || attemptsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate stats
  const totalAttempts = attempts.length;
  const averageScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0;
  const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.time_taken || 0), 0);

  // Group attempts by course
  const courseStats = {};
  attempts.forEach(attempt => {
    if (!courseStats[attempt.course_id]) {
      courseStats[attempt.course_id] = [];
    }
    courseStats[attempt.course_id].push(attempt);
  });

  // Group attempts by category
  const categoryStats = {};
  attempts.forEach(attempt => {
    const course = courses.find(c => c.id === attempt.course_id);
    const category = course?.category || 'Uncategorized';
    if (!categoryStats[category]) {
      categoryStats[category] = [];
    }
    categoryStats[category].push(attempt);
  });

  // Helper to calculate last 5 average
  const calculateLast5Average = (attemptsArray) => {
    if (attemptsArray.length === 0) return null;
    const last5 = attemptsArray.slice(0, Math.min(5, attemptsArray.length));
    return Math.round(last5.reduce((sum, a) => sum + a.percentage, 0) / last5.length);
  };

  // Prepare chart data for each course
  const courseChartData = Object.entries(courseStats).map(([courseId, courseAttempts]) => {
    const course = courses.find(c => c.id === courseId);
    const sortedAttempts = [...courseAttempts].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const last5Avg = calculateLast5Average(courseAttempts);
    
    return {
      courseName: course?.title || 'Unknown',
      category: course?.category || 'Uncategorized',
      data: sortedAttempts.slice(-10).map((attempt, idx) => ({
        attempt: `#${idx + 1}`,
        score: attempt.percentage,
        date: new Date(attempt.created_date).toLocaleDateString(),
        avgLast5: last5Avg
      })),
      last5Avg
    };
  });

  // Prepare chart data for each category
  const categoryChartData = Object.entries(categoryStats).map(([category, categoryAttempts]) => {
    const sortedAttempts = [...categoryAttempts].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    const last5Avg = calculateLast5Average(categoryAttempts);
    
    return {
      categoryName: category,
      data: sortedAttempts.slice(-10).map((attempt, idx) => ({
        attempt: `#${idx + 1}`,
        score: attempt.percentage,
        date: new Date(attempt.created_date).toLocaleDateString(),
        avgLast5: last5Avg
      })),
      last5Avg
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{user?.full_name}</h1>
              <p className="text-slate-600">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Overview */}
        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Quizzes
              </CardTitle>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{totalAttempts}</div>
              <p className="text-xs text-slate-500 mt-1">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Average Score
              </CardTitle>
              <Award className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{averageScore}%</div>
              <p className="text-xs text-slate-500 mt-1">Across all quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Time Spent
              </CardTitle>
              <Clock className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {Math.round(totalTimeSpent / 60)}m
              </div>
              <p className="text-xs text-slate-500 mt-1">Learning time</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Charts by Course */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">Progress by Course</h2>

          {chartData.length > 0 ? (
            chartData.map((courseData, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    {courseData.courseName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={courseData.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attempt" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                <p className="text-sm font-medium text-slate-800">
                                  Score: {payload[0].value}%
                                </p>
                                <p className="text-xs text-slate-500">
                                  {payload[0].payload.date}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No quiz attempts yet</p>
                <Link to={createPageUrl('Home')}>
                  <Button>Browse Courses</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Attempts */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {attempts.slice(0, 10).map((attempt, idx) => {
                  const course = courses.find(c => c.id === attempt.course_id);
                  return (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-800">
                          {course?.title || 'Unknown Course'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(attempt.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">
                          {attempt.percentage}%
                        </p>
                        <p className="text-sm text-slate-500">
                          {attempt.score}/{attempt.total}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {attempts.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No quiz attempts yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}