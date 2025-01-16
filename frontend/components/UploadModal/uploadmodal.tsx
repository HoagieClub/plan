import { useState } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

import { TutorialModal } from '../Modal';

import styles from './UploadModal.module.css';

interface Upload {
  isOpen: boolean;
  onClose: () => void;
}

const Upload: React.FC<Upload> = ({ isOpen, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Handle file selection from "Choose file" button
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(event.target.files)]);
    }
  };

  // Handle drop event (files dropped into the drop zone)
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent default browser behavior
    event.stopPropagation();

    // Extract files from the drop event
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...Array.from(droppedFiles)]);
    }
  };

  // Prevent default behavior for drag over (allows dropping)
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Remove a specific file from the list
  const removeFile = (fileName: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.name !== fileName));
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

        {/* Display selected files */}
        {selectedFiles.length > 0 && (
          <div className={styles.fileContainer}>
            {selectedFiles.map((file, index) => (
              <div key={index}>
                <span>{file.name}</span>
                {/* Close button (X) */}
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
          <JoyButton variant='soft' color='neutral' onClick={onClose} sx={{ ml: 2 }} size='md'>
            Save
          </JoyButton>
          <JoyButton variant='soft' color='neutral' onClick={onClose} sx={{ ml: 2 }} size='md'>
            Cancel
          </JoyButton>
        </div>

      </div>
    </TutorialModal>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}

export default Upload;