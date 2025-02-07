import type { FC } from 'react';
import { useState } from 'react';

import {
  Pane,
  Tablist,
  Tab,
  TextInput,
  IconButton,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
} from 'evergreen-ui';

interface ConfigurationSelectorProps {
  configurations: Array<{ id: string; name: string }>;
  activeConfiguration: string;
  onConfigurationChange: (configurationId: string) => void;
  onConfigurationCreate: (name: string) => Promise<void>;
  onConfigurationDelete: (configurationId: string) => Promise<void>;
  onConfigurationRename: (configurationId: string, newName: string) => void;
  getTermSuffix: (configurationId: string) => string;
}

const ConfigurationSelector: FC<ConfigurationSelectorProps> = ({
  configurations,
  activeConfiguration,
  onConfigurationChange,
  onConfigurationCreate,
  onConfigurationDelete,
  onConfigurationRename,
  getTermSuffix,
}) => {
  const [editingConfiguration, setEditingConfiguration] = useState('');
  const [configurationName, setConfigurationName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const configurationsPerPage = 5;
  const totalPages = Math.ceil(configurations.length / configurationsPerPage);

  const handleConfigurationClick = (configurationId: string) => {
    onConfigurationChange(configurationId);
    setEditingConfiguration('');
  };

  const handleConfigurationRename = (configurationId: string) => {
    onConfigurationRename(configurationId, configurationName);
    setEditingConfiguration('');
    setConfigurationName('');
  };

  const handleConfigurationCreate = async () => {
    const termSuffix = getTermSuffix(activeConfiguration);
    setConfigurationName('');
    await onConfigurationCreate(termSuffix);
  };

  const handleConfigurationDelete = async (configurationId: string) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this configuration? This action cannot be undone.'
    );
    if (confirmDelete) {
      await onConfigurationDelete(configurationId);
    }
  };

  const startIndex = (currentPage - 1) * configurationsPerPage;
  const endIndex = startIndex + configurationsPerPage;
  const displayedConfigurations = configurations.slice(startIndex, endIndex);

  return (
    <Pane display='flex' alignItems='center'>
      <IconButton
        icon={ChevronLeftIcon}
        appearance='minimal'
        onClick={() => setCurrentPage(currentPage - 1)}
        disabled={currentPage === 1}
        marginRight={8}
      />

      <Tablist>
        {displayedConfigurations.map((configuration) => (
          <Tab
            key={configuration.id}
            isSelected={activeConfiguration === configuration.id}
            onSelect={() => handleConfigurationClick(configuration.id)}
            marginRight={8}
            paddingX={12}
            paddingY={8}
          >
            {editingConfiguration === configuration.id ? (
              <TextInput
                value={configurationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfigurationName(e.target.value)
                }
                onBlur={() => handleConfigurationRename(configuration.id)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleConfigurationRename(configuration.id);
                  }
                }}
                maxLength={20}
              />
            ) : (
              <Pane display='flex' alignItems='center'>
                <span onClick={() => setEditingConfiguration(configuration.id)}>
                  {configuration.name}
                </span>
                <IconButton
                  icon={EditIcon}
                  appearance='minimal'
                  marginLeft={4}
                  onClick={() => setEditingConfiguration(configuration.id)}
                />
              </Pane>
            )}
          </Tab>
        ))}
      </Tablist>

      <IconButton
        icon={ChevronRightIcon}
        appearance='minimal'
        onClick={() => setCurrentPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        marginLeft={8}
      />

      <IconButton icon={PlusIcon} appearance='minimal' onClick={handleConfigurationCreate} />

      {activeConfiguration && (
        <IconButton
          icon={TrashIcon}
          appearance='minimal'
          intent='danger'
          onClick={() => handleConfigurationDelete(activeConfiguration)}
        />
      )}
    </Pane>
  );
};

export default ConfigurationSelector;
