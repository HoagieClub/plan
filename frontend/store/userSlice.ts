import { useEffect } from 'react';

import { create } from 'zustand';

import { UserState } from '../types';

const useUserSlice = create<UserState>((set) => ({
  profile: {
    firstName: '',
    lastName: '',
    major: undefined,
    minors: [],
    classYear: undefined,
    netId: '',
    universityId: '',
    email: '',
    department: '',
    themeDarkMode: false,
    timeFormat24h: false,
  },
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
}));

// Custom hook for fetching user data
// TODO: This is not used anywhere yet
export const useFetchUserProfile = () => {
  const updateStore = useUserSlice((state) => state.updateProfile);

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await fetch(`${process.env.BACKEND}/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      updateStore({
        firstName: data.firstName,
        lastName: data.lastName,
        netId: data.netId,
        major: data.major,
        minors: data.minors,
        classYear: data.classYear,
        timeFormat24h: data.timeFormat24h,
        themeDarkMode: data.themeDarkMode,
      });
      
    };

    fetchProfile();
  }, [updateStore]);
};
export default useUserSlice;
