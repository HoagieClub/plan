export const courseService = {
  fetchCourses: async (netId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND}/fetch_courses/`,
      {
        method: "GET",
        credentials: "include",
        headers: { "X-NetId": netId },
      }
    );
    return response.json();
  },

  updateCourse: async (netId: string, csrfToken: string, crosslistings: string, semesterId: string) => {
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/update_courses/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-NetId": netId,
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({ crosslistings, semesterId }),
    });
  }
};
