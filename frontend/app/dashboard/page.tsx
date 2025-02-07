'use client';

import type { FC } from 'react';
import { useEffect } from 'react';

import { Canvas } from '@/app/dashboard/Canvas';
import SkeletonApp from '@/components/SkeletonApp';
import { useModalStore } from '@/store/modalSlice';
import useUserSlice from '@/store/userSlice';

const Dashboard: FC = () => {
  const profile = useUserSlice((state) => state.profile);
  useEffect(() => {
    useModalStore.setState({ currentPage: 'dashboard' });
  }, []);

  return (
    <>
      <main className='z-10 flex flex-grow rounded pb-0.5vh pl-0.5vw pr-0.5vw pt-0.5vh'>
        {profile && profile.netId !== '' ? (
          <Canvas profile={profile} columns={2} />
        ) : (
          <div>
            <SkeletonApp />
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
