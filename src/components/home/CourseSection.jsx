import React, { useState, useCallback, useEffect } from 'react';
import CourseCard from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Edit, BookOpen, PenTool, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_MAP = {
  BookOpen: BookOpen,
  PenTool: PenTool,
  GraduationCap: GraduationCap
};

export default function CourseSection({ 
  title, 
  description, 
  courses, 
  categories = [],
  categoryFilter,
  accessMap, 
  categoryLink, 
  iconName, 
  color = "indigo",
  onUpdate,
  editMode
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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

  const Icon = ICON_MAP[iconName] || BookOpen;

  const handleUpdate = (field, value) => {
    if (onUpdate) {
      onUpdate({ title, description, categoryLink, categoryFilter, iconName, color, [field]: value });
    }
  };

  return (
    <section className="py-20 border-b border-slate-100 relative group/section">
      {editMode && onUpdate && (
        <div className="absolute top-4 right-4 z-10">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="shadow-lg gap-2">
                <Edit className="w-4 h-4" /> Edit Section Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Course Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input value={title} onChange={(e) => handleUpdate('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => handleUpdate('description', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Filter by Category</Label>
                  <Select 
                    value={categoryFilter || 'all'} 
                    onValueChange={(val) => handleUpdate('categoryFilter', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select 
                    value={iconName} 
                    onValueChange={(val) => handleUpdate('iconName', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ICON_MAP).map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <Select 
                    value={color} 
                    onValueChange={(val) => handleUpdate('color', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indigo">Indigo</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="emerald">Emerald</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
          <div className="relative group/carousel">
            <div className="overflow-visible" ref={emblaRef}>
              <div className="flex -ml-8 py-4 px-4 -mx-4">
                {courses.map((course, idx) => (
                  <div key={course.id} className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] pl-8">
                    <CourseCard 
                      course={course} 
                      index={idx} 
                      access={accessMap[course.id]} 
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Scroll Shadows */}
            {canScrollPrev && (
               <div className="absolute -left-2 top-0 bottom-0 w-24 bg-gradient-to-r from-white via-white/70 to-transparent z-10 pointer-events-none" />
            )}
            {canScrollNext && (
               <div className="absolute -right-2 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white/70 to-transparent z-10 pointer-events-none" />
            )}
            
            {courses.length > 3 && (
              <>
                <button
                  onClick={scrollPrev}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-800 transition-all duration-300 z-20 hover:bg-slate-50 hover:scale-110 ${!canScrollPrev ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={scrollNext}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-800 transition-all duration-300 z-20 hover:bg-slate-50 hover:scale-110 ${!canScrollNext ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
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