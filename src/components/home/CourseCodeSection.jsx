import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CourseCodeSection({ user }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const enrollMutation = useMutation({
    mutationFn: async (unlockCode) => {
      // Find course with matching unlock code
      const courses = await base44.entities.Course.filter({ unlock_code: unlockCode });
      
      if (courses.length === 0) {
        throw new Error('Invalid code');
      }

      const course = courses[0];

      // Check if already enrolled
      const existingAccess = await base44.entities.CourseAccess.filter({
        user_email: user.email,
        course_id: course.id
      });

      if (existingAccess.length > 0) {
        throw new Error('already_enrolled');
      }

      // Create course access
      await base44.entities.CourseAccess.create({
        user_email: user.email,
        course_id: course.id,
        unlock_method: 'code'
      });

      return course;
    },
    onSuccess: (course) => {
      window.location.href = createPageUrl(`CourseDetail?id=${course.id}`);
    },
    onError: (err) => {
      if (err.message === 'already_enrolled') {
        setError('You are already enrolled in this course');
      } else {
        setError('Invalid code. Please check and try again.');
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    enrollMutation.mutate(code.trim());
  };

  return (
    <div className="py-12 bg-gradient-to-r from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <KeyRound className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">
              Already a Student?
            </h2>
          </div>
          <p className="text-slate-300 mb-6">
            Enter your course code to join
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Enter course code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              className="flex-1 h-12 text-center sm:text-left uppercase bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
              disabled={enrollMutation.isPending}
            />
            <Button
              type="submit"
              disabled={enrollMutation.isPending}
              className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700"
            >
              {enrollMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Join Course
                </>
              )}
            </Button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-400 font-medium">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}