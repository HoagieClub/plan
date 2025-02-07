import type { FC } from 'react';
import { useState, useEffect } from 'react';

import type { Profile } from '@/types';

import LoadingComponent from '../LoadingComponent';
import { RecursiveDropdown } from '../RecursiveDropDown';

import styles from './TabbedMenu.module.css';

interface TabbedMenuProps {
  tabsData: { [key: string]: object };
  profile: Profile;
  csrfToken: string;
  updateRequirements: () => void;
}

const TabbedMenu: FC<TabbedMenuProps> = ({ tabsData, profile, csrfToken, updateRequirements }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    // Only set the active tab if it's not already set
    if (!activeTab && tabsData && Object.keys(tabsData).length > 0) {
      setActiveTab(Object.keys(tabsData)[0]);
    }
  }, [tabsData, activeTab]);

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  // Check if tabsData is well-defined and not empty
  if (!tabsData || Object.keys(tabsData).length === 0) {
    return <LoadingComponent />;
  }

  return (
    <div className={styles.tabContainer}>
      <ul className={styles.tabMenu}>
        {Object.keys(tabsData).map((tabKey) => (
          <li
            key={tabKey}
            className={tabKey === activeTab ? styles.active : ''}
            onClick={() => handleTabClick(tabKey)}
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
          activeTab && (
            <RecursiveDropdown
              key={activeTab}
              dictionary={tabsData[activeTab]}
              profile={profile}
              csrfToken={csrfToken}
              updateRequirements={updateRequirements}
            />
          )
        )}
      </div>
    </div>
  );
};

export default TabbedMenu;
