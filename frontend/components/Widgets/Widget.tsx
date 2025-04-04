import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface ButtonWidgetProps {
	href?: string;
	text: string;
	icon?: ReactNode;
	onClick?: () => void;
}

export const ButtonWidget: FC<ButtonWidgetProps> = ({ href, text, icon }) => {
	return href ? (
		<Button variant='outline' className='bg-slate-100 w-full hover:bg-gray-200'>
			<Link href={href} className='flex items-center justify-center gap-2'>
				{icon} {text}
			</div>
		</Button>
	) : (
		<Button variant='outline' className='bg-slate-100 w-full hover:bg-gray-200'>
			<div className='flex items-center justify-center gap-2'>
				{icon}
				{text}
			</div>
		</Button>
	);
};
