export async function fetchCsrfToken() {
  try {
    const response = await fetch(`${process.env.BACKEND}/csrf`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token. HTTP status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.csrfToken) {
      throw new Error('CSRF token missing in response.');
    }

    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error; // Let the caller handle the error
  }
}
