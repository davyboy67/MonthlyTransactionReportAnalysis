import React, { useId, useState } from 'react';
import { CloudArrowUp, FileCsv } from '@phosphor-icons/react';
import './FileUpload.css';

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  acceptedFileTypes?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, acceptedFileTypes }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputId = useId();
  const hintId = useId();

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
    // A <label>, not a <div>: drag handlers expose no focusable control, so the
    // label association is what makes the hidden input reachable by keyboard.
    <label
      className={`file-upload-area${dragOver ? ' file-upload-area--dragover' : ''}`}
      htmlFor={inputId}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        id={inputId}
        type="file"
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        aria-describedby={hintId}
      />
      <CloudArrowUp className="file-upload-icon" size={32} aria-hidden="true" />
      <span className="file-upload-title">Upload bank statement (CSV)</span>
      <span className="file-upload-hint" id={hintId}>
        Click to browse or drag and drop
      </span>
      {fileName && (
        <span className="file-upload-filename" role="status">
          <FileCsv size={15} aria-hidden="true" />
          {fileName}
        </span>
      )}
    </label>
  );
};
