import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Code2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  className,
  minHeight = '100px'
}) {
  const [showRaw, setShowRaw] = useState(false);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      [{ 'background': [] }]
    ]
  };

  const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'background'];

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowRaw(!showRaw)}
          className="h-7 px-2 gap-1.5 bg-white shadow-sm"
        >
          {showRaw ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs">Formatted</span>
            </>
          ) : (
            <>
              <Code2 className="w-3.5 h-3.5" />
              <span className="text-xs">Raw</span>
            </>
          )}
        </Button>
      </div>

      {showRaw ? (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("font-mono text-xs", className)}
          style={{ minHeight }}
        />
      ) : (
        <ReactQuill
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          modules={quillModules}
          formats={quillFormats}
          className={cn("bg-white rounded-lg", className)}
          style={{ minHeight }}
        />
      )}
    </div>
  );
}