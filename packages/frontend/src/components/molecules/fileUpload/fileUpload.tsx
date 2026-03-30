import React, { useState } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  acceptedFileTypes?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, acceptedFileTypes }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUploaded(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileUploaded(file);
    }
  };

  return (
    <div
      className={`file-upload-area${dragOver ? ' file-upload-area--dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" onChange={handleFileChange} accept={acceptedFileTypes} />
      <span className="file-upload-icon">☁️</span>
      <div className="file-upload-title">Upload bank statement (CSV)</div>
      <div className="file-upload-hint">Click to browse or drag and drop</div>
      {fileName && <div className="file-upload-filename">📄 {fileName}</div>}
    </div>
  );
};
