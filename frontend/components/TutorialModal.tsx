import React, { useEffect , useState } from 'react';
import useUserSlice, { useFetchUserProfile } from '@/store/userSlice';
import Modal from '@/components/Modal';

const TutorialModal = ({ onClose }) => {
    return (
        <Modal>
           <button onClick={onClose}>Close Tutorial</button>
        </Modal>
    );
};

const ModalManager = () => {
    useFetchUserProfile(); 

    const [showTutorial, setShowTutorial] = useState(false);

   
    useEffect(() => {
        const major = localStorage.getItem('major');
        const minors = localStorage.getItem('minors');

    
    if (!major || !minors) {
      setShowTutorial(true); 
    }

}, []);

    const handleCloseModal = () => {
        setShowTutorial(false);

        const profile = useUserSlice.getState().profile;

        localStorage.setItem('major', JSON.stringify(profile.major));
        localStorage.setItem('minors', JSON.stringify(profile.minors));
    };

    return showTutorial ? <TutorialModal onClose={handleCloseModal} /> :
    null;
};
    
export default ModalManager;