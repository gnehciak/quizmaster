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

  const allCategories = ['all', ...categories.map(c => c.name)];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Filter by Category
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {allCategories.map((category) => {
          const isAll = category === 'all';
          const count = isAll 
            ? Object.values(quizCounts).reduce((sum, c) => sum + c, 0)
            : quizCounts[category] || 0;
          const isSelected = selectedCategory === category;

          return (
            <motion.button
              key={category}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onCategoryChange(category)}
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all",
                "flex items-center gap-2",
                isSelected && "bg-indigo-100 text-indigo-700 border-indigo-300",
                !isSelected && "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Lightbulb className="w-4 h-4" />
              <span>{isAll ? 'All Categories' : category}</span>
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