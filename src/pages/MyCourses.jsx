import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, Loader2, KeyRound, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import CourseCard from '@/components/course/CourseCard';

export default function MyCourses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    }
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date')
  });

  const { data: accessList = [], isLoading: accessLoading } = useQuery({
    queryKey: ['courseAccess', user?.email],
    queryFn: () => base44.entities.CourseAccess.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const accessMap = accessList.reduce((acc, access) => {
    acc[access.course_id] = true;
    return acc;
  }, {});

  // Filter enrolled courses
  const enrolledCourses = courses.filter((course) => {
    // Admin sees all courses, users see enrolled or created courses
    if (user?.role === 'admin' || user?.role === 'teacher') {
      return true;
    }
    
    // Show if user has access or created it
    return !course.is_locked || accessMap[course.id] || course.created_by === user?.email;
  });

  const filteredCourses = enrolledCourses.filter((course) =>
    course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = coursesLoading || accessLoading || !user;

  const joinCourseMutation = useMutation({
    mutationFn: async (code) => {
      const allCourses = await base44.entities.Course.list();
      let matchedCourse = null;
      let matchedClass = null;

      for (const course of allCourses) {
        if (course.access_codes && Array.isArray(course.access_codes)) {
          const match = course.access_codes.find(ac => 
            ac.code.toUpperCase() === code.toUpperCase()
          );
          if (match) {
            matchedCourse = course;
            matchedClass = match.class_name;
            break;
          }
        }
        if (course.unlock_code && course.unlock_code.toUpperCase() === code.toUpperCase()) {
          matchedCourse = course;
          matchedClass = 'Legacy Access';
          break;
        }
      }

      if (!matchedCourse) {
        throw new Error('Invalid code');
      }

      const existingAccess = await base44.entities.CourseAccess.filter({
        user_email: user.email,
        course_id: matchedCourse.id
      });

      if (existingAccess.length > 0) {
        throw new Error('already_enrolled');
      }

      await base44.entities.CourseAccess.create({
        user_email: user.email,
        course_id: matchedCourse.id,
        unlock_method: 'code',
        class_name: matchedClass
      });

      return matchedCourse;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['courseAccess'] });
      setJoinDialogOpen(false);
      setAccessCode('');
      toast.success(`Successfully joined ${course.title}`);
    },
    onError: (error) => {
      if (error.message === 'already_enrolled') {
        toast.error('You are already enrolled in this course');
      } else {
        toast.error('Invalid code. Please check and try again.');
      }
    }
  });

  const handleJoinCourse = (e) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error('Please enter a code');
      return;
    }
    joinCourseMutation.mutate(accessCode.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">My Courses</h1>
            <p className="text-lg text-slate-600">
              Your enrolled courses and learning progress
            </p>
          </div>

          {/* Search & Join Button */}
          <div className="flex gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search your courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base bg-white border-slate-200 rounded-xl shadow-sm"
              />
            </div>
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6 gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-5 h-5" />
                  Join Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-600" />
                    Join Course with Code
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleJoinCourse} className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Access Code</label>
                    <Input
                      placeholder="Enter course code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="text-center uppercase h-12"
                      disabled={joinCourseMutation.isPending}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12"
                    disabled={joinCourseMutation.isPending}
                  >
                    {joinCourseMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Course'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
                <Skeleton className="h-40 w-full mb-4 rounded-lg" />
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                index={idx}
                hasAccess={!course.is_locked || accessMap[course.id] || user?.role === 'admin' || user?.role === 'teacher'}
                user={user}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? 'No courses found' : 'No enrolled courses yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm ? 'Try a different search term' : 'Browse available courses to get started'}
            </p>
            {!searchTerm && (
              <Link to={createPageUrl('Home')}>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Browse Courses
                </button>
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}