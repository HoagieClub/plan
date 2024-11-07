import { create } from 'zustand';

interface ModalStore {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (seen : boolean) => void; 
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),
  hasSeenTutorial: JSON.parse(localStorage.getItem('hasSeenTutorial')) || false, 
  setHasSeenTutorial: (seen) => {
    set( { hasSeenTutorial : seen });
    localStorage.setItem('hasSeenTutorial', JSON.stringify(seen));
  }
}));
