"use client";

import { useEffect, useState, FC } from "react";

import { useUser } from "@auth0/nextjs-auth0/client";
import SkeletonApp from "@/components/SkeletonApp";
import { useModalStore } from "@/store/modalSlice";
import { Canvas } from "@/app/dashboard/Canvas";
import { mapUserProfileToProfile } from "@/utils/profileMapper";
import { Profile } from "@/types";
import { fetchCsrfToken } from "@/utils/csrf";

const TutorialService = {
  async getStatus() {
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('http://localhost:8000/tutorial/get-status/', {
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tutorial status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tutorial status:', error);
      return null;
    }
  },

  async setStatus(page: string) {
    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('http://localhost:8000/tutorial/set-status/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ currentPage: page })
      });
      
      if (!response.ok) throw new Error('Failed to set tutorial status');
      return await response.json();
    } catch (error) {
      console.error('Error setting tutorial status:', error);
      return null;
    }
  }
};

const Dashboard: FC = () => {
  const { user, isLoading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const updateTutorialStatus = async () => {
      await TutorialService.setStatus("dashboard");
    };
    updateTutorialStatus();
  }, []); // Only run once on mount

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const resolvedProfile = await mapUserProfileToProfile(user);
        setProfile(resolvedProfile);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <>
      <main className="flex flex-grow z-10 rounded pt-0.5vh pb-0.5vh pl-0.5vw pr-0.5vw">
        {!isLoading && profile && profile.email !== "" ? (
          <Canvas user={profile} columns={2} />
        ) : (
          <div>
            <SkeletonApp />
          </div> // FIXME: We can replace this with a proper loading component or message
        )}
      </main>
    </>
  );
};

export default Dashboard;
