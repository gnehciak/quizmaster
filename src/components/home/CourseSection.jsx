import React, { useState } from 'react';
import CourseCard from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Edit, BookOpen, PenTool, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  accessMap, 
  categoryLink, 
  iconName, 
  color = "indigo",
  onUpdate,
  editMode
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
      onUpdate({ title, description, categoryLink, iconName, color, [field]: value });
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
                  <Label>Category Link (optional)</Label>
                  <Input value={categoryLink} onChange={(e) => handleUpdate('categoryLink', e.target.value)} placeholder="/courses/category" />
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