import React from 'react';
import CourseCard from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CourseSection({ title, description, courses, accessMap, categoryLink, icon: Icon, color = "indigo" }) {
  const bgColors = {
    indigo: "bg-indigo-50",
    purple: "bg-purple-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50"
  };

  const textColors = {
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600"
  };

  return (
    <section className="py-20 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgColors[color]} ${textColors[color]} text-sm font-medium mb-4`}>
              {Icon && <Icon className="w-4 h-4" />}
              {title}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{title}</h2>
            <p className="text-lg text-slate-600">{description}</p>
          </div>
          {categoryLink && (
            <Link to={categoryLink}>
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>

        {courses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.slice(0, 3).map((course, idx) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                index={idx} 
                access={accessMap[course.id]} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-500">Coming soon. Stay tuned for new courses in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
}