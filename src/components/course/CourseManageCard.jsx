import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Lock, Unlock, DollarSign } from 'lucide-react';

export default function CourseManageCard({ course, index, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Course Image */}
      {course.image_url && (
        <div className="h-48 overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100">
          <img 
            src={course.image_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!course.image_url && (
        <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <div className="text-6xl font-bold text-indigo-200">
            {course.title?.charAt(0) || 'C'}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Title */}
        <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4">
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
              ${course.price}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => onEdit(course)}
            variant="outline"
            className="flex-1 gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(course.id)}
            variant="outline"
            className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}