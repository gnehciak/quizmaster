import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  TrendingUp,
  Users,
  FileText,
  Search,
  Trash2,
  Eye,
  Calendar,
  Award,
  Activity,
  Download,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function CourseAnalytics() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [quizFilter, setQuizFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }),
    enabled: !!courseId,
    select: (data) => data[0]
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list()
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['courseAttempts', courseId],
    queryFn: () => base44.entities.QuizAttempt.filter({ course_id: courseId }),
    enabled: !!courseId
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['courseEnrollments', courseId],
    queryFn: () => base44.entities.CourseAccess.filter({ course_id: courseId }),
    enabled: !!courseId
  });

  const deleteAttemptMutation = useMutation({
    mutationFn: (attemptId) => base44.entities.QuizAttempt.delete(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseAttempts', courseId] });
      toast.success('Attempt deleted');
    }
  });

  // Get course quizzes
  const courseQuizzes = quizzes.filter(q => course?.quiz_ids?.includes(q.id));

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const totalAttempts = attempts.length;
  const averageScore = attempts.length > 0
    ? (attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length).toFixed(1)
    : 0;

  // Get unique classes
  const uniqueClasses = [...new Set(enrollments.map(e => e.class_name).filter(Boolean))].sort();

  // Filter attempts
  const filteredAttempts = attempts.filter(attempt => {
    const matchesQuiz = quizFilter === 'all' || attempt.quiz_id === quizFilter;
    const enrollment = enrollments.find(e => e.user_email === attempt.user_email);
    const matchesClass = classFilter === 'all' || enrollment?.class_name === classFilter;
    const matchesSearch = attempt.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesQuiz && matchesClass && matchesSearch;
  });

  // Group by student
  const studentStats = {};
  attempts.forEach(attempt => {
    if (!studentStats[attempt.user_email]) {
      studentStats[attempt.user_email] = {
        email: attempt.user_email,
        attempts: [],
        totalScore: 0,
        count: 0
      };
    }
    studentStats[attempt.user_email].attempts.push(attempt);
    studentStats[attempt.user_email].totalScore += attempt.percentage;
    studentStats[attempt.user_email].count += 1;
  });

  Object.keys(studentStats).forEach(email => {
    studentStats[email].avgScore = (studentStats[email].totalScore / studentStats[email].count).toFixed(1);
  });

  // Activity log combining attempts and enrollments
  const activityLog = [
    ...attempts.map(a => ({
      type: 'quiz_completed',
      timestamp: a.created_date,
      user: a.user_email,
      details: `Completed quiz - ${a.score}/${a.total} (${a.percentage}%)`,
      quiz_id: a.quiz_id,
      score: a.percentage
    })),
    ...enrollments.map(e => ({
      type: 'enrollment',
      timestamp: e.created_date,
      user: e.user_email,
      details: `Enrolled via ${e.unlock_method}${e.class_name ? ` - ${e.class_name}` : ''}`,
      method: e.unlock_method,
      class_name: e.class_name
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const handleViewStudent = (email) => {
    setSelectedStudent(studentStats[email]);
    setStudentDialogOpen(true);
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-xl font-bold text-slate-800 truncate max-w-md">
              {course.title} - Analytics
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrollments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttempts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueClasses.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="attempts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="attempts">Quiz Attempts</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Quiz Attempts Tab */}
          <TabsContent value="attempts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={quizFilter} onValueChange={setQuizFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Quizzes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Quizzes</SelectItem>
                      {courseQuizzes.map(quiz => (
                        <SelectItem key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {uniqueClasses.map(className => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attempts Table */}
                <div className="border rounded-lg overflow-hidden">
                  {attemptsLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : filteredAttempts.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-left">Quiz</th>
                          <th className="px-4 py-3 text-left">Score</th>
                          <th className="px-4 py-3 text-left">Time Taken</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttempts.map((attempt) => {
                          const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                          const enrollment = enrollments.find(e => e.user_email === attempt.user_email);
                          return (
                            <tr key={attempt.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div>
                                  <div className="font-medium text-slate-900">{attempt.user_email}</div>
                                  {enrollment?.class_name && (
                                    <div className="text-xs text-slate-500">{enrollment.class_name}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{quiz?.title || 'Unknown'}</td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold ${
                                  attempt.percentage >= 80 ? 'text-green-600' :
                                  attempt.percentage >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {attempt.score}/{attempt.total} ({attempt.percentage}%)
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {attempt.time_taken ? Math.floor(attempt.time_taken / 60) + 'm' : '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {new Date(attempt.created_date).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.location.href = createPageUrl(`ReviewAnswers?attemptId=${attempt.id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      if (confirm('Delete this attempt?')) {
                                        deleteAttemptMutation.mutate(attempt.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No attempts found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  {Object.values(studentStats).length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-left">Attempts</th>
                          <th className="px-4 py-3 text-left">Average Score</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.values(studentStats)
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .map((student) => {
                            const enrollment = enrollments.find(e => e.user_email === student.email);
                            return (
                              <tr key={student.email} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div>
                                    <div className="font-medium text-slate-900">{student.email}</div>
                                    {enrollment?.class_name && (
                                      <div className="text-xs text-slate-500">{enrollment.class_name}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{student.count}</td>
                                <td className="px-4 py-3">
                                  <span className={`font-semibold ${
                                    student.avgScore >= 80 ? 'text-green-600' :
                                    student.avgScore >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {student.avgScore}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewStudent(student.email)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No student data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  {enrollmentsLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                  ) : enrollments.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                          <th className="px-4 py-3 text-left">Student</th>
                          <th className="px-4 py-3 text-left">Class</th>
                          <th className="px-4 py-3 text-left">Method</th>
                          <th className="px-4 py-3 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {enrollments
                          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                          .map((enrollment) => (
                            <tr key={enrollment.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {enrollment.user_email}
                              </td>
                              <td className="px-4 py-3">
                                {enrollment.class_name ? (
                                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                                    {enrollment.class_name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="capitalize bg-slate-100 px-2 py-1 rounded text-xs">
                                  {enrollment.unlock_method}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {new Date(enrollment.created_date).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No enrollments yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Master Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityLog.length > 0 ? (
                    activityLog.slice(0, 100).map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'quiz_completed' ? 'bg-green-100' : 'bg-indigo-100'
                        }`}>
                          {activity.type === 'quiz_completed' ? (
                            <FileText className="w-4 h-4 text-green-600" />
                          ) : (
                            <Users className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{activity.user}</p>
                              <p className="text-sm text-slate-600">{activity.details}</p>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No activity yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details - {selectedStudent?.email}</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStudent.count}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStudent.avgScore}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {enrollments.find(e => e.user_email === selectedStudent.email)?.class_name || '—'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">All Attempts</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Quiz</th>
                        <th className="px-3 py-2 text-left">Score</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedStudent.attempts
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map((attempt) => {
                          const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                          return (
                            <tr key={attempt.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">{quiz?.title || 'Unknown'}</td>
                              <td className="px-3 py-2">
                                <span className={`font-semibold ${
                                  attempt.percentage >= 80 ? 'text-green-600' :
                                  attempt.percentage >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {attempt.score}/{attempt.total} ({attempt.percentage}%)
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-500 text-xs">
                                {new Date(attempt.created_date).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.location.href = createPageUrl(`ReviewAnswers?attemptId=${attempt.id}`)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}