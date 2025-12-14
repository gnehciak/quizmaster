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
import { Plus, Trash2, ChevronLeft, Pencil, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManageCategories() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');

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

  const reorderMutation = useMutation({
    mutationFn: async (reorderedCategories) => {
      // Update all categories with new order
      await Promise.all(
        reorderedCategories.map((cat, index) =>
          base44.entities.QuizCategory.update(cat.id, { order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizCategories'] });
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    reorderMutation.mutate(items);
  };

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
          <p className="text-sm text-slate-500 mb-4">Drag and drop to reorder categories</p>
        )}
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="grid sm:grid-cols-2 gap-4"
              >
                {categories.map((category, index) => (
                  <Draggable key={category.id} draggableId={category.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-shadow ${
                          snapshot.isDragging ? 'shadow-lg border-indigo-300' : ''
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-800 flex-1">{category.name}</span>
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {categories.length === 0 && (
                  <p className="text-slate-500 col-span-2 text-center py-8">
                    No categories yet. Create one to get started.
                  </p>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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