import { useState, useRef } from 'react';

export default function Dropzone({ onFile, accept, multiple = false, label = "Drag & drop file here or click to browse", subtitle }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (multiple) {
        onFile(Array.from(files));
      } else {
        onFile(files[0]);
      }
    }
  }

  function handleChange(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (multiple) {
        onFile(Array.from(files));
      } else {
        onFile(files[0]);
      }
    }
  }

  return (
    <div
      className={`dropzone ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current && inputRef.current.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <div className="dropzone-icon">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
          <path d="M12 12v9"></path>
          <path d="m16 16-4-4-4 4"></path>
        </svg>
      </div>
      <p className="dropzone-text"><b>{label}</b></p>
      {subtitle && <p className="dropzone-sub muted">{subtitle}</p>}
    </div>
  );
}

