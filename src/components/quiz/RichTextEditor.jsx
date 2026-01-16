import React, { useState, useRef, useCallback } from 'react';
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
  minHeight = '100px',
  hideRawView = false,
  disableLinks = false,
  disableHighlight = false
}) {
  const [showRaw, setShowRaw] = useState(false);
  const lastValueRef = useRef(value);

  const modules = React.useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ...(disableLinks ? [] : [['link']]),
      ...(disableHighlight ? [] : [[{ 'background': [] }]]),
      [{ 'align': [] }]
    ]
  }), [disableLinks, disableHighlight]);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'list', 'bullet', 'align',
    ...(disableLinks ? [] : ['link']),
    ...(disableHighlight ? [] : ['background'])
  ];

  const handleChange = useCallback((newValue) => {
    // Only call onChange if the value actually changed
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue;
      onChange(newValue);
    }
  }, [onChange]);

  // Update ref when value prop changes externally
  React.useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return (
    <div className={cn("relative flex flex-col", className)}>
      {!hideRawView && (
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
      )}

      {showRaw ? (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs flex-1"
          style={{ minHeight }}
        />
      ) : (
        <ReactQuill
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          className="bg-white rounded-lg flex-1 flex flex-col [&>.ql-container]:flex-1 [&>.ql-container]:rounded-b-lg [&>.ql-toolbar]:rounded-t-lg"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}