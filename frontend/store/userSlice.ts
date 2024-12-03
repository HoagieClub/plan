import { useEffect } from "react";
import { create } from "zustand";
import { UserProfile } from "@auth0/nextjs-auth0/client";
import { fetchCsrfToken } from "@/utils/csrf";
import { Profile, MajorMinorType, UserState } from "@/types";

// Fetch user profile from the backend
async function fetchCustomUser(
  netId: string,
  firstName: string,
  lastName: string,
  email: string,
): Promise<Profile | null> {
  try {
    const csrfToken = await fetchCsrfToken();

    const response = await fetch(`${process.env.BACKEND}/profile/get_user/`, {
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
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("User not authenticated.");
        return null;
      }
      if (response.status === 404) {
        console.error("User profile not found.");
        return null;
      }
      throw new Error(`Error fetching CustomUser: ${response.statusText}`);
    }

    const data = await response.json();
    return data as Profile;
  } catch (error) {
    console.error("Error fetching CustomUser:", error);
    return null;
  }
}

// Utility function: Map Auth0 user profile to app's Profile type
async function mapUserProfileToProfile(
  userProfile: UserProfile | null,
): Promise<Profile> {
  if (!userProfile) {
    throw new Error("UserProfile is null or undefined.");
  }

  const [firstName, lastName] = (userProfile.name || "").split(" ");
  const netId = userProfile.nickname || "";
  const email = userProfile.sub?.split("|")[2] || "";

  const defaultMajor: MajorMinorType = {
    code: "Undeclared",
    name: "Undeclared",
  };

  const user = await fetchCustomUser(netId, firstName, lastName, email);

  return {
    firstName: user?.firstName || firstName,
    lastName: user?.lastName || lastName,
    classYear: user?.classYear || new Date().getFullYear() + 1,
    major: user?.major || defaultMajor,
    minors: user?.minors || [],
    certificates: user?.certificates || [],
    netId: user?.netId || netId,
    universityId: user?.universityId || "",
    email: user?.email || email,
    department: user?.department || "Undeclared",
    timeFormat24h: user?.timeFormat24h || false,
    themeDarkMode: user?.themeDarkMode || false,
  };
}

const useUserSlice = create<UserState>((set) => ({
  profile: {
    firstName: "",
    lastName: "",
    major: undefined,
    minors: [],
    certificates: [],
    classYear: undefined,
    netId: "",
    universityId: "",
    email: "",
    department: "",
    themeDarkMode: false,
    timeFormat24h: false,
  },
  updateProfile: (updates: Partial<Profile>) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),
  fetchAndUpdateProfile: async (userProfile: UserProfile) => {
    try {
      const profile = await mapUserProfileToProfile(userProfile);
      set(() => ({ profile }));
    } catch (error) {
      console.error("Failed to fetch and update user profile:", error);
    }
  },
}));

export const useFetchUserProfile = (userProfile: UserProfile) => {
  const fetchAndUpdateProfile = useUserSlice(
    (state) => state.fetchAndUpdateProfile,
  );

  useEffect(() => {
    if (userProfile) {
      fetchAndUpdateProfile(userProfile);
    }
  }, [userProfile, fetchAndUpdateProfile]);
};

export default useUserSlice;
