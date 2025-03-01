'use client';

import { useState } from 'react';

import Upload from './uploadmodal'; // Import your Tutorial component

/**
 
Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useUploadModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openUploadModal = () => {
    setIsModalOpen(true);
  };

  const uploadModal = isModalOpen ? (
    <Upload
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
  ) : null;

  return { openUploadModal, uploadModal };
}
