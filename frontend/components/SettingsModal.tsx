import { useState } from 'react';

import useUserSlice from '@/store/userSlice';

import SettingsModal from './Modal';
import UserSettings from './UserSettings';

/**
 * Opens the settings modal and manages its state.
 *
 * @returns An object containing a function to open the modal and the modal itself.
 */
export function useSettingsModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userProfile = useUserSlice((state) => state.profile);

  const openSettingsModal = () => setIsModalOpen(true);

  const settingsModal = isModalOpen ? (
    <SettingsModal>
      <UserSettings
        profile={userProfile}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          window.location.reload(); // Refresh page on save
          // TODO: eventually just refresh only necessary components
          // updateProfile(newProfileData); // Update the Zustand store with new profile data
          // setIsModalOpen(false);
        }}
      />
    </SettingsModal>
  ) : null;

  return { openSettingsModal, settingsModal };
}
