import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from 'lucide-react';

export default function SortFilter({ sortBy, onSortChange }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <ArrowUpDown className="w-4 h-4" />
        <span className="font-medium">Sort by:</span>
      </div>
      
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px] border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="title_asc">Title (A-Z)</SelectItem>
          <SelectItem value="title_desc">Title (Z-A)</SelectItem>
          <SelectItem value="questions_most">Most Questions</SelectItem>
          <SelectItem value="questions_least">Least Questions</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}