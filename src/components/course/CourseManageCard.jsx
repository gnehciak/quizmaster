import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Lock, Unlock, DollarSign, ExternalLink, Copy, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CourseManageCard({ course, index, onEdit, onDelete, onDuplicate, viewMode = 'card' }) {
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
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
        {/* Title & ID */}
        <div className="mb-3">
          <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1" title={course.title}>
            {course.title}
          </h3>
          <div className="flex items-center gap-2 group/id">
            <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
              ID: {course.id.substring(0, 8)}...
            </code>
            <button 
              onClick={(e) => {
                e.preventDefault();
                copyToClipboard(course.id);
              }}
              className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
              title="Copy ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem]">
            {stripHtml(course.description)}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4 min-h-[24px]">
          {course.category && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-6 bg-slate-100 text-slate-600 border border-slate-200">
              {course.category}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-6 bg-slate-100 text-slate-600 border border-slate-200">
            {course.content_blocks?.length || 0} blocks
          </Badge>
          {course.is_locked ? (
            <Badge className="text-[10px] px-2 py-0.5 h-6 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          ) : (
            <Badge className="text-[10px] px-2 py-0.5 h-6 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              <Unlock className="w-3 h-3 mr-1" />
              Free
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-5 gap-2">
          <Button
            onClick={() => onEdit(course)}
            className="col-span-2 gap-2 bg-slate-900 hover:bg-slate-800 h-9 text-xs"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </Button>
          
          <Link to={createPageUrl(`CourseDetail?id=${course.id}`)} className="col-span-1">
            <Button 
              variant="outline" 
              className="w-full h-9 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
              title="Open Course"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            onClick={() => onDuplicate(course)}
            className="col-span-1 h-9 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"
            title="Duplicate Course"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <div className="col-span-1 relative group/menu">
            <Button 
              variant="outline" 
              className="w-full h-9 hover:bg-slate-50"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
            <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block min-w-[120px] bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-10">
              <button 
                onClick={() => onDelete(course.id)}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Delete Course
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}