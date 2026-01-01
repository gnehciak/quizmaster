import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Pencil,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CourseAdminTools({ 
  onEdit, 
  onAddContent, 
  onManageStudents, 
  onAnalytics, 
  editMode,
  setEditMode 
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900 text-white p-2 rounded-xl shadow-lg mb-6 sticky top-20 z-30 backdrop-blur-md bg-opacity-90">
      <div className="px-3 font-semibold text-sm flex items-center gap-2 border-r border-slate-700 mr-1">
        <Settings className="w-4 h-4" />
        Admin Tools
      </div>
      
      <Button 
        variant={editMode ? "secondary" : "ghost"} 
        size="sm" 
        onClick={() => setEditMode(!editMode)} 
        className="text-xs hover:bg-slate-700 hover:text-white"
      >
        <Pencil className="w-3.5 h-3.5 mr-2" />
        {editMode ? 'Done Editing' : 'Edit Content'}
      </Button>

      {editMode && (
        <>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onEdit} 
            className="text-xs hover:bg-slate-700 hover:text-white"
          >
            Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onAddContent} 
            className="text-xs hover:bg-slate-700 hover:text-white bg-indigo-600/20 text-indigo-200"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Block
          </Button>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onManageStudents} 
          className="text-xs hover:bg-slate-700 hover:text-white"
        >
          <Users className="w-3.5 h-3.5 mr-2" />
          Students
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAnalytics} 
          className="text-xs hover:bg-slate-700 hover:text-white"
        >
          <BarChart3 className="w-3.5 h-3.5 mr-2" />
          Analytics
        </Button>
      </div>
    </div>
  );
}