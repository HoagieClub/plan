import React, { useEffect , useState } from 'react';
import useUserSlice, { useFetchUserProfile } from '@/store/userSlice';
import Modal from '@/components/Modal';

const TutorialModal = ({ onClose }) => {
    return (
        <Modal>
        </Modal>
    );
};

const ModalManager = () => {
    useFetchUserProfile(); 

    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        const ShownTutorial = localStorage.getItem('tutorialShown');
        const major = localStorage.getItem('major');
        const minors = localStorage.getItem('minors');

    
    if (!ShownTutorial && (!major || !minors)) {
      setShowTutorial(true); 
    }

}, []);

    const handleCloseModal = () => {
        setShowTutorial(false);

        const profile = useUserSlice.getState().profile;

        localStorage.setItem('tutorialShown', 'true');
        localStorage.setItem('major', JSON.stringify(profile.major));
        localStorage.setItem('minors', JSON.stringify(profile.minors));
    };

    return showTutorial ? <TutorialModal onClose={handleCloseModal} /> :
    null;
};
    
export default ModalManager;