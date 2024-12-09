/**
 * @overview Landing page for the Hoagie Plan app.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at
 *
 *    https://github.com/hoagieclub/plan/blob/main/LICENSE
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software. This software is provided "as-is", without warranty of any kind.
 */

'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Pane,
  majorScale,
  minorScale,
  Heading,
  Spinner,
  CalendarIcon,
  GridViewIcon,
  ArrowLeftIcon,
  Button,
  useTheme,
} from 'evergreen-ui';
import Link from 'next/link';

import AuthButton from '@/lib/hoagie-ui/AuthButton';

export default function Index() {
  const theme = useTheme();
  const { user, error, isLoading } = useUser();
  let Profile;
  if (isLoading) {
    Profile = <Spinner />;
  } else if (error) {
    Profile = <div>{error.message}</div>;
  } else if (user) {
    Profile = (
      <Pane>
        <Link href='/dashboard'>
          <Button
            height={56}
            width={majorScale(35)}
            backgroundColor={theme.colors.yellow100}
            marginBottom={20}
            iconBefore={GridViewIcon}
          >
            Plan your four-year path
          </Button>
        </Link>
        <br />
        <Link href='/calendar'>
          <Button
            height={56}
            width={majorScale(35)}
            backgroundColor={theme.colors.yellow100}
            marginBottom={20}
            iconBefore={CalendarIcon}
          >
            Plan your weekly classes
          </Button>
        </Link>
        <br />
        <AuthButton variant='logout' />
      </Pane>
    );
  } else {
    Profile = <AuthButton />;
  }

  return (
    <Pane
      display='flex'
      justifyContent='center'
      alignItems='center'
      marginX={majorScale(1)}
      paddingBottom={majorScale(4)}
      paddingTop={majorScale(8)}
    >
      <Pane
        borderRadius={8}
        textAlign='center'
        elevation={1}
        background='white'
        marginX={20}
        maxWidth='600px'
        width='100%'
        paddingX='10px'
        paddingTop={majorScale(5)}
        paddingBottom={majorScale(7)}
      >
        <Heading size={900} className='hoagie'>
          Welcome to HoagiePlan
        </Heading>
        <br />
        <p>Explore courses, read reviews, and manage your four-year schedule.</p>
        <div>
          <Pane display='flex' flexDirection='column' alignItems='center' marginTop='30px'>
            {Profile}
            <Link href='https://hoagie.io'>
              <Button
                height={56}
                width={majorScale(35)}
                appearance='default'
                marginTop={20}
                iconBefore={ArrowLeftIcon}
              >
                <Pane display='flex'>
                  Back to
                  <Pane marginLeft={minorScale(1)} className='hoagie'>
                    hoagie<b>platform</b>
                  </Pane>
                </Pane>
              </Button>
            </Link>
            <br />
          </Pane>
        </div>
      </Pane>
    </Pane>
  );
}
