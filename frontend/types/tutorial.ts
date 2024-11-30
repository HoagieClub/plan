type TutorialModal = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (seen: boolean) => Promise<void>;
  fetchTutorialStatus: () => Promise<void>;
}
