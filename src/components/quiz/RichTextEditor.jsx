import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  className,
  minHeight
}) {
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      [{ 'background': [] }],
      [{ 'align': [] }]
    ]
  };

  const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'background', 'align'];

  return (
    <div className={cn("flex flex-col h-full rich-text-editor-wrapper", className)}>
      <ReactQuill
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        modules={quillModules}
        formats={quillFormats}
        className="flex-1 flex flex-col overflow-hidden"
        theme="snow"
      />
      <style>{`
        .rich-text-editor-wrapper .quill {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .rich-text-editor-wrapper .ql-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: inherit;
          font-size: 1rem;
        }
        .rich-text-editor-wrapper .ql-editor {
          flex: 1;
          overflow-y: auto;
          font-family: inherit;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background-color: #f8fafc;
          border-color: #e2e8f0;
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          background-color: white;
          border-color: #e2e8f0;
        }
      `}</style>
    </div>
  );
}