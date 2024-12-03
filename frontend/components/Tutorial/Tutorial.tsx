import { useState } from 'react';

import Tutorial from './TutorialModal'; // Import your Tutorial component

/**
 
Manages the state and logic for the tutorial modal.*
@returns Object containing functions to open the modal and the rendered modal.*/
export function useTutorialModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tutorialType, setTutorialType] = useState<'dashboard' | 'calendar'>('dashboard');

  const openTutorialModal = (type: 'dashboard' | 'calendar') => {
    setTutorialType(type);
    setIsModalOpen(true);
  };

  const tutorialModal = isModalOpen ? (
    <Tutorial
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      tutorialType={tutorialType}
    />
  ) : null;

  return { openTutorialModal, tutorialModal };
}
