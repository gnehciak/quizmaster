import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  TrendingUp, 
  Clock, 
  Target, 
  Users,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

export default function QuizAnalytics() {
  const [selectedQuiz, setSelectedQuiz] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list('-created_date')
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['quizAttempts'],
    queryFn: () => base44.entities.QuizAttempt.list('-created_date')
  });

  // Filter attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter(attempt => {
      const quizMatch = selectedQuiz === 'all' || attempt.quiz_id === selectedQuiz;
      const dateMatch = (!dateFrom || new Date(attempt.created_date) >= new Date(dateFrom)) &&
                       (!dateTo || new Date(attempt.created_date) <= new Date(dateTo));
      return quizMatch && dateMatch;
    });
  }, [attempts, selectedQuiz, dateFrom, dateTo]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredAttempts.length === 0) return null;

    const totalAttempts = filteredAttempts.length;
    const avgScore = filteredAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts;
    const avgTime = filteredAttempts
      .filter(a => a.time_taken)
      .reduce((sum, a) => sum + a.time_taken, 0) / filteredAttempts.filter(a => a.time_taken).length;
    const uniqueUsers = new Set(filteredAttempts.map(a => a.user_email)).size;
    const passRate = (filteredAttempts.filter(a => a.percentage >= 70).length / totalAttempts) * 100;

    return {
      totalAttempts,
      avgScore: avgScore.toFixed(1),
      avgTime: avgTime ? Math.round(avgTime / 60) : 0,
      uniqueUsers,
      passRate: passRate.toFixed(1)
    };
  }, [filteredAttempts]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { name: '0-20%', min: 0, max: 20, count: 0 },
      { name: '21-40%', min: 21, max: 40, count: 0 },
      { name: '41-60%', min: 41, max: 60, count: 0 },
      { name: '61-80%', min: 61, max: 80, count: 0 },
      { name: '81-100%', min: 81, max: 100, count: 0 }
    ];

    filteredAttempts.forEach(attempt => {
      const range = ranges.find(r => attempt.percentage >= r.min && attempt.percentage <= r.max);
      if (range) range.count++;
    });

    return ranges;
  }, [filteredAttempts]);

  // Performance by quiz
  const quizPerformance = useMemo(() => {
    const quizMap = {};
    
    filteredAttempts.forEach(attempt => {
      if (!quizMap[attempt.quiz_id]) {
        const quiz = quizzes.find(q => q.id === attempt.quiz_id);
        quizMap[attempt.quiz_id] = {
          name: quiz?.title || 'Unknown Quiz',
          attempts: 0,
          totalScore: 0,
          totalTime: 0,
          timeCount: 0
        };
      }
      quizMap[attempt.quiz_id].attempts++;
      quizMap[attempt.quiz_id].totalScore += attempt.percentage;
      if (attempt.time_taken) {
        quizMap[attempt.quiz_id].totalTime += attempt.time_taken;
        quizMap[attempt.quiz_id].timeCount++;
      }
    });

    return Object.values(quizMap).map(quiz => ({
      name: quiz.name.length > 20 ? quiz.name.substring(0, 20) + '...' : quiz.name,
      avgScore: (quiz.totalScore / quiz.attempts).toFixed(1),
      attempts: quiz.attempts,
      avgTime: quiz.timeCount > 0 ? Math.round(quiz.totalTime / quiz.timeCount / 60) : 0
    }));
  }, [filteredAttempts, quizzes]);

  // Performance over time
  const performanceOverTime = useMemo(() => {
    const dateMap = {};
    
    filteredAttempts.forEach(attempt => {
      const date = format(new Date(attempt.created_date), 'MMM dd');
      if (!dateMap[date]) {
        dateMap[date] = { date, totalScore: 0, count: 0 };
      }
      dateMap[date].totalScore += attempt.percentage;
      dateMap[date].count++;
    });

    return Object.values(dateMap)
      .map(d => ({
        date: d.date,
        avgScore: (d.totalScore / d.count).toFixed(1)
      }))
      .slice(-14); // Last 14 days
  }, [filteredAttempts]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-6">You need admin access to view analytics</p>
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
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('ManageQuizzes')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quiz Analytics</h1>
              <p className="text-sm text-slate-500">Performance insights and statistics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="font-semibold text-slate-800 mb-4">Filters</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quiz</Label>
              <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quizzes</SelectItem>
                  {quizzes.map(quiz => (
                    <SelectItem key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm text-slate-600">Total Attempts</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.totalAttempts}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-600">Avg Score</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.avgScore}%</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm text-slate-600">Avg Time</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.avgTime}m</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-slate-600">Unique Users</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.uniqueUsers}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-slate-600">Pass Rate</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.passRate}%</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Score Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => count > 0 ? `${name}: ${count}` : ''}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Over Time */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Performance Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Avg Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance by Quiz */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
            <h3 className="font-semibold text-slate-800 mb-4">Performance by Quiz</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quizPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#6366f1" />
                <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="avgScore" fill="#6366f1" name="Avg Score (%)" />
                <Bar yAxisId="right" dataKey="attempts" fill="#22c55e" name="Attempts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Attempts Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-8">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Attempts</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Quiz</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.slice(0, 10).map((attempt, idx) => {
                  const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-700">{attempt.user_email}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{quiz?.title || 'Unknown'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${
                          attempt.percentage >= 70 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attempt.score}/{attempt.total} ({attempt.percentage}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {attempt.time_taken ? `${Math.round(attempt.time_taken / 60)}m` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {format(new Date(attempt.created_date), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}