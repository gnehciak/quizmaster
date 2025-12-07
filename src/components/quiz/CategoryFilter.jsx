import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Calculator,
  Landmark,
  Globe,
  BookOpen,
  Laptop,
  Languages,
  Palette,
  Briefcase,
  Heart,
  Trophy,
  Lightbulb,
  Layers
} from 'lucide-react';

const categoryConfig = {
  science: { label: 'Science', icon: FlaskConical, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' },
  mathematics: { label: 'Mathematics', icon: Calculator, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' },
  history: { label: 'History', icon: Landmark, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' },
  geography: { label: 'Geography', icon: Globe, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200' },
  literature: { label: 'Literature', icon: BookOpen, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200' },
  technology: { label: 'Technology', icon: Laptop, color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' },
  languages: { label: 'Languages', icon: Languages, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-200' },
  arts: { label: 'Arts', icon: Palette, color: 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200' },
  business: { label: 'Business', icon: Briefcase, color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200' },
  health: { label: 'Health', icon: Heart, color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' },
  sports: { label: 'Sports', icon: Trophy, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' },
  general_knowledge: { label: 'General Knowledge', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200' },
  other: { label: 'Other', icon: Layers, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200' }
};

export default function CategoryFilter({ selectedCategory, onCategoryChange, quizCounts = {} }) {
  const categories = ['all', ...Object.keys(categoryConfig)];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Filter by Category
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isAll = category === 'all';
          const config = isAll ? null : categoryConfig[category];
          const Icon = config?.icon;
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
                isSelected && !isAll && config?.color,
                isSelected && isAll && "bg-indigo-100 text-indigo-700 border-indigo-300",
                !isSelected && "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{isAll ? 'All Categories' : config.label}</span>
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

export { categoryConfig };