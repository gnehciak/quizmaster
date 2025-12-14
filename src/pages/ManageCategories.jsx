import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, ChevronLeft, Pencil, FileQuestion } from 'lucide-react';

export default function ManageCategories() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [sortBy, setSortBy] = useState('alpha');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['quizCategories'],
    queryFn: () => base44.entities.QuizCategory.list(),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizCategories'] });
      setDialogOpen(false);
      setCategoryName('');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuizCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizCategories'] });
      setEditDialogOpen(false);
      setEditingCategory(null);
      setEditName('');
    }
  });



  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QuizCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizCategories'] })
  });

  const handleCreate = () => {
    if (!categoryName.trim()) return;
    createMutation.mutate({ name: categoryName });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editName.trim()) return;
    updateMutation.mutate({ id: editingCategory.id, data: { name: editName } });
  };

  // Calculate quiz counts per category
  const quizCounts = quizzes.reduce((acc, quiz) => {
    const categoryId = quiz.category_id || quiz.category;
    if (categoryId) {
      acc[categoryId] = (acc[categoryId] || 0) + 1;
    }
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = [...categories].sort((a, b) => {
    const countA = quizCounts[a.id] || 0;
    const countB = quizCounts[b.id] || 0;

    switch (sortBy) {
      case 'alpha':
        return a.name.localeCompare(b.name);
      case 'alpha_reverse':
        return b.name.localeCompare(a.name);
      case 'newest':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'most_quizzes':
        return countB - countA;
      case 'least_quizzes':
        return countA - countB;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('ManageQuizzes')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-800">Manage Quiz Categories</h1>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Category Name</Label>
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Mathematics"
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!categoryName.trim()}>
                    Create Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {categories.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">A → Z</SelectItem>
                  <SelectItem value="alpha_reverse">Z → A</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="most_quizzes">Most Quizzes</SelectItem>
                  <SelectItem value="least_quizzes">Least Quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const quizCount = quizCounts[category.id] || 0;
            return (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FileQuestion className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-lg mb-1">{category.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}</span>
                        <span>•</span>
                        <span>Created {new Date(category.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete category "${category.name}"?`)) {
                          deleteMutation.mutate(category.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="text-slate-500 text-center py-8">
              No categories yet. Create one to get started.
            </p>
          )}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Mathematics"
                />
              </div>
              <Button onClick={handleUpdate} className="w-full" disabled={!editName.trim()}>
                Update Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}