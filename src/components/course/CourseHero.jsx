import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle, 
  Lock, 
  Unlock, 
  CreditCard, 
  Clock, 
  BookOpen, 
  CheckCircle2,
  Share2,
  CalendarDays
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function CourseHero({ 
  course, 
  access, 
  progress, 
  onUnlock, 
  onPurchase, 
  firstIncompleteBlockId,
  isLocked,
  hasAccess
}) {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // You might want to pass a toast handler here or handle it in parent
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm mb-8">
      <div className="grid md:grid-cols-12 gap-0">
        {/* Image Section */}
        <div className="md:col-span-5 lg:col-span-4 relative h-64 md:h-auto min-h-[300px]">
          {course.image_url ? (
            <img 
              src={course.image_url} 
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-indigo-200" />
            </div>
          )}
          {course.category && (
            <Badge className="absolute top-4 left-4 bg-white/90 text-slate-800 hover:bg-white backdrop-blur-sm">
              {course.category}
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="md:col-span-7 lg:col-span-8 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                {course.title}
              </h1>
              <Button variant="ghost" size="icon" onClick={handleShare} className="text-slate-400 hover:text-indigo-600">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-slate-600 text-lg mb-6 line-clamp-3">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>{course.content_blocks?.length || 0} Lessons</span>
              </div>
              {course.enrollment_duration && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                  <span>{course.enrollment_duration} days access</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {isLocked && !hasAccess ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600 font-medium">Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">Unlocked</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            {hasAccess ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Course Progress</span>
                  <span className="font-bold text-indigo-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                
                <div className="flex gap-3 mt-6">
                  {progress < 100 ? (
                    <Button 
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-base py-6 rounded-xl"
                      onClick={() => {
                        const targetId = firstIncompleteBlockId ? `block-${firstIncompleteBlockId}` : 'course-content';
                        const element = document.getElementById(targetId);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Optionally highlight it
                          element.classList.add('ring-2', 'ring-indigo-500');
                          setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500'), 2000);
                        } else {
                          // If detailed block ID not found, scroll to content list
                          document.getElementById('course-content')?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      {progress > 0 ? 'Continue Learning' : 'Start Course'}
                    </Button>
                  ) : (
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-base py-6 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Course Completed
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                {course.price && (
                  <Button 
                    onClick={onPurchase}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-base py-6 rounded-xl"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Enroll for ${course.price}
                  </Button>
                )}
                {course.is_locked && (
                  <Button 
                    onClick={onUnlock}
                    variant={course.price ? "outline" : "default"}
                    className={course.price ? "flex-1 py-6 rounded-xl" : "flex-1 bg-indigo-600 hover:bg-indigo-700 text-base py-6 rounded-xl"}
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    {course.price ? 'Unlock with Code' : 'Unlock Course'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}