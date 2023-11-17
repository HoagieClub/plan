'use client';

import { useEffect } from 'react';

import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authSlice';

import Footer from '@/components/Footer';

const Root = () => {
  return (
    // Apply Zustand client store here if necessary
    <Home />
  );
};

const Home = () => {
  const { checkAuthentication } = useAuthStore();

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  return (
    <>
      <Navbar />
      <Hero />
    </>
  );
};

export default Root;
