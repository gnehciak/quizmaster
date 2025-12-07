import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Trash2, ChevronLeft } from 'lucide-react';

export default function ManageCourses() {
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCourse?.id) {
        return base44.entities.Course.update(editingCourse.id, data);
      }
      return base44.entities.Course.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setDialogOpen(false);
      setEditingCourse(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      is_locked: formData.get('is_locked') === 'true',
      unlock_code: formData.get('unlock_code') || undefined,
      price: formData.get('price') ? parseFloat(formData.get('price')) : undefined
    };
    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-800">Manage Courses</h1>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCourse(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? 'Edit Course' : 'Create Course'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input name="title" defaultValue={editingCourse?.title} required />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea name="description" defaultValue={editingCourse?.description} />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select name="category" defaultValue={editingCourse?.category}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Locked</Label>
                    <Select name="is_locked" defaultValue={editingCourse?.is_locked?.toString() || 'true'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes - Requires unlock</SelectItem>
                        <SelectItem value="false">No - Free access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Unlock Code (optional)</Label>
                    <Input name="unlock_code" defaultValue={editingCourse?.unlock_code} />
                  </div>

                  <div>
                    <Label>Price (optional)</Label>
                    <Input name="price" type="number" step="0.01" defaultValue={editingCourse?.price} />
                  </div>



                  <Button type="submit" className="w-full">
                    {editingCourse ? 'Update Course' : 'Create Course'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-4">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-xl border p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{course.title}</h3>
                <p className="text-sm text-slate-500">{course.description}</p>
                <div className="flex gap-2 mt-2">
                  {course.is_locked && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                      Locked
                    </span>
                  )}
                  {course.price && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                      ${course.price}
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                    {course.quiz_ids?.length || 0} quizzes
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditingCourse(course);
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (confirm('Delete this course?')) {
                      deleteMutation.mutate(course.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}