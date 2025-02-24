import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { UserSettings } from '@/components/UserSettings';
import useUserSlice from '@/store/userSlice';

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
		<Modal>
			<UserSettings
				profile={userProfile}
				onClose={() => setIsModalOpen(false)}
				onSave={(newProfileData) => {
					// Update the Zustand store with new profile data
					useUserSlice.setState((state) => ({
						profile: { ...state.profile, ...newProfileData },
					}));

					// Close the modal
					setIsModalOpen(false);
				}}
			/>
		</Modal>
	) : null;

	return { openSettingsModal, settingsModal };
}
