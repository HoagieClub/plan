/**
 * @overview Navigation bar for the Hoagie Plan app with a stateful profile.
 *
 * Copyright © 2021-2024 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

"use client";

import { ComponentType } from "react";

import { UserProfile } from "@auth0/nextjs-auth0/client";
import {
  majorScale,
  Pane,
  Text,
  Position,
  Popover,
  Avatar,
  TabNavigation,
  Tab,
  useTheme,
} from "evergreen-ui";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

import ProfileCard from "@/lib/hoagie-ui/ProfileCard";
import { useTutorialModal } from "@/components/Tutorial/Tutorial";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export type Nav = {
  // The name of the app for generating the `hoagie{name}` title.
  name: string;

  // A custom component to be used in place of the hoagie logo.
  LogoComponent?: ComponentType;

  // A custom component to be used in place of the header color strip.
  HeaderComponent?: ComponentType;

  // A list of tab objects for the navbar, each with `title` and `href` fields.
  tabs?: Array<{ title: string; href: string }>;

  // Authenticated user data.
  user?: UserProfile;

  // A flag to show the "beta" development disclaimer on the hoagie app logo.
  beta?: boolean;

  // Optional props to allow ProfileCard to have a Settings button
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
};

/**
 * Nav is a navbar meant for internal navigations throughout
 * different Hoagie applications.
 */
function Nav({
  name,
  LogoComponent,
  HeaderComponent,
  tabs = [],
  user,
  beta = false,
  showSettingsButton = false,
  onSettingsClick,
}: Nav) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const username = user?.name;
  const { openTutorialModal, tutorialModal } = useTutorialModal();
  const tutorialType = pathname.includes("/dashboard")
    ? "dashboard"
    : pathname.includes("/calendar")
      ? "calendar"
      : "dashboard";
  return (
    <Pane elevation={1}>
      {HeaderComponent ? (
        <HeaderComponent />
      ) : (
        <Pane width="100%" height={20} background={theme.title} />
      )}
      <Pane
        display="flex"
        justifyContent="center"
        width="100%"
        height={majorScale(9)}
        background="white"
      >
        <Pane
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          width="100%"
          height="100%"
          maxWidth={1200}
          paddingX={majorScale(5)}
          fontSize={25}
        >
          <Link href="/">
            <Pane cursor="pointer" position="relative">
              {LogoComponent ? (
                <LogoComponent />
              ) : (
                <Pane>
                  <Text
                    is="h2"
                    display="inline-block"
                    className="hoagie logo"
                    color="gray900"
                  >
                    hoagie
                  </Text>
                  <Text
                    is="h2"
                    display="inline-block"
                    className="hoagie logo"
                    color="yellow400"
                  >
                    {name}
                  </Text>
                  {beta && (
                    <Text
                      className="hoagie beta"
                      position="absolute"
                      color="gray900"
                    >
                      (BETA)
                    </Text>
                  )}
                </Pane>
              )}
            </Pane>
          </Link>
          <Pane display="flex" alignItems="center">
            <TabNavigation>
              {tabs.map((tab) => (
                <Tab
                  key={tab.title}
                  is="a"
                  id={tab.title}
                  isSelected={pathname === tab.href}
                  onSelect={() => router.push(tab.href)}
                >
                  {tab.title}
                </Tab>
              ))}
            </TabNavigation>
            <Pane
              display="flex"
              alignItems="center"
              justifyContent="center"
              marginLeft={majorScale(4)}
              cursor="pointer"
              onClick={() => openTutorialModal(tutorialType)}
            >
              <HelpOutlineIcon
                fontSize="medium"
                style={{ color: theme.colors.blue500 }}
                titleAccess="Open Tutorial"
              />
            </Pane>
            {user && (
              <Popover
                content={
                  <ProfileCard
                    user={user}
                    showSettingsButton={showSettingsButton}
                    onSettingsClick={onSettingsClick}
                  />
                }
                position={Position.BOTTOM}
              >
                <Avatar
                  name={username}
                  style={{ cursor: "pointer" }}
                  backgroundColor={theme.colors.yellow100}
                  size={40}
                  marginLeft={majorScale(4)}
                />
              </Popover>
            )}
            {tutorialModal}
          </Pane>
        </Pane>
      </Pane>
    </Pane>
  );
}

export default Nav;
