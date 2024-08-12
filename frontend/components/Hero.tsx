import { MouseEvent } from 'react';
import useAuthStore from '@/store/authSlice';

export default function Hero() {
  const { login } = useAuthStore((state) => ({
    login: state.login,
  }));

  const handleDashboardClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    login();
  };

  // changed Hero component to flex
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className='py-24 sm:py-32 lg:pb-40'>
        <div className='mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='mx-auto max-w-2xl text-center text-[var(--system-text-color)]'>
            <h1 className='text-4xl font-bold tracking-tight sm:text-6xl'>
              welcome to hoagie<span className='text-slate-300'>plan</span>.
            </h1>
            <p className='mt-6 text-lg leading-8'>
              Explore courses, read reviews, and manage your four-year course schedule.
            </p>
            <div className='mt-10 flex items-center justify-center gap-x-6'>
              <a
                href='/dashboard/'
                className='rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400'
                onClick={handleDashboardClick}
              >
                Get started
              </a>
              <a href='/about/' className='text-sm font-semibold leading-6 text-white'>
                Learn more <span aria-hidden='true'>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
