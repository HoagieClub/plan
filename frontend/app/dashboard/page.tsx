"use client";

import { FC, useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { fetchCsrfToken } from "@/utils/csrf";
import { Profile, MajorMinorType } from "@/types";
import SkeletonApp from "@/components/SkeletonApp";

// Dummy Canvas for testing
const DummyCanvas: FC<{user: Profile}> = ({user}) => {
  return <div>Dummy Canvas with user: {user.netId}</div>;
};

const Dashboard: FC = () => {
  const { user, isLoading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const createProfile = async () => {
      if (!user) return;

      try {
        const [firstName, lastName] = (user.name || "").split(" ");
        const netId = user.nickname || "";
        const email = user.sub?.split("|")[2] || "";

        const csrfToken = await fetchCsrfToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND}/profile/create_from_auth0/`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify({
              netId,
              firstName,
              lastName,
              email,
            }),
          }
        );

        const defaultMajor: MajorMinorType = {
          code: "Undeclared",
          name: "Undeclared",
        };

        if (response.ok) {
          const userData = await response.json();
          setProfile({
            firstName: userData?.firstName || firstName,
            lastName: userData?.lastName || lastName,
            classYear: userData?.classYear || new Date().getFullYear() + 1,
            major: userData?.major || defaultMajor,
            minors: userData?.minors || [],
            certificates: userData?.certificates || [],
            netId: userData?.netId || netId,
            universityId: userData?.universityId || netId || "",
            email: userData?.email || email,
            department: userData?.department || "Undeclared",
            timeFormat24h: userData?.timeFormat24h || false,
            themeDarkMode: userData?.themeDarkMode || false,
          });
        }
      } catch (error) {
        console.error('Profile creation error:', error);
      }
    };

    createProfile();
  }, [user]);

  return (
    <main className="flex flex-grow z-10 rounded pt-0.5vh pb-0.5vh pl-0.5vw pr-0.5vw">
      {!isLoading && profile ? (
        <DummyCanvas user={profile} />
      ) : (
        <div>Loading...</div>
      )}
    </main>
  );
};

export default Dashboard;