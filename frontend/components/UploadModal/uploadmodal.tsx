import { useState } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

import { TutorialModal } from '../Modal';

import styles from './UploadModal.module.css';

import LoadingComponent from '../LoadingComponent';

interface Upload {
  isOpen: boolean;
  onClose: () => void;
}

const Upload: React.FC<Upload> = ({ isOpen, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(event.target.files)]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...Array.from(droppedFiles)]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.name !== fileName));
  };

const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
  if (selectedFiles.length === 0) {
    alert("No files selected");
    return;
  }

  setIsLoading(true);

  const formData = new FormData();
  selectedFiles.forEach(file => {
    formData.append("files", file);
  });

  try {
    const response = await fetch("https://your-backend.com/upload", {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error("Upload failed");
    }

    alert("Files uploaded successfully!");
    setSelectedFiles([]);
    onClose();
  } catch (error) {
    console.error("Upload error:", error);
    alert("Error uploading files.");
  } finally {
    setIsLoading(false);
  }
};
  

  const modalContent = (
    <TutorialModal>
      <div className={styles.modal}>
        <div className={styles.header}>Load file(s)</div>

        <div className={styles.fileInputContainer}>
          <label>
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange} 
            />
          </label>
        </div>

        <div
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          Drop files here
        </div>

        {selectedFiles.length > 0 && (
          <div className={styles.fileContainer}>
            {selectedFiles.map((file, index) => (
              <div key={index}>
                <span>{file.name}</span>
                <button
                  className={styles.closeButton}
                  onClick={() => removeFile(file.name)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          {isLoading ? (
            <LoadingComponent />
          ) : (
            <>
          <JoyButton variant='soft' color='neutral' onClick={handleSave} sx={{ ml: 2 }} size='md' disabled={isLoading}>
            Save
          </JoyButton>
          <JoyButton variant='soft' color='neutral' onClick={onClose} sx={{ ml: 2 }} size='md' disabled={isLoading}>
            Cancel
          </JoyButton>
          </>
          )}
        </div>

      </div>
    </TutorialModal>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}

export default Upload;