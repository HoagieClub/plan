import { FC } from 'react';

import { createPortal } from 'react-dom';

import { SettingsModalProps } from '@/types';

const Modal: FC<SettingsModalProps> = ({ children }) => {
  return createPortal(
    <>
      <div className='modal-backdrop fixed inset-0 backdrop-blur-sm bg-black bg-opacity-30 z-50'></div>
      <div className='modal-entrance fixed inset-0 flex justify-center items-center z-50'>
        <div className='bg-white p-8 rounded-xl max-w-2xl w-2/3 shadow-2xl border border-gray-400'>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export const FilterModal: FC<SettingsModalProps> = ({ children }) => {
  return createPortal(
    <>
      <div className='modal-backdrop fixed inset-0 backdrop-blur-sm bg-black bg-opacity-30 z-50'></div>
      <div className='modal-entrance fixed inset-0 flex justify-center items-center z-50'>
        <div className='bg-white p-8 rounded-xl max-w-2xl w-1/4 shadow-2xl border border-gray-400'>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export default Modal;
