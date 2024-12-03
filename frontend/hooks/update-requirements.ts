import { useCallback, useState } from 'react';

export function useUpdateRequirements(netId: string) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [academicPlan, setAcademicPlan] = useState({});

  const updateRequirements = useCallback(async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${process.env.BACKEND}/update_requirements/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-NetId': netId,
        },
        cache: 'no-store',
      });

      const data = await response.json();
      setAcademicPlan(data);
      setIsUpdating(false);
      return data;
    } catch (error) {
      console.error('Failed to update requirements:', error);
      setIsUpdating(false);
      return null;
    }
  }, [netId]);

  return { updateRequirements, academicPlan, isUpdating };
}
