import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';

import { Button as JoyButton } from '@mui/joy';
import classNames from 'classnames';
import { createPortal } from 'react-dom';

import LoadingComponent from '../LoadingComponent';
import SettingsModal from '../Modal';
import ReviewMenu from '../ReviewMenu';

import styles from './InfoComponent.module.css';

interface InfoComponentProps {
  value: string;
}

const InfoComponent: FC<InfoComponentProps> = ({ value }) => {
  const dept = value.split(' ')[0];
  const coursenum = value.split(' ')[1];
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [courseDetails, setCourseDetails] = useState<{
    // TODO: Address this typing eventually.

    [key: string]: any;
  } | null>(null);

  const modalRef = useRef(null);

  useEffect(() => {
    if (showPopup && value) {
      const url = new URL(`${process.env.BACKEND}/course/details/`);
      url.searchParams.append('crosslistings', value);

      fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          setCourseDetails(data);
        });
    }
  }, [showPopup, value]);

  const handleOutsideClick = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleCancel(event);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      handleCancel(event);
    }
  };

  const handleClick = (event) => {
    event.stopPropagation();
    setShowPopup(true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);
  };

  const handleCancel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowPopup(false);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleOutsideClick);
  };

  const modalContent = showPopup ? (
    <SettingsModal>
      <div
        className={styles.modal}
        style={{
          width: '85%',
          height: '75%',
          padding: '25px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        ref={modalRef}
      >
        {' '}
        {/* Ensure full width */}
        {courseDetails ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100vw',
              overflowX: 'auto',
              overflowY: 'auto',
            }}
          >
            {' '}
            {/* Full width and row direction */}
            {/* Details section with explicit width */}
            <div
              style={{
                height: '485px',
                overflowWrap: 'break-word',
                flexWrap: 'wrap',
                overflowY: 'auto',
                width: '55%',
                paddingLeft: '10px',
              }}
            >
              <div>
                <div className={styles.detailRow}>
                  <strong className={styles.strong}>{value}</strong>
                </div>
                {Object.entries(courseDetails).map(([key, value]) => (
                  <div key={key} className={styles.detailRow}>
                    <strong className={styles.strong}>{key}:</strong> {value}
                  </div>
                ))}
              </div>
            </div>
            {/* ReviewMenu with explicit width */}
            <div style={{ paddingLeft: '20px', width: '45%', height: '400px' }}>
              {' '}
              {/* Half width */}
              <ReviewMenu dept={dept} coursenum={coursenum} />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <LoadingComponent />
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '15px',
          }}
        >
          <footer className='mt-auto text-right'>
            <JoyButton
              variant='soft'
              color='neutral'
              onClick={handleCancel}
              sx={{ ml: 2 }}
              size='md'
            >
              Close
            </JoyButton>
          </footer>
        </div>
      </div>
    </SettingsModal>
  ) : null;

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          display: 'block', // changed from inline-block to block
          cursor: 'pointer',
          maxWidth: '100%', // ensure it respects the container's max width
          overflow: 'hidden', // ensure overflow is hidden
          whiteSpace: 'nowrap', // no wrap
          textOverflow: 'ellipsis', // apply ellipsis
        }}
        className={classNames(styles.Action)}
      >
        {value}
      </div>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};

export default InfoComponent;
