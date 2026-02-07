import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImageLightbox({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(prev => Math.max(0.25, Math.min(5, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div 
      className="fixed inset-0 z-[9999] bg-black/90 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Toolbar */}
      <motion.div 
        className="flex items-center justify-between px-4 py-3 bg-black/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: isClosing ? -20 : 0, opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.25, delay: isClosing ? 0 : 0.1 }}
      >
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/80 text-sm font-mono min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        <button onClick={handleClose} className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Image */}
      <div 
        ref={containerRef}
        className={cn("flex-1 overflow-hidden flex items-center justify-center", scale > 1 ? "cursor-grab" : "cursor-default", isDragging && "cursor-grabbing")}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.img
          src={src}
          alt={alt || 'Image'}
          className="max-w-none select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isClosing ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            maxHeight: scale <= 1 ? '90vh' : 'none',
            maxWidth: scale <= 1 ? '90vw' : 'none',
          }}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}