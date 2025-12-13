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
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
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
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center text-white">
              <Lock className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Locked</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-xl font-bold text-slate-800 flex-1">
            {course.title}
          </h3>
          {course.category && (
            <Badge className={cn('text-xs font-medium border', categoryColors[course.category] || categoryColors.other)}>
              {course.category}
            </Badge>
          )}
        </div>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {course.description || 'No description available'}
        </p>

        {course.features && course.features.length > 0 && (
          <div className="space-y-1 mb-4">
            {course.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="line-clamp-1">{feature}</span>
              </div>
            ))}
            {course.features.length > 3 && (
              <p className="text-xs text-slate-500 pl-6">+{course.features.length - 3} more</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(course.enrollment_duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          {course.is_locked && !hasAccess && course.price && (
            <span className="text-lg font-bold text-indigo-600">
              ${course.price}
            </span>
          )}
          
          {user ? (
            <Link 
              to={createPageUrl(`CourseDetail?id=${course.id}`)}
              className="ml-auto"
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