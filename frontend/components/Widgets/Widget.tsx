import type { FC, ReactNode } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface ButtonWidgetProps {
	href?: string;
	text: string;
	icon?: ReactNode;
	onClick?: () => void;
}

export const ButtonWidget: FC<ButtonWidgetProps> = ({ href, text, icon, onClick }) => {
	return href ? (
		<Link href={href} className='w-full'>
			<Button
				variant='outline'
				className='w-full rounded-lg border border-solid border-slate-200 bg-slate-100 shadow-none hover:bg-white'
			>
				<div className='flex items-center justify-center gap-2'>
					{icon}
					{text}
				</div>
			</Button>
		</Link>
	) : (
		<Button
			onClick={onClick}
			variant='outline'
			className='w-full rounded-lg border border-solid border-slate-200 bg-slate-100 shadow-none hover:bg-white'
		>
			<div className='flex items-center justify-center gap-2'>
				{icon}
				{text}
			</div>
		</Button>
	);
};
