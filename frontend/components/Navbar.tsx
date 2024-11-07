import { memo, MouseEvent, FC, useEffect } from 'react';

import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import Image from 'next/image';

import { useModalStore } from '@/store/modalSlice';
import UserState from '@/store/userSlice';

import useAuthStore from '../store/authSlice';
import useMobileMenuStore from '../store/mobileMenuSlice';

import CalendarTutorial from './CalendarTutorial/calendartutorial';
import DashboardTutorial from './DashboardTutorial/dashboardtutorial';

import DropdownMenu from './DropdownMenu';
import { Login } from './Login';

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
  const userProfile = UserState((state) => state.profile);
  const { mobileMenuOpen, setMobileMenuOpen } = useMobileMenuStore();

  const handleDashboardClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    login();
  };

  const { isOpen, currentPage, openModal, closeModal, hasSeenTutorial, setHasSeenTutorial } = useModalStore();
  useEffect(() => {
    if (
      userProfile &&
      userProfile.major &&
      userProfile.major.code === 'Undeclared' &&
      userProfile.minors.length === 0 &&
      userProfile.certificates.length === 0 &&
      !hasSeenTutorial
    ) {
      openModal();
    }
  }, [openModal, userProfile, hasSeenTutorial]);

  const renderUserMenu = () => (isAuthenticated ? <DropdownMenu /> : <Login />);

  const handleCloseTutorial = () => {
    setHasSeenTutorial(true);
    closeModal();
  };

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
        <div className='hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-x-4'>
          {(currentPage === 'dashboard' || currentPage === 'calendar') && (
            <IconButton onClick={openModal}>
              <HelpOutlineOutlinedIcon style={{ color: 'white' }} fontSize='medium' />
            </IconButton>
          )}
          {renderUserMenu()}
        </div>
      </nav>

      {isOpen && currentPage === 'dashboard' && (
        <DashboardTutorial isOpen={isOpen} onClose={handleCloseTutorial} />
      )}

      {isOpen && currentPage === 'calendar' && (
        <CalendarTutorial isOpen={isOpen} onClose={handleCloseTutorial} />
      )}

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
