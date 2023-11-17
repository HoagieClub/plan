'use client';

import AspectRatio from '@mui/joy/AspectRatio';
import Box from '@mui/joy/Box';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Skeleton from '@mui/joy/Skeleton';
import Stack from '@mui/joy/Stack';
import Switch from '@mui/joy/Switch';
import * as React from 'react';
import { Suspense, useEffect } from 'react';

export default function Loading() {
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Set loading to false after 3 seconds
    }, 3000); // 3000 milliseconds = 3 seconds

    return () => clearTimeout(timer); // Clear the timer if the component is unmounted
  }, []);

  return (
    <Suspense fallback={<Skeleton />}>
      <Stack spacing={2} useFlexGap sx={{ alignItems: 'center' }}>
        <Box sx={{ m: 'auto' }}>
          <AspectRatio variant='plain' sx={{ width: 300 }}>
            <Skeleton loading={loading}>
              <img
                src={
                  loading
                    ? 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
                    : './compassLogo.png'
                }
                alt='Compass Logo'
              />
            </Skeleton>
          </AspectRatio>
        </Box>
        <FormControl orientation='horizontal' sx={{ gap: 1 }}>
          <Switch
            size='sm'
            checked={loading}
            onChange={(event) => setLoading(event.target.checked)}
          />
          <FormLabel>Loading</FormLabel>
        </FormControl>
      </Stack>
    </Suspense>
  );
}
