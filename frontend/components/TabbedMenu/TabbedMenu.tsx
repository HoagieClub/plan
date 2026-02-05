import { type FC, useState, useEffect } from 'react';

import { LoadingComponent } from '@/components/LoadingComponent';
import { RecursiveDropdown } from '@/components/RecursiveDropDown';
import useUserSlice from '@/store/userSlice';

import styles from './TabbedMenu.module.css';

interface TabbedMenuProps {
	csrfToken: string;
}

export const TabbedMenu: FC<TabbedMenuProps> = ({ csrfToken }) => {
	const { academicPlan } = useUserSlice((state) => ({ academicPlan: state.academicPlan }));
	const [activeTab, setActiveTab] = useState<string | null>(null);

	useEffect(() => {
		const keys = academicPlan && Object.keys(academicPlan);

		// if there's no activeTab or if activeTab no longer exists in academicPlan
		if (!activeTab || (keys && !keys.includes(activeTab))) {
			if (keys && keys.length > 0) {
				setActiveTab(keys[0]);
			} else {
				setActiveTab(null); // Q: is this needed? wouldn't this just make us pass in nulls?
			}
		}
	}, [academicPlan, activeTab]);

	// Check if tabsData is well-defined and not empty
	if (!academicPlan || Object.keys(academicPlan).length === 0) {
		return <LoadingComponent />;
	}

	const keys = Object.keys(academicPlan);
	const currentData = activeTab ? academicPlan[activeTab] : null;

	return (
		<div className={styles.tabContainer}>
			<ul className={styles.tabMenu}>
				{keys.map((tabKey) => (
					<li
						key={tabKey}
						className={tabKey === activeTab ? styles.active : ''}
						onClick={() => setActiveTab(tabKey)}
						// style={{
						//   fontWeight: tabsData[tabKey]['satisfied'] ? '500' : 'normal',
						//   color: tabsData[tabKey]['satisfied'] ? 'green' : 'inherit',
						// }}
					>
						{tabKey}
					</li>
				))}
			</ul>
			<div className={styles.tabContent}>
				{activeTab === 'Undeclared' ? (
					<div className='text-sm font-medium text-gray-500'>
						To choose your major and minor(s), select
						<strong> Account Settings </strong>
						within your profile in the top right-hand corner.
					</div>
				) : (
					// Render RecursiveDropdown only if we have valid currentData
					currentData && (
						<RecursiveDropdown key={activeTab} academicPlan={currentData} csrfToken={csrfToken} />
					)
				)}
			</div>
		</div>
	);
};
