/**
 * @overview Navigation bar for the Hoagie Plan app with a stateful profile.
 *
 * Copyright © 2021-2025 Hoagie Club and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree or at https://github.com/hoagieclub/plan/LICENSE.
 *
 * Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the software. This software is provided "as-is", without warranty of any kind.
 */

'use client';

import { type ComponentType, type FC } from 'react';

import { type User } from '@auth0/nextjs-auth0/types';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
	majorScale,
	Pane,
	Text,
	Button,
	Position,
	Popover,
	Avatar,
	TabNavigation,
	Tab,
} from 'evergreen-ui';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { useSettingsModal } from '@/components/SettingsModal';
import { useTutorialModal } from '@/components/Tutorial/Tutorial';
import { ProfileCard } from '@/lib/hoagie-ui/ProfileCard';
import { hoagiePlan } from '@/lib/hoagie-ui/Theme/themes';
import useUserSlice, { useFetchUserProfile } from '@/store/userSlice';

export type NavProps = {
	// The name of the app for generating the `hoagie{name}` title.
	name: string;

	// A list of tab objects for the navbar, each with `title` and `href` fields.
	tabs?: Array<{ title: string; href: string; icon?: React.ReactNode; color?: string }>;

	// Auth0 user
	user: User;

	// A custom component to be used in place of the hoagie logo.
	LogoComponent?: ComponentType;

	// A custom component to be used in place of the header color strip.
	HeaderComponent?: ComponentType;

	// A flag to show the "beta" development disclaimer on the hoagie app logo.
	beta?: boolean;

	onAddMinor: () => void;
	onAddCertificate: () => void;
};

/**
 * Nav is a navbar meant for internal navigations throughout
 * different Hoagie applications.
 */
export const Nav: FC<NavProps> = ({ name, tabs = [], user, LogoComponent, beta = false }) => {
	const { openSettingsModal, settingsModal } = useSettingsModal();
	const theme = hoagiePlan;
	const router = useRouter();
	const pathname = usePathname();
	const { openTutorialModal, tutorialModal } = useTutorialModal();

	const { major, classYear } = useUserSlice((state) => state.profile);

	const majorCode = typeof major === 'object' && major?.code ? major.code : 'Undeclared';
	const shortClassYear = classYear ? `'${classYear.toString().slice(2)}` : '';
	const academicLabel = `${majorCode} ${shortClassYear}`.trim();

	useFetchUserProfile(user);

	let tutorialType: string = 'dashboard';
	if (!pathname.includes('/dashboard') && pathname.includes('/calendar')) {
		tutorialType = 'calendar';
	}

	return (
		<Pane elevation={1}>
			<Pane
				display='flex'
				alignItems='center'
				justifyContent='center'
				width='100%'
				height={majorScale(9)}
				background='white'
			>
				<Pane
					display='flex'
					alignItems='center'
					justifyContent='space-between'
					width='100%'
					height='100%'
					maxWidth={1200}
					fontSize={18}
					paddingX={majorScale(5)}
				>
					<Pane width='auto' display='flex' alignItems='center'>
						<Link href='/'>
							<Pane cursor='pointer' position='relative'>
								{LogoComponent ? (
									<LogoComponent />
								) : (
									<Pane>
										<Text
											is='h2'
											display='inline-block'
											className='hoagie logo'
											color='purple' 
										>
											hoagie
										</Text>
										<Text
											is='h2'
											display='inline-block'
											className='hoagie logo'
											color='purple'
										>
											{name}
										</Text>
										{beta && (
											<Text className='hoagie beta' position='absolute' color='gray900'>
												(BETA)
											</Text>
										)}
									</Pane>
								)}
							</Pane>
						</Link>
					</Pane>
					<Pane flex='1' display='flex' alignItems='center' justifyContent='center'>
						<TabNavigation>
							{tabs.map((tab) => (
								<Tab
									appearance='secondary'
									key={tab.title}
									is='a'
									id={tab.title}
									onSelect={() => router.push(tab.href)}
								>
									<Pane display='flex' alignItems='center'>
										{tab.icon}
										<Text fontWeight={700} color={tab.color}>
											{tab.title}
										</Text>
									</Pane>
								</Tab>
							))}
						</TabNavigation>
					</Pane>
					<Pane
						display='flex'
						alignItems='center'
						gap={majorScale(3)}
						marginRight={majorScale(3)}
						justifyContent='flex-end'
						minWidth={0}
						flexWrap='nowrap'
					>
						{/* <Pane
        				marginTop={majorScale(2)}
						cursor="pointer"
        				onClick={openSettingsModal}
        				borderBottom={`1px solid ${theme.colors.gray200}`}
        				paddingBottom={majorScale(1)}
      					>
						<Text size={400} color="gray800">
						  {academicLabel}
						</Text>
						<Button appearance="minimal" height={24} paddingX={8}>
						  Add a Minor
						</Button>
					  
						<Button appearance="minimal" height={24} paddingX={8}>
						  Add a Certificate
						</Button>
					</Pane> */}
						<Pane
							display='flex'
							alignItems='center'
							justifyContent='center'
							marginLeft='auto'
							cursor='pointer'
							onClick={() => openTutorialModal(tutorialType)}
						>
							<HelpOutlineIcon
								fontSize='medium'
								style={{ color: theme.colors.blue500 }}
								titleAccess='Open Tutorial'
							/>
						</Pane>

						{user && (
							<Popover
								content={<ProfileCard user={user} onSettingsClick={openSettingsModal} />}
								position={Position.BOTTOM}
							>
								<Avatar
									name={user.name}
									style={{ cursor: 'pointer' }}
									backgroundColor={theme.colors.slate150}
									size={40}
									marginLeft={majorScale(4)}
								/>
							</Popover>
						)}
						{tutorialModal}
					</Pane>
				</Pane>
			</Pane>

			{settingsModal}
		</Pane>
	);
};
