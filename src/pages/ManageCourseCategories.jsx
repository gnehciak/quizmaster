import React, { useState, useEffect } from 'react';
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
import { Plus, Trash2, ChevronLeft, Pencil, BookOpen, GripVertical, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

export default function ManageCourseCategories() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [sortBy, setSortBy] = useState('custom');
  const [searchTerm, setSearchTerm] = useState('');

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
    queryKey: ['courseCategories'],
    queryFn: () => base44.entities.CourseCategory.list(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CourseCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      setDialogOpen(false);
      setCategoryName('');
      toast.success('Category created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CourseCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      setEditDialogOpen(false);
      setEditingCategory(null);
      setEditName('');
      toast.success('Category updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CourseCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      toast.success('Category deleted successfully');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: (updates) => Promise.all(updates.map(u => base44.entities.CourseCategory.update(u.id, { order: u.order }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
    }
  });

  const handleCreate = () => {
    if (!categoryName.trim()) return;
    const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
    createMutation.mutate({ 
      name: categoryName,
      order: maxOrder + 1
    });
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

  // Calculate course counts per category (by name)
  const courseCounts = courses.reduce((acc, course) => {
    const catName = course.category;
    if (catName) {
      acc[catName] = (acc[catName] || 0) + 1;
    }
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = React.useMemo(() => {
    let filtered = categories.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const countA = courseCounts[a.name] || 0;
      const countB = courseCounts[b.name] || 0;

      switch (sortBy) {
        case 'custom':
          return (a.order || 0) - (b.order || 0);
        case 'alpha':
          return a.name.localeCompare(b.name);
        case 'alpha_reverse':
          return b.name.localeCompare(a.name);
        case 'newest':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'most_courses':
          return countB - countA;
        case 'least_courses':
          return countA - countB;
        default:
          return (a.order || 0) - (b.order || 0);
      }
    });
  }, [categories, searchTerm, sortBy, courseCounts]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (sortBy !== 'custom') return;

    const items = Array.from(sortedCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      order: index
    }));
    
    updateOrderMutation.mutate(updates);
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
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('ManageCourses')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Manage Course Categories</h1>
                <p className="text-sm text-slate-500">Organize your course categories</p>
              </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md">
                  <Plus className="w-4 h-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g. Science"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!categoryName.trim() || createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 whitespace-nowrap">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Order (Drag & Drop)</SelectItem>
                <SelectItem value="alpha">A → Z</SelectItem>
                <SelectItem value="alpha_reverse">Z → A</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="most_courses">Most Courses</SelectItem>
                <SelectItem value="least_courses">Least Courses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {sortedCategories.length > 0 ? (
                    sortedCategories.map((category, index) => {
                      const count = courseCounts[category.name] || 0;
                      return (
                        <Draggable 
                          key={category.id} 
                          draggableId={category.id} 
                          index={index}
                          isDragDisabled={sortBy !== 'custom' || searchTerm !== ''}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group bg-white rounded-lg border p-4 flex items-center gap-4 transition-all ${
                                snapshot.isDragging 
                                  ? 'shadow-xl border-indigo-400 rotate-1 z-50 scale-105' 
                                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                              }`}
                            >
                              <div 
                                {...provided.dragHandleProps}
                                className={`p-2 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing ${
                                  sortBy !== 'custom' || searchTerm !== '' ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'
                                }`}
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 text-lg leading-tight truncate">
                                  {category.name}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {count} course{count !== 1 ? 's' : ''}
                                  </span>
                                  {category.created_date && (
                                    <span className="text-xs">
                                      Created {new Date(category.created_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(category)}
                                  className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  title="Edit"
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
                                  className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900">No categories found</h3>
                      <p className="text-slate-500 mt-1">
                        {searchTerm ? 'Try a different search term' : 'Create a category to get started'}
                      </p>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Science"
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full" disabled={!editName.trim() || updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Category'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}