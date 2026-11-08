import { useState, useEffect, useRef } from 'react';

export default function CropBox({ file, onCropChange, aspect }) {
  const [imgUrl, setImgUrl] = useState('');
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Normalized crop coordinates [0..1]
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

  useEffect(() => {
    if (!file) { setImgUrl(''); return; }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    const initial = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    setCrop(initial);
    onCropChange(initial);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleMouseDown(e, action) {
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    };
    if (action === 'drag') setDragging(true);
    if (action === 'resize') setResizing(true);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (!dragging && !resizing) return;
      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const dx = (e.clientX - dragStart.current.mouseX) / rect.width;
      const dy = (e.clientY - dragStart.current.mouseY) / rect.height;

      if (dragging) {
        let nx = dragStart.current.cropX + dx;
        let ny = dragStart.current.cropY + dy;
        nx = Math.max(0, Math.min(1 - crop.w, nx));
        ny = Math.max(0, Math.min(1 - crop.h, ny));
        const updated = { ...crop, x: nx, y: ny };
        setCrop(updated);
        onCropChange(updated);
      } else if (resizing) {
        let nw = Math.max(0.1, Math.min(1 - dragStart.current.cropX, dragStart.current.cropW + dx));
        let nh = Math.max(0.1, Math.min(1 - dragStart.current.cropY, dragStart.current.cropH + dy));
        if (aspect && aspect > 0) {
          const imgAspect = rect.width / rect.height;
          nh = (nw * imgAspect) / aspect;
          if (dragStart.current.cropY + nh > 1) {
            nh = 1 - dragStart.current.cropY;
            nw = (nh * aspect) / imgAspect;
          }
        }
        const updated = { ...crop, w: nw, h: nh };
        setCrop(updated);
        onCropChange(updated);
      }
    }

    function handleMouseUp() {
      setDragging(false);
      setResizing(false);
    }

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, crop, aspect]);

  function resetCrop() {
    const full = { x: 0, y: 0, w: 1, h: 1 };
    setCrop(full);
    onCropChange(full);
  }

  if (!imgUrl) return null;

  return (
    <div className="crop-container" ref={containerRef}>
      <div className="crop-header">
        <span className="muted small"><b>Interactive Crop Box:</b> Drag box to position, drag blue corner handle to resize</span>
        <button type="button" className="btn small alt" onClick={resetCrop}>Reset to Full</button>
      </div>
      <div className="crop-stage">
        <img ref={imgRef} src={imgUrl} alt="Crop target" className="crop-img" draggable={false} />
        <div
          className="crop-box"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.w * 100}%`,
            height: `${crop.h * 100}%`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
        >
          <div className="crop-box-grid">
            <div className="grid-line horizontal" style={{ top: '33.33%' }} />
            <div className="grid-line horizontal" style={{ top: '66.66%' }} />
            <div className="grid-line vertical" style={{ left: '33.33%' }} />
            <div className="grid-line vertical" style={{ left: '66.66%' }} />
          </div>
          <div
            className="crop-handle se"
            title="Drag to resize"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
          />
        </div>
      </div>
    </div>
  );
}

