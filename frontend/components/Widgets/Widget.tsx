import type { FC, ReactNode } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface ButtonWidgetProps {
  href: string;
  text: string;
  icon?: ReactNode;
}

const ButtonWidget: FC<ButtonWidgetProps> = ({ href, text, icon }) => {
  return (
    <Button variant='outline' className='w-full hover:bg-gray-200'>
      <Link href={href} className='flex items-center justify-center gap-2'>
        {icon} {text}
      </Link>
    </Button>
  );
};

export default ButtonWidget;
