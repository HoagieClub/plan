/* eslint-disable @next/next/no-img-element */
//import { useState } from 'react';

import { Button as JoyButton } from '@mui/joy';
import { createPortal } from 'react-dom';

import { TutorialModal } from '../Modal';

import styles from './UploadModal.module.css';

interface Upload {
  isOpen: boolean;
  onClose: () => void;
}

const headers = 'Load file(s)';

const pages = 'This tutorial will run you through the functionality that will allow you to plan your weekly schedule for a specific semester.';

const photos = 
  <img
    src='/calendar_main.png'
    alt='Description'
    key={0}
    style={{ width: '80%', height: 'auto' }}
  />;

const Upload: React.FC<Upload> = ({ isOpen, onClose }) => {
  const modalContent = (
    <TutorialModal>
      <div className={styles.modal}>
        <div className={styles.header}>{headers}</div>
        <div className={styles.pageContent}>{pages}</div>
        <div className={styles.pagePhoto}> {photos} </div>
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