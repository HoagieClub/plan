'use client';

import type { ReactNode } from 'react';

import { useSettingsModal } from '@/components/SettingsModal';
import Layout from '@/lib/hoagie-ui/Layout';
import Nav from '@/lib/hoagie-ui/Nav';
import Theme from '@/lib/hoagie-ui/Theme';
import { useFetchUserProfile } from '@/store/userSlice';

import type { UserProfile } from '@auth0/nextjs-auth0/client';

/**
 * Content Component
 * Fetches user data (real or mock) and renders the main layout.
 *
 * @param children - The child components to render within the layout.
 * @returns JSX Element representing the content area.
 */
export default function Content({ children, user }: { children: ReactNode; user: UserProfile }) {
  useFetchUserProfile(user);
  const { openSettingsModal, settingsModal } = useSettingsModal();

  const tabs = [
    { title: 'About', href: '/about' },
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Calendar', href: '/calendar' },
    { title: 'Contact', href: '/contact' },
  ];

  return (
    <Theme palette='yellow'>
      <Layout>
        <Nav
          name='plan'
          tabs={tabs}
          user={user}
          showSettingsButton={true}
          onSettingsClick={openSettingsModal}
        />
        {children}
        {settingsModal}
      </Layout>
    </Theme>
  );
}
