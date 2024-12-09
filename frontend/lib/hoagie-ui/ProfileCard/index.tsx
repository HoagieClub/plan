/**
 * @overview Profile card component for the Hoagie Plan app.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

import { majorScale, Button, Heading, Card, Avatar, useTheme, Text } from 'evergreen-ui';
import Link from 'next/link';

import type { UserProfile } from '@auth0/nextjs-auth0/client';

interface ProfileCardProps {
  user: UserProfile;
  showSettingsButton?: boolean; // remove this, should always be true
  onSettingsClick?: () => void;
}

/**
 * ProfileCard is a profile card meant for display of user information
 *  throughout different Hoagie applications.
 */
function ProfileCard({ user, onSettingsClick }: ProfileCardProps) {
  const theme = useTheme();
  const name = user.name;
  const email = user.email || (user.sub.includes('@') ? user.sub.split('|').pop() : 'N/A');

  return (
    <Card
      elevation={1}
      backgroundColor={theme.colors.gray50}
      padding={majorScale(3)}
      maxWidth={majorScale(30)}
      borderRadius={8}
      display='flex'
      flexDirection='column'
      alignItems='center'
    >
      <Avatar name={name} backgroundColor={theme.colors.yellow100} size={40} />
      <Heading size={500} marginTop={majorScale(1)}>
        {name}
      </Heading>
      <Text color='muted' size={300} marginTop={2}>
        {email}
      </Text>
      <Button marginTop={16} onClick={onSettingsClick}>
        Settings
      </Button>
      <Link href='/api/auth/logout'>
        <Button marginTop={16}>Log Out</Button>
      </Link>
    </Card>
  );
}

export default ProfileCard;

// // TODO: Type-safe auth fix 4

// import { majorScale, Button, Heading, Card, Avatar, useTheme, Text } from 'evergreen-ui';
// import Link from 'next/link';

// import type { UserProfile } from '@auth0/nextjs-auth0/client';

// interface ProfileCardProps {
//   user: UserProfile;
//   showSettingsButton?: boolean;
//   onSettingsClick?: () => void;
// }

// /**
//  * ProfileCard is a profile card meant for display of user information
//  *  throughout different Hoagie applications.
//  */
// function ProfileCard({ user, showSettingsButton = false, onSettingsClick }: ProfileCardProps) {
//   const theme = useTheme();
//   const name = user.name;
//   const email = user.email || (user.sub.includes('@') ? user.sub.split('|').pop() : 'N/A');

//   return (
//     <Card
//       elevation={1}
//       backgroundColor={theme.colors.gray50}
//       padding={majorScale(3)}
//       maxWidth={majorScale(30)}
//       borderRadius={8}
//       display='flex'
//       flexDirection='column'
//       alignItems='center'
//     >
//       <Avatar name={name} backgroundColor={theme.colors.yellow100} size={40} />
//       <Heading size={500} marginTop={majorScale(1)}>
//         {name}
//       </Heading>
//       <Text color='muted' size={300} marginTop={2}>
//         {email}
//       </Text>
//       {showSettingsButton && (
//         <Button marginTop={16} onClick={onSettingsClick}>
//           Settings
//         </Button>
//       )}
//       <Link href='/api/auth/logout'>
//         <Button marginTop={16}>Log Out</Button>
//       </Link>
//     </Card>
//   );
// }

// export default ProfileCard;
