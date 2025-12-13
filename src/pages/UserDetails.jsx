import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, User, Loader2, Save, BookOpen, Award, Target, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function UserDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState('');
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return null;
        }
        return user;
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return null;
      }
    },
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: userId });
      return users[0];
    },
    enabled: !!userId && !!currentUser
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: !!currentUser
  });

  const { data: accessList = [] } = useQuery({
    queryKey: ['userAccess', targetUser?.email],
    queryFn: () => base44.entities.CourseAccess.filter({ user_email: targetUser.email }),
    enabled: !!targetUser?.email
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['userAttempts', targetUser?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_email: targetUser.email }),
    enabled: !!targetUser?.email
  });

  React.useEffect(() => {
    if (targetUser?.role) {
      setSelectedRole(targetUser.role);
    }
  }, [targetUser]);

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole) => {
      return await base44.entities.User.update(userId, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targetUser', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update user role');
      console.error(error);
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId) => {
      return await base44.entities.CourseAccess.create({
        user_email: targetUser.email,
        course_id: courseId,
        unlock_method: 'admin'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess'] });
      toast.success('User enrolled successfully');
      setEnrollDialogOpen(false);
      setSelectedCourseId('');
    },
    onError: () => {
      toast.error('Failed to enroll user');
    }
  });

  const unenrollMutation = useMutation({
    mutationFn: async (accessId) => {
      return await base44.entities.CourseAccess.delete(accessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess'] });
      toast.success('User unenrolled successfully');
    },
    onError: () => {
      toast.error('Failed to unenroll user');
    }
  });

  const handleSaveRole = () => {
    if (selectedRole !== targetUser?.role) {
      updateRoleMutation.mutate(selectedRole);
    }
  };

  const handleEnroll = () => {
    if (selectedCourseId) {
      enrollMutation.mutate(selectedCourseId);
    }
  };

  const handleUnenroll = (accessId) => {
    if (confirm('Are you sure you want to unenroll this user from the course?')) {
      unenrollMutation.mutate(accessId);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">User not found</h2>
          <Link to={createPageUrl('UserManagement')}>
            <Button>Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  const accessMap = accessList.reduce((acc, access) => {
    acc[access.course_id] = access;
    return acc;
  }, {});

  const enrolledCourses = courses.filter(c => accessMap[c.id]);
  const availableCourses = courses.filter(c => !accessMap[c.id]);

  const totalAttempts = attempts.length;
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('UserManagement')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">User Details</h1>
              <p className="text-sm text-slate-500">Manage user information and enrollments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - User Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center pb-4 border-b">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl mb-3">
                    {targetUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {targetUser.full_name || 'Unnamed User'}
                  </h3>
                  <p className="text-slate-600 text-sm">{targetUser.email}</p>
                </div>

                <div>
                  <Label className="text-slate-600 text-xs">User ID</Label>
                  <p className="text-slate-800 text-sm font-mono mt-1">{targetUser.id}</p>
                </div>

                <div>
                  <Label className="text-slate-600 text-xs">Joined</Label>
                  <p className="text-slate-800 text-sm mt-1">
                    {targetUser.created_date 
                      ? format(new Date(targetUser.created_date), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-600 text-xs mb-2 block">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selectedRole !== targetUser.role && (
                    <Button 
                      onClick={handleSaveRole}
                      disabled={updateRoleMutation.isPending}
                      className="w-full mt-2 gap-2"
                      size="sm"
                    >
                      {updateRoleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Role
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-slate-600">Enrolled Courses</span>
                  </div>
                  <span className="font-bold text-slate-800">{enrolledCourses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-slate-600">Quiz Attempts</span>
                  </div>
                  <span className="font-bold text-slate-800">{totalAttempts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-slate-600">Avg. Score</span>
                  </div>
                  <span className="font-bold text-slate-800">{averageScore}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Courses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrolled Courses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Enrolled Courses ({enrolledCourses.length})</CardTitle>
                <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Enroll
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enroll User in Course</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Label>Select Course</Label>
                      <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a course..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCourses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleEnroll}
                        disabled={!selectedCourseId || enrollMutation.isPending}
                        className="w-full"
                      >
                        {enrollMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Enroll User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {enrolledCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">No enrolled courses yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrolledCourses.map((course) => {
                      const access = accessMap[course.id];
                      return (
                        <div key={course.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{course.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {access.unlock_method}
                              </Badge>
                              {access.created_date && (
                                <span className="text-xs text-slate-500">
                                  Enrolled {format(new Date(access.created_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnenroll(access.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Quiz Attempts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Quiz Attempts</CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">No quiz attempts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attempts.slice(0, 10).map((attempt, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">Quiz Attempt</p>
                          <p className="text-xs text-slate-500">
                            {attempt.created_date 
                              ? format(new Date(attempt.created_date), 'MMM d, yyyy h:mm a')
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            attempt.percentage >= 80 ? "text-emerald-600" :
                            attempt.percentage >= 60 ? "text-amber-600" :
                            "text-red-600"
                          )}>
                            {attempt.percentage}%
                          </div>
                          <p className="text-xs text-slate-500">{attempt.score}/{attempt.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}