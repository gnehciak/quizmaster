import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ImageLightbox from './ImageLightbox';

export function useImageLightbox(containerRef) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const attachImageHandlers = useCallback(() => {
    if (!containerRef?.current) return;

    const images = containerRef.current.querySelectorAll('.prose img, [dangerouslySetInnerHTML] img');
    
    images.forEach(img => {
      if (img.dataset.lightboxAttached) return;
      img.dataset.lightboxAttached = 'true';
      
      // Add hover magnifier cursor
      img.style.cursor = 'zoom-in';
      img.style.transition = 'opacity 0.2s';
      
      // Create magnifier overlay on hover
      const showOverlay = () => {
        if (img.dataset.overlayActive) return;
        img.dataset.overlayActive = 'true';
        img.style.opacity = '0.9';
      };
      
      const hideOverlay = () => {
        delete img.dataset.overlayActive;
        img.style.opacity = '1';
      };

      img.addEventListener('mouseenter', showOverlay);
      img.addEventListener('mouseleave', hideOverlay);
      
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(img.src);
      });
    });
  }, [containerRef]);

  // Re-attach whenever DOM updates
  useEffect(() => {
    attachImageHandlers();
    
    // Use MutationObserver to catch dynamically added images
    if (!containerRef?.current) return;
    const observer = new MutationObserver(() => {
      attachImageHandlers();
    });
    observer.observe(containerRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [attachImageHandlers, containerRef]);

  const LightboxPortal = lightboxSrc 
    ? createPortal(
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />,
        document.body
      )
    : null;

  return { LightboxPortal, attachImageHandlers };
}