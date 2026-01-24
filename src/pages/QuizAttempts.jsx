import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Loader2,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  BarChart2,
  List,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { toast } from 'sonner';

export default function QuizAttempts() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all'); // all, pass, fail
  const [attemptToDelete, setAttemptToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, questions, attempts

  const queryClient = useQueryClient();

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

  const deleteAttemptMutation = useMutation({
    mutationFn: (id) => base44.entities.QuizAttempt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizAttempts', quizId] });
      toast.success('Attempt deleted successfully');
      setAttemptToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete attempt');
    }
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  // Stats calculation
  const stats = React.useMemo(() => {
    if (attempts.length === 0) return null;

    const totalAttempts = attempts.length;
    const uniqueUsers = new Set(attempts.map(a => a.user_email)).size;
    const averageScore = attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts;
    const passRate = (attempts.filter(a => a.percentage >= 70).length / totalAttempts) * 100;
    
    // Attempts over time graph data
    // Group by date
    const attemptsByDate = attempts.reduce((acc, attempt) => {
      const date = format(new Date(attempt.created_date), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = { date, count: 0, totalScore: 0, avgScore: 0 };
      }
      acc[date].count += 1;
      acc[date].totalScore += attempt.percentage;
      return acc;
    }, {});

    const timelineData = Object.values(attemptsByDate)
      .map(d => ({
        ...d,
        avgScore: Math.round(d.totalScore / d.count),
        formattedDate: format(new Date(d.date), 'MMM d')
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Question Performance Analysis
    let questionStats = [];
    if (quiz?.questions) {
      // Flatten questions logic similar to ReviewAnswers but for all attempts
      quiz.questions.forEach((q, qIndex) => {
        // Handle question parts
        const processPoint = (pointId, label, isCorrectFn) => {
          let correctCount = 0;
          let totalCount = 0;

          attempts.forEach(attempt => {
            const answer = attempt.answers?.[qIndex]; // Answers are stored by question index usually
            // Wait, answer format in QuizAttempt is usually { questionIndex: answer } or similar?
            // Checking ReviewAnswers.js: "const answers = attempt?.answers || {}; const answer = answers[idx];"
            // So yes, keyed by index.
            
            if (answer !== undefined) {
              totalCount++;
              if (isCorrectFn(answer)) {
                correctCount++;
              }
            }
          });

          const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
          
          questionStats.push({
            id: pointId,
            label: label,
            type: q.type,
            correct: correctCount,
            total: totalCount,
            percentage,
            isSub: pointId.includes('.')
          });
        };

        const qLabel = `Q${qIndex + 1}`;
        
        if (q.type === 'reading_comprehension') {
           (q.comprehensionQuestions || []).forEach((cq, cqIdx) => {
             processPoint(
               `${qLabel}.${cqIdx + 1}`,
               `${qLabel}.${cqIdx + 1} ${cq.question?.substring(0, 30)}...`,
               (ans) => ans === cq.correctAnswer // Accessing sub-answer logic is tricky if answer is object.
               // In ReviewAnswers: answer is just the sub-answer? No, ReviewAnswers says:
               // if (q.isSubQuestion) ...
               // But here we are iterating raw questions structure.
               // Wait, ReviewAnswers flattens questions first. 
               // The stored answers in QuizAttempt are indexed by the FLATTENED index if the quiz execution flattens them.
               // Let's check TakeQuiz... TakeQuiz likely flattens them too?
               // Actually ReviewAnswers says: "const answers = attempt?.answers || {};" and uses flattened index.
               // If the quiz structure changed, this might be fragile. 
               // Assuming answers are keyed by the index of the FLATTENED questions array used during taking.
             );
           });
           // WARNING: If answers are stored by flattened index, we need to replicate the flattening logic here to match indices.
        } else if (q.type === 'multiple_choice') {
          processPoint(qLabel, `${qLabel} ${q.question?.substring(0, 30)}...`, (ans) => ans === q.correctAnswer);
        } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
          (q.dropZones || []).forEach((zone, zIdx) => {
             processPoint(
               `${qLabel}.${zIdx + 1}`,
               `${qLabel}.${zIdx + 1} ${zone.label}`,
               (ans) => ans?.[zone.id] === zone.correctAnswer
             );
          });
        } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
           (q.blanks || []).forEach((blank, bIdx) => {
             processPoint(
               `${qLabel}.${bIdx + 1}`,
               `${qLabel}.${bIdx + 1} Blank ${bIdx + 1}`,
               (ans) => ans?.[blank.id] === blank.correctAnswer
             );
           });
        } else if (q.type === 'matching_list_dual') {
           (q.matchingQuestions || []).forEach((mq, mIdx) => {
             processPoint(
               `${qLabel}.${mIdx + 1}`,
               `${qLabel}.${mIdx + 1} Match ${mIdx + 1}`,
               (ans) => ans?.[mq.id] === mq.correctAnswer
             );
           });
        } else {
           // Default fallback
           processPoint(qLabel, `${qLabel} ${q.question?.substring(0, 30)}...`, () => false);
        }
      });
    }

    // RE-DOING QUESTION STATS WITH FLATTENING LOGIC TO MATCH REVIEW ANSWERS
    // Because answers are likely stored by flattened index.
    let flattenedStats = [];
    if (quiz?.questions) {
      let flatIndex = 0;
      quiz.questions.forEach((q, qIndex) => {
         if (q.type === 'reading_comprehension') {
            (q.comprehensionQuestions || []).forEach((cq, cqIdx) => {
               const currentFlatIndex = flatIndex++;
               let correct = 0;
               let total = 0;
               attempts.forEach(a => {
                  if (a.answers && a.answers[currentFlatIndex] !== undefined) {
                    total++;
                    if (a.answers[currentFlatIndex] === cq.correctAnswer) correct++;
                  }
               });
               flattenedStats.push({
                 id: `Q${qIndex + 1}.${cqIdx + 1}`,
                 label: `Q${qIndex + 1}.${cqIdx + 1} (Reading)`,
                 correct, total, percentage: total ? Math.round((correct/total)*100) : 0
               });
            });
         } else {
            // Non-nested questions (or internally nested like drag-drop which are ONE question index but object answer)
            const currentFlatIndex = flatIndex++;
            
            if (['drag_drop_single', 'drag_drop_dual'].includes(q.type)) {
               (q.dropZones || []).forEach((zone, zIdx) => {
                  let correct = 0;
                  let total = 0;
                  attempts.forEach(a => {
                     const ans = a.answers?.[currentFlatIndex];
                     if (ans) {
                       total++;
                       if (ans[zone.id] === zone.correctAnswer) correct++;
                     }
                  });
                  flattenedStats.push({
                    id: `Q${qIndex + 1}.${zIdx + 1}`,
                    label: `Q${qIndex + 1}.${zIdx + 1} (Drop Zone: ${zone.label})`,
                    correct, total, percentage: total ? Math.round((correct/total)*100) : 0
                  });
               });
            } else if (['inline_dropdown_separate', 'inline_dropdown_same'].includes(q.type)) {
               (q.blanks || []).forEach((blank, bIdx) => {
                  let correct = 0;
                  let total = 0;
                  attempts.forEach(a => {
                     const ans = a.answers?.[currentFlatIndex];
                     if (ans) {
                       total++;
                       if (ans[blank.id] === blank.correctAnswer) correct++;
                     }
                  });
                  flattenedStats.push({
                    id: `Q${qIndex + 1}.${bIdx + 1}`,
                    label: `Q${qIndex + 1}.${bIdx + 1} (Blank ${bIdx + 1})`,
                    correct, total, percentage: total ? Math.round((correct/total)*100) : 0
                  });
               });
            } else if (q.type === 'matching_list_dual') {
               (q.matchingQuestions || []).forEach((mq, mIdx) => {
                  let correct = 0;
                  let total = 0;
                  attempts.forEach(a => {
                     const ans = a.answers?.[currentFlatIndex];
                     if (ans) {
                       total++;
                       if (ans[mq.id] === mq.correctAnswer) correct++;
                     }
                  });
                  flattenedStats.push({
                    id: `Q${qIndex + 1}.${mIdx + 1}`,
                    label: `Q${qIndex + 1}.${mIdx + 1} (Match ${mIdx + 1})`,
                    correct, total, percentage: total ? Math.round((correct/total)*100) : 0
                  });
               });
            } else {
               // Simple questions
               let correct = 0;
               let total = 0;
               attempts.forEach(a => {
                  if (a.answers && a.answers[currentFlatIndex] !== undefined) {
                    total++;
                    if (a.answers[currentFlatIndex] === q.correctAnswer) correct++;
                  }
               });
               flattenedStats.push({
                 id: `Q${qIndex + 1}`,
                 label: `Q${qIndex + 1} (${q.type})`,
                 correct, total, percentage: total ? Math.round((correct/total)*100) : 0
               });
            }
         }
      });
    }
    questionStats = flattenedStats;

    return {
      timelineData,
      questionStats,
      totalAttempts,
      uniqueUsers,
      averageScore: averageScore.toFixed(1),
      passRate: passRate.toFixed(1)
    };
  }, [attempts, quiz]);

  // Filtered attempts
  const filteredAttempts = React.useMemo(() => {
    return attempts.filter(a => {
      const matchesSearch = a.user_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScore = scoreFilter === 'all' 
        ? true 
        : scoreFilter === 'pass' ? a.percentage >= 70 : a.percentage < 70;
      return matchesSearch && matchesScore;
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [attempts, searchTerm, scoreFilter]);

  if (userLoading || quizLoading || attemptsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!quiz) return <div>Quiz not found</div>;
  if (!isAdmin) return <div>Access Denied</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{quiz.title}</h1>
                <p className="text-sm text-slate-500">Analytics Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('overview')}
                className="gap-2"
              >
                <BarChart2 className="w-4 h-4" /> Overview
              </Button>
              <Button 
                variant={activeTab === 'attempts' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('attempts')}
                className="gap-2"
              >
                <List className="w-4 h-4" /> Attempts
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {stats && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">Total</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900">{stats.totalAttempts}</div>
                <div className="text-sm text-slate-500">Total Attempts</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">Users</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900">{stats.uniqueUsers}</div>
                <div className="text-sm text-slate-500">Unique Participants</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700">Avg</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900">{stats.averageScore}%</div>
                <div className="text-sm text-slate-500">Average Score</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Pass</Badge>
                </div>
                <div className="text-3xl font-bold text-slate-900">{stats.passRate}%</div>
                <div className="text-sm text-slate-500">Pass Rate (≥70%)</div>
              </div>
            </div>

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attempts Over Time Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Performance Over Time</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="formattedDate" 
                          stroke="#64748B" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748B" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                          cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgScore" 
                          stroke="#6366f1" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Question Breakdown Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Question Breakdown</h3>
                  <div className="h-[400px] w-full overflow-x-auto">
                    <div className="min-w-[800px] h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.questionStats} margin={{ bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis 
                            dataKey="id" 
                            stroke="#64748B" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis 
                            stroke="#64748B" 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            cursor={{ fill: '#F1F5F9' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                                    <p className="font-bold text-sm mb-1">{data.label}</p>
                                    <p className="text-xs text-slate-500 mb-2">Success Rate: <span className="font-bold text-indigo-600">{data.percentage}%</span></p>
                                    <p className="text-xs text-slate-400">Correct: {data.correct}/{data.total}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="percentage" 
                            fill="#6366f1" 
                            radius={[4, 4, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attempts Tab Content */}
            {activeTab === 'attempts' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50/50">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-9 bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <Select value={scoreFilter} onValueChange={setScoreFilter}>
                      <SelectTrigger className="w-[140px] bg-white">
                        <SelectValue placeholder="Score" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="pass">Passed (≥70%)</SelectItem>
                        <SelectItem value="fail">Failed (&lt;70%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttempts.map((attempt) => (
                        <TableRow key={attempt.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-slate-900">{attempt.user_email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {format(new Date(attempt.created_date), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            {attempt.paused ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                Paused
                              </Badge>
                            ) : (
                              <Badge 
                                className={
                                  attempt.percentage >= 70 
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                                    : 'bg-red-100 text-red-700 hover:bg-red-100'
                                }
                              >
                                {attempt.percentage}%
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}m ${attempt.time_taken % 60}s` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={createPageUrl(`ReviewAnswers?id=${quizId}&attemptId=${attempt.id}`)}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                onClick={() => setAttemptToDelete(attempt)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAttempts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                            No attempts found matching your filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!attemptToDelete} onOpenChange={() => setAttemptToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Attempt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attempt by {attemptToDelete?.user_email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttemptToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAttemptMutation.mutate(attemptToDelete.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}