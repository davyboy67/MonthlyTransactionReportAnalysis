import React from 'react';

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  acceptedFileTypes?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, acceptedFileTypes }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUploaded(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept={acceptedFileTypes} />
    </div>
  );
};
