import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface ButtonWidgetProps {
	onClick?: () => void;
	text: string;
	icon?: ReactNode;
}

export const ButtonWidget: FC<ButtonWidgetProps> = ({ onClick, text, icon }) => {
	return (
		<Button variant='outline' className='w-full hover:bg-gray-200' onClick={onClick}>
			<div className='flex items-center justify-center gap-2'>
				{icon} {text}
			</div>
		</Button>
	);
};
