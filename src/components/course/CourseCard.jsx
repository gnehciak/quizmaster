import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Lock, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

export default function CourseCard({ course, index, hasAccess, user }) {

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
        <h3 className="text-xl font-bold text-slate-800 mb-3">
          {course.title}
        </h3>

        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {course.description || 'No description available'}
        </p>

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
              <Button className="gap-2">
                {hasAccess ? 'View Course' : 'Unlock'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
              className="gap-2 ml-auto"
            >
              {hasAccess ? 'View Course' : 'Unlock'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}