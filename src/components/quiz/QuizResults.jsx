import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw, Home, CheckCircle2, XCircle, BookOpen, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuizResults({ score, total, onRetry, quizTitle, onReview, courseId, hasLongResponseQuestions }) {
  const percentage = Math.round((score / total) * 100);
  
  const getGrade = () => {
    if (percentage >= 90) return { label: 'Excellent!', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (percentage >= 70) return { label: 'Good Job!', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (percentage >= 50) return { label: 'Keep Practicing', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { label: 'Try Again', color: 'text-red-600', bg: 'bg-red-100' };
  };
  
  const grade = getGrade();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className={cn(
          "w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center",
          grade.bg
        )}
      >
        <Trophy className={cn("w-12 h-12", grade.color)} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          Quiz Complete!
        </h2>
        <p className="text-slate-500 mb-8">{quizTitle}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8"
      >
        <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
          {percentage}%
        </div>
        <p className={cn("text-xl font-semibold mb-4", grade.color)}>
          {grade.label}
        </p>
        
        <div className="flex items-center justify-center gap-8 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-slate-600">
              <span className="font-semibold text-emerald-600">{score}</span> Correct
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-slate-600">
              <span className="font-semibold text-red-500">{total - score}</span> Wrong
            </span>
          </div>
        </div>
      </motion.div>

      {hasLongResponseQuestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold">This quiz contains long response questions</p>
              <p className="text-sm text-amber-700">
                Your written answers will be marked by AI when you review your answers.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-3 justify-center flex-wrap"
      >
        <Button
          size="lg"
          onClick={onReview}
          className={cn(
            "gap-2",
            hasLongResponseQuestions 
              ? "bg-indigo-600 hover:bg-indigo-700" 
              : ""
          )}
          variant={hasLongResponseQuestions ? "default" : "outline"}
        >
          <FileText className="w-4 h-4" />
          {hasLongResponseQuestions ? 'Review & Mark Answers' : 'Review Answers'}
        </Button>
        
        <Link to={courseId ? createPageUrl(`CourseDetail?id=${courseId}`) : createPageUrl('Home')}>
          <Button size="lg" className={cn(
            "gap-2",
            hasLongResponseQuestions 
              ? "" 
              : "bg-indigo-600 hover:bg-indigo-700"
          )} variant={hasLongResponseQuestions ? "outline" : "default"}>
            <BookOpen className="w-4 h-4" />
            {courseId ? 'Back to Course' : 'Back to Courses'}
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}