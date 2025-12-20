import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Lock, Unlock, DollarSign, ExternalLink, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CourseManageCard({ course, index, onEdit, onDelete, onDuplicate, viewMode = 'card' }) {
  
  if (viewMode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-800 truncate">{course.title}</h3>
              {course.is_locked ? (
                <Lock className="w-3 h-3 text-amber-600" />
              ) : (
                <Unlock className="w-3 h-3 text-green-600" />
              )}
              {course.price && <span className="text-xs text-slate-500">${course.price}</span>}
            </div>
            {course.category && (
              <span className="text-xs text-slate-500">{course.category}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              onClick={() => onEdit(course)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onDuplicate(course)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onDelete(course.id)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
      >
        <div className="flex gap-6">
          {course.image_url ? (
            <img 
              src={course.image_url} 
              alt={course.title}
              className="w-32 h-32 rounded-lg object-cover"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
              <div className="text-4xl font-bold text-indigo-200">
                {course.title?.charAt(0) || 'C'}
              </div>
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-bold text-xl text-slate-800 mb-2">{course.title}</h3>
            {course.description && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{course.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {course.category && (
                <Badge variant="outline" className="text-xs">
                  {course.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {course.content_blocks?.length || 0} content blocks
              </Badge>
              {course.is_locked ? (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <Unlock className="w-3 h-3 mr-1" />
                  Free
                </Badge>
              )}
              {course.price && (
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {course.price}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link to={createPageUrl(`CourseDetail?id=${course.id}`)}>
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <ExternalLink className="w-4 h-4" />
                Open
              </Button>
            </Link>
            <Button
              onClick={() => onEdit(course)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              onClick={() => onDuplicate(course)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </Button>
            <Button
              onClick={() => onDelete(course.id)}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
    >
      {/* Course Image */}
      <div className="relative">
        {course.image_url ? (
          <div className="h-48 overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100">
            <img 
              src={course.image_url} 
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center">
            <div className="text-6xl font-bold text-white/50">
              {course.title?.charAt(0) || 'C'}
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex gap-2">
          {course.is_locked ? (
            <div className="px-3 py-1.5 bg-amber-500/90 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Locked
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-emerald-500/90 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1">
              <Unlock className="w-3 h-3" />
              Free
            </div>
          )}
          {course.price && (
            <div className="px-3 py-1.5 bg-indigo-500/90 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${course.price}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Category */}
        {course.category && (
          <div className="mb-2">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium">
              {course.category}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
            <span>{course.content_blocks?.length || 0} blocks</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={createPageUrl(`CourseDetail?id=${course.id}`)} className="flex-1">
            <Button
              size="sm"
              className="w-full gap-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-xs">Open</span>
            </Button>
          </Link>
          <Button
            onClick={() => onEdit(course)}
            size="sm"
            className="flex-1 gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="text-xs">Edit</span>
          </Button>
          <Button
            onClick={() => onDuplicate(course)}
            size="sm"
            className="flex-1 gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-xs">Duplicate</span>
          </Button>
          <Button
            onClick={() => onDelete(course.id)}
            size="sm"
            className="w-9 p-0 bg-red-100 hover:bg-red-200 text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}