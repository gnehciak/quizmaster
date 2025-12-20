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
import { Plus, BookOpen, Search, Sparkles, ChevronLeft, FolderEdit, Trash2, Pencil, GripVertical, LayoutGrid, List, ListOrdered, Upload, Loader2, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Skeleton } from '@/components/ui/skeleton';
import CourseManageCard from '@/components/course/CourseManageCard';

export default function ManageCourses() {
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
          window.location.href = createPageUrl('Home');
          return null;
        }
        return currentUser;
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
        return null;
      }
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list('-created_date'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['courseCategories'],
    queryFn: () => base44.entities.CourseCategory.list(),
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

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CourseCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      setCategoryName('');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CourseCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
      setEditingCategory(null);
      setCategoryName('');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CourseCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courseCategories'] })
  });

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '');
      default:
        return 0;
    }
  });

  // Calculate course counts by category
  const courseCounts = courses.reduce((acc, course) => {
    const category = course.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      visibility: formData.get('visibility') || 'public',
      is_locked: formData.get('is_locked') === 'true',
      unlock_code: formData.get('unlock_code') || undefined,
      price: formData.get('price') ? parseFloat(formData.get('price')) : undefined,
      enrollment_duration: formData.get('enrollment_duration') ? parseInt(formData.get('enrollment_duration')) : 365,
      image_url: tempImageUrl || undefined,
      features: features.length > 0 ? features : undefined
    };
    saveMutation.mutate(data);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setTempImageUrl(course.image_url);
    setFeatures(course.features || []);
    setDialogOpen(true);
  };

  const handleImageUpload = async (file) => {
    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setTempImageUrl(result.file_url);
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploadingImage(false);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleDuplicate = async (course) => {
    const duplicateData = {
      title: `${course.title} (Copy)`,
      description: course.description,
      category: course.category,
      visibility: course.visibility,
      is_locked: course.is_locked,
      unlock_code: course.unlock_code,
      price: course.price,
      enrollment_duration: course.enrollment_duration,
      image_url: course.image_url,
      features: course.features,
      content_blocks: course.content_blocks,
      quiz_ids: course.quiz_ids
    };
    await base44.entities.Course.create(duplicateData);
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const handleCreateCategory = () => {
    if (!categoryName.trim()) return;
    createCategoryMutation.mutate({ name: categoryName });
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !categoryName.trim()) return;
    updateCategoryMutation.mutate({ id: editingCategory.id, data: { name: categoryName } });
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('Delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(categories);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    // Update order for all categories
    items.forEach((cat, idx) => {
      base44.entities.CourseCategory.update(cat.id, { order: idx });
    });
    
    queryClient.invalidateQueries({ queryKey: ['courseCategories'] });
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
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('AdminDashboard')}>
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Manage Courses</h1>
                <p className="text-sm text-slate-500">Create and organize courses</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                setCategoryDialogOpen(open);
                if (!open) {
                  setEditingCategory(null);
                  setCategoryName('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FolderEdit className="w-4 h-4" />
                    Edit Categories
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Course Categories</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Add New Category */}
                    <div className="space-y-3">
                      <Label>Add New Category</Label>
                      <div className="flex gap-2">
                        <Input
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="e.g. Programming"
                          disabled={!!editingCategory}
                        />
                        <Button 
                          onClick={handleCreateCategory} 
                          disabled={!categoryName.trim() || !!editingCategory}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Existing Categories */}
                    <div className="space-y-3">
                      <Label>Existing Categories (drag to reorder)</Label>
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="categories">
                          {(provided) => (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className="space-y-2 max-h-96 overflow-y-auto"
                            >
                              {categories.map((category, index) => (
                                <Draggable key={category.id} draggableId={category.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 ${
                                        snapshot.isDragging ? 'shadow-lg border-indigo-400' : ''
                                      }`}
                                    >
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing" />
                                      </div>
                                      
                                      {editingCategory?.id === category.id ? (
                                        <>
                                          <Input
                                            value={categoryName}
                                            onChange={(e) => setCategoryName(e.target.value)}
                                            className="flex-1"
                                          />
                                          <Button
                                            size="sm"
                                            onClick={handleUpdateCategory}
                                            disabled={!categoryName.trim()}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingCategory(null);
                                              setCategoryName('');
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="flex-1 font-medium text-slate-800">
                                            {category.name}
                                          </span>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEditCategory(category)}
                                            className="text-slate-400 hover:text-indigo-600"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className="text-slate-400 hover:text-red-600"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {categories.length === 0 && (
                                <p className="text-center text-slate-500 py-4">
                                  No categories yet. Add one to get started.
                                </p>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingCourse(null);
                  setTempImageUrl(null);
                  setFeatures([]);
                  setNewFeature('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                    <Plus className="w-4 h-4" />
                    Create Course
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
                    <Label>Cover Image</Label>
                    <div className="mt-2">
                      {tempImageUrl ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200">
                          <img src={tempImageUrl} alt="Cover" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setTempImageUrl(null)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                          onClick={() => document.getElementById('cover-upload').click()}
                        >
                          <input
                            id="cover-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleImageUpload(file);
                            }}
                          />
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                          ) : (
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          )}
                          <p className="text-sm text-slate-600">
                            {uploadingImage ? 'Uploading...' : 'Drag and drop an image or click to browse'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

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
                    <Label>Visibility</Label>
                    <Select name="visibility" defaultValue={editingCourse?.visibility || 'public'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Shown on home page</SelectItem>
                        <SelectItem value="unlisted">Unlisted - Link only, show in My Courses</SelectItem>
                        <SelectItem value="private">Private - Creator & admin only</SelectItem>
                        <SelectItem value="admin">Admin - Admin only</SelectItem>
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

                  <div>
                    <Label>Enrollment Duration (days)</Label>
                    <Input name="enrollment_duration" type="number" defaultValue={editingCourse?.enrollment_duration || 365} />
                    <p className="text-xs text-slate-500 mt-1">How many days students have access after enrollment</p>
                  </div>

                  <div>
                    <Label>Features</Label>
                    <div className="space-y-2">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                          <span className="flex-1 text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFeature(index)}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Add a feature..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFeature();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleAddFeature}
                          variant="outline"
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </div>
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
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base bg-white border-slate-200 rounded-xl shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Categories
              <span className="ml-2 text-xs opacity-70">({courses.length})</span>
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.name)}
                className="whitespace-nowrap"
              >
                {cat.name}
                <span className="ml-2 text-xs opacity-70">
                  ({courseCounts[cat.name] || 0})
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-800">{sortedCourses.length}</span> course{sortedCourses.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-l px-3"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="rounded-none border-l px-3"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Courses Grid */}
        {userLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
                <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : sortedCourses.length > 0 ? (
          <div className={
            viewMode === 'card' ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6" :
            viewMode === 'list' ? "space-y-4" :
            "space-y-2"
          }>
            {sortedCourses.map((course, idx) => (
              <CourseManageCard
                key={course.id}
                course={course}
                index={idx}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-indigo-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? 'No courses found' : 'No courses yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm ? 'Try a different search term' : 'Create your first course to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4" />
                Create Your First Course
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}