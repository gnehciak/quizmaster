import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryConfig } from '@/components/quiz/CategoryFilter';

export default function CourseCard({ course, index, hasAccess }) {
  const Icon = categoryConfig[course.category]?.icon;
  const color = categoryConfig[course.category]?.color;

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
            {Icon && <Icon className="w-20 h-20 text-indigo-300" />}
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
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-slate-800 flex-1">
            {course.title}
          </h3>
          {Icon && (
            <div className={cn("p-2 rounded-lg", color)}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {course.description || 'No description available'}
        </p>

        <div className="flex items-center justify-between">
          {course.is_locked && !hasAccess && course.price && (
            <span className="text-lg font-bold text-indigo-600">
              ${course.price}
            </span>
          )}
          
          <Link 
            to={createPageUrl(`CourseDetail?id=${course.id}`)}
            className="ml-auto"
          >
            <Button className="gap-2">
              {hasAccess ? 'View Course' : 'Unlock'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}