import { memo, MouseEvent, FC } from 'react';

import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

import useAuthStore from '../store/authSlice';
import useMobileMenuStore from '../store/mobileMenuSlice';

import DropdownMenu from './DropdownMenu';
import { Login } from './Login';

import ModalManager from './TutorialModal';

const navigation = [
  { name: 'About', href: '/about/' },
  { name: 'Dashboard', href: '/dashboard/' }, // Should be protected path and not auto-redirect
  { name: 'Calendar', href: '/calendar/' }, // TODO: Big TODO :]] --windsor
  { name: 'Contact Us', href: '/contact/' },
];

const Navbar: FC = () => {
  const { isAuthenticated, login } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    login: state.login,
  }));
  const { mobileMenuOpen, setMobileMenuOpen } = useMobileMenuStore();
  
  const handleDashboardClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    login();
  };

  const renderUserMenu = () => (isAuthenticated ? <DropdownMenu /> : <Login />);
  
  return (
    <header className={`absolute bg --system-text-color inset-x-0 top-0 z-50 transform}`}>
      <nav className='flex items-center justify-between p-6 lg:px-8' aria-label='Global'>
        <div className='flex lg:flex-1'>
          <a href='.' className='-m-1.5 p-1.5'>
            <span className='sr-only'>hoagieplan</span>
            <Image src='/logo.png' height={50} width={50} alt='hoagieplan Logo' />
          </a>
        </div>
        <div className='flex lg:hidden'>
          <button
            type='button'
            className='-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400'
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className='sr-only'>Open main menu</span>
            <Bars3Icon className='h-6 w-6' aria-hidden='true' />
          </button>
        </div>
        <div className='hidden lg:flex lg:gap-x-12 '>
          {navigation.map((item) =>
            item.name === 'Dashboard' ? (
              <a
                key={item.name}
                href={item.href}
                className='text-sm font-semibold leading-6 text-[var(--system-text-color)]'
                onClick={handleDashboardClick}
              >
                {item.name}
              </a>
            ) : (
              <a
                key={item.name}
                href={item.href}
                className='text-sm font-semibold leading-6 text-[var(--system-text-color)]'
              >
                {item.name}
              </a>
            )
          )}
        </div>
        <div className='hidden lg:flex lg:flex-1 lg:justify-end'>{renderUserMenu()}</div>
      </nav>
      <ModalManager /> *****
      <Dialog as='div' className='lg:hidden' open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className='fixed inset-0 z-50' />
        <Dialog.Panel className='fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-white/10'>
          <div className='flex items-center justify-between'>
            <a href='/' className='-m-1.5 p-1.5'>
              <span className='sr-only'>hoagieplan</span>
              <Image src='/logo.png' height={50} width={50} alt='hoagieplan Logo' />
            </a>
            <button
              type='button'
              className='-m-2.5 rounded-md p-2.5 text-gray-400'
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className='sr-only'>Close menu</span>
              <XMarkIcon className='h-6 w-6' aria-hidden='true' />
            </button>
          </div>
          <div className='mt-6 flow-root'>
            <div className='-my-6 divide-y divide-gray-500/25'>
              <div className='space-y-2 py-6'>
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className='-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-800'
                  >
                    {item.name}
                  </a>
                ))}
                {isAuthenticated ? <DropdownMenu /> : <Login />}
                {/* TODO: Need to implement this for mobile port */}
                {/* <a
                  onClick={handleUserSettingsClick}
                  className='-mx-3 block cursor-pointer rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-800'
                >
                  User Settings
                </a> */}
              </div>
              <div className='hidden lg:flex lg:flex-1 lg:justify-end'>{renderUserMenu()}</div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
};

export default memo(Navbar);



