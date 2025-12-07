import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  Lock, 
  Unlock, 
  CreditCard, 
  Key,
  PlayCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '@/lib/utils';

export default function CourseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [unlockCode, setUnlockCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }),
    enabled: !!courseId,
    select: (data) => data[0]
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const { data: access } = useQuery({
    queryKey: ['courseAccess', courseId, user?.email],
    queryFn: () => base44.entities.CourseAccess.filter({ 
      course_id: courseId, 
      user_email: user.email 
    }),
    enabled: !!courseId && !!user?.email,
    select: (data) => data[0]
  });

  const hasAccess = !course?.is_locked || !!access || user?.role === 'admin';
  const courseQuizzes = quizzes.filter(q => course?.quiz_ids?.includes(q.id));

  const unlockMutation = useMutation({
    mutationFn: (data) => base44.entities.CourseAccess.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseAccess'] });
      setError('');
    }
  });

  const handleCodeUnlock = async () => {
    if (!unlockCode.trim()) {
      setError('Please enter a code');
      return;
    }

    if (unlockCode !== course.unlock_code) {
      setError('Invalid code');
      return;
    }

    await unlockMutation.mutateAsync({
      user_email: user.email,
      course_id: courseId,
      unlock_method: 'code'
    });
  };

  const handlePurchase = async () => {
    setProcessing(true);
    // In a real app, implement Stripe checkout here
    // For now, just unlock the course
    await unlockMutation.mutateAsync({
      user_email: user.email,
      course_id: courseId,
      unlock_method: 'purchase'
    });
    setProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Course not found</h2>
          <Link to={createPageUrl('Home')}>
            <Button>Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
          </div>
          <p className="text-slate-600">{course.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Unlock Section */}
        {!hasAccess && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
            <div className="text-center mb-8">
              <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                This course is locked
              </h2>
              <p className="text-slate-600">
                Unlock this course to access all quizzes and content
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Unlock with Code */}
              <div className="border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Key className="w-6 h-6 text-indigo-500" />
                  <h3 className="font-semibold text-slate-800">Have a code?</h3>
                </div>
                <Input
                  placeholder="Enter unlock code"
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  className="mb-3"
                />
                {error && (
                  <p className="text-sm text-red-600 mb-3">{error}</p>
                )}
                <Button 
                  onClick={handleCodeUnlock}
                  className="w-full"
                  disabled={!unlockCode.trim()}
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock with Code
                </Button>
              </div>

              {/* Purchase */}
              {course.price && (
                <div className="border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-6 h-6 text-indigo-500" />
                    <h3 className="font-semibold text-slate-800">Purchase</h3>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600 mb-4">
                    ${course.price}
                  </p>
                  <Button 
                    onClick={handlePurchase}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Purchase Course
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quizzes List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Course Content ({courseQuizzes.length} quizzes)
          </h2>

          <div className="space-y-3">
            {courseQuizzes.map((quiz, idx) => (
              <div
                key={quiz.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  hasAccess 
                    ? "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50" 
                    : "border-slate-200 bg-slate-50 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
                    <p className="text-sm text-slate-500">
                      {quiz.questions?.length || 0} questions
                    </p>
                  </div>
                </div>

                {hasAccess ? (
                  <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)}>
                    <Button size="sm" className="gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Start
                    </Button>
                  </Link>
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
              </div>
            ))}

            {courseQuizzes.length === 0 && (
              <p className="text-center text-slate-500 py-8">
                No quizzes in this course yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}