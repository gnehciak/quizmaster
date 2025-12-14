import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

export default function CategoryFilter({ selectedCategory, onCategoryChange, quizCounts = {} }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
  });

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Filter by Category
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {/* All categories button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCategoryChange('all')}
          className={cn(
            "px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all",
            "flex items-center gap-2",
            selectedCategory === 'all' && "bg-indigo-100 text-indigo-700 border-indigo-300",
            selectedCategory !== 'all' && "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <Lightbulb className="w-4 h-4" />
          <span>All Categories</span>
          {Object.values(quizCounts).reduce((sum, c) => sum + c, 0) > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1 px-1.5 py-0 text-xs h-5 min-w-[20px]",
                selectedCategory === 'all' ? "bg-white/50" : "bg-slate-100"
              )}
            >
              {Object.values(quizCounts).reduce((sum, c) => sum + c, 0)}
            </Badge>
          )}
        </motion.button>

        {/* Individual category buttons */}
        {sortedCategories.map((category) => {
          const count = quizCounts[category.id] || 0;
          const isSelected = selectedCategory === category.id;

          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all",
                "flex items-center gap-2",
                isSelected && "bg-indigo-100 text-indigo-700 border-indigo-300",
                !isSelected && "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Lightbulb className="w-4 h-4" />
              <span>{category.name}</span>
              {count > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-1 px-1.5 py-0 text-xs h-5 min-w-[20px]",
                    isSelected ? "bg-white/50" : "bg-slate-100"
                  )}
                >
                  {count}
                </Badge>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}