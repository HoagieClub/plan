import { type FC } from 'react';

import { createPortal } from 'react-dom';

import { type ModalProps } from '@/types';

export const Modal: FC<ModalProps> = ({ children, className = '', onClose }) => {
	return createPortal(
		<>
			<div className='modal-backdrop fixed inset-0 z-50 bg-black bg-opacity-30 backdrop-blur-sm' />
			<div
				className='modal-entrance fixed inset-0 z-50 flex items-center justify-center'
				onClick={onClose}
			>
				<div
					className={`w-2/3 max-w-2xl rounded-xl border border-gray-400 bg-white p-8 shadow-2xl ${className}`}
					onClick={(e) => e.stopPropagation()}
				>
					{children}
				</div>
			</div>
		</>,
		document.body
	);
};

export const FilterModal: FC<ModalProps> = ({ children }) => {
	return createPortal(
		<>
			<div className='modal-backdrop fixed inset-0 z-50 bg-black bg-opacity-30 backdrop-blur-sm' />
			<div className='modal-entrance fixed inset-0 z-50 flex items-center justify-center'>
				<div className='w-1/3 rounded-xl border border-gray-400 bg-white p-8 shadow-2xl'>
					{children}
				</div>
			</div>
		</>,
		document.body
	);
};

export const TutorialModal: FC<ModalProps> = ({ children, onClose }) => {
	return createPortal(
		<>
			{/* TODO: Need an equivalent fade out animation when 'Close' is pressed */}
			<div className='modal-backdrop fixed inset-0 z-50 bg-black bg-opacity-30 backdrop-blur-sm' />
			<div
				className='modal-entrance fixed inset-0 z-50 flex items-center justify-center'
				onClick={onClose}
			>
				<div onClick={(e) => e.stopPropagation()}>{children}</div>
			</div>
		</>,
		document.body
	);
};
