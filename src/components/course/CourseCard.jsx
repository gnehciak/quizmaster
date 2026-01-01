import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ChevronRight, BookOpen, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

export default function CourseCard({ course, index, hasAccess, user }) {
  const categoryColors = {
    science: 'bg-blue-100 text-blue-700 border-blue-200',
    mathematics: 'bg-purple-100 text-purple-700 border-purple-200',
    history: 'bg-amber-100 text-amber-700 border-amber-200',
    geography: 'bg-green-100 text-green-700 border-green-200',
    literature: 'bg-pink-100 text-pink-700 border-pink-200',
    technology: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    languages: 'bg-rose-100 text-rose-700 border-rose-200',
    arts: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    business: 'bg-slate-100 text-slate-700 border-slate-200',
    health: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sports: 'bg-orange-100 text-orange-700 border-orange-200',
    general_knowledge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const formatDuration = (days) => {
    if (!days) return '1 Year Access';
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years} Year${years > 1 ? 's' : ''} Access`;
    }
    return `${days} Days Access`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
        {course.image_url ? (
          <img 
            src={course.image_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-indigo-300" />
          </div>
        )}
        
        {!hasAccess && (
          <div className="absolute top-3 right-3">
            <div className="bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Lock className="w-3 h-3" />
              Locked
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          {course.category && (
            <Badge className={cn('text-xs font-medium border mb-3 w-fit', categoryColors[course.category] || categoryColors.other)}>
              {course.category}
            </Badge>
          )}
          <Link 
            to={createPageUrl(`CourseDetail?id=${course.id}`)} 
            className="block group"
          >
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
              {course.title}
            </h3>
          </Link>
        </div>

        <p className="text-slate-600 text-sm mb-6 line-clamp-2">
          {course.description || 'No description available'}
        </p>

        {course.features && course.features.length > 0 && (
          <div className="space-y-2 mb-6">
            {course.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(course.enrollment_duration)}</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            {course.is_locked && !hasAccess ? (
              course.price ? (
                <>
                  <span className="text-xs text-slate-500 font-medium">Price</span>
                  <span className="text-2xl font-extrabold text-indigo-600">
                    ${course.price}
                  </span>
                </>
              ) : (
                <span className="text-xl font-bold text-green-600">Free</span>
              )
            ) : (
              <span className="text-lg font-bold text-emerald-600">
                {hasAccess ? 'Enrolled' : 'Unlocked'}
              </span>
            )}
          </div>
          
          {user ? (
            <Link 
              to={createPageUrl(`CourseDetail?id=${course.id}`)}
              className=""
            >
              <Button className={cn("gap-2", !hasAccess && "bg-green-600 hover:bg-green-700")}>
                {hasAccess ? 'View Course' : 'Unlock/Purchase'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
              className={cn("gap-2 ml-auto", !hasAccess && "bg-green-600 hover:bg-green-700")}
            >
              {hasAccess ? 'View Course' : 'Unlock/Purchase'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}