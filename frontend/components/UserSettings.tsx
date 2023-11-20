import useUserSlice from '@/store/userSlice';
import { MajorMinorType, ProfileProps } from '@/types';
import { useEffect, useState } from 'react';

import {
  Autocomplete,
  AutocompleteOption,
  Button,
  ListItemContent,
  FormControl,
  Input,
  Typography,
  FormLabel,
  Switch,
} from '@mui/joy';


function generateClassYears() {
  const currentYear = new Date().getFullYear() + 1;
  const classYears = [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  return classYears;
}

// Should probably id these corresponding to the ids in the database
const majors = [
  { code: 'COS (A.B.)', label: 'Computer Science' },
  { code: 'COS (B.S.E.)', label: 'Computer Science' },
  { code: 'MAE', label: 'Mechanical and Aerospace Engineering' },
];

const minors = [
  { code: 'FIN (Certificate)', label: 'Finance' },
  { code: 'SML', label: 'Statistics and Machine Learning' },
  { code: 'OQDS', label: 'Optimization and Quantitative Decision Science' },
];

const undeclared = { code: null, label: 'Undeclared' };
const none = { code: null, label: 'None' };

const UserSettings: React.FC<ProfileProps> = ({ profile, onClose, onSave }) => {
  const { updateProfile } = useUserSlice();
  const [localFirstName, setLocalFirstName] = useState<string>(profile.firstName);
  const [localLastName, setLocalLastName] = useState<string>(profile.lastName);
  const [localClassYear, setLocalClassYear] = useState<number | undefined>(
    generateClassYears().find(year => (year === profile.class_year)) ?? -1
  );
  const [localMajor, setLocalMajor] = useState<MajorMinorType | undefined>(profile.major ?? undeclared);
  const [localMinors, setLocalMinors] = useState<MajorMinorType[] | undefined>(
    profile.minors && profile.minors.length > 0 ? profile.minors : [none]
  );
  const [localTimeFormat24h, setLocalTimeFormat24h] = useState<boolean>(profile.timeFormat24h);
  const [localThemeDarkMode, setLocalThemeDarkMode] = useState<boolean>(profile.themeDarkMode);

  // this might be useless
  useEffect(() => {
    setLocalFirstName(profile.firstName || '');
    setLocalLastName(profile.lastName || '');
    setLocalMajor(useUserSlice.getState().major);
    setLocalMinors(useUserSlice.getState().minors);
    setLocalClassYear(useUserSlice.getState().class_year || undefined);
    setLocalTimeFormat24h(profile.timeFormat24h || false);
    setLocalThemeDarkMode(profile.themeDarkMode || false);
  }, [profile]);

  const handleSave = async () => {
    updateProfile({
      firstName: localFirstName,
      lastName: localLastName,
      major: localMajor,
      minors: localMinors,
      class_year: localClassYear,
      timeFormat24h: localTimeFormat24h,
      themeDarkMode: localThemeDarkMode,
    });

    onSave(useUserSlice.getState());


    fetch('http://localhost:8000/update_user_class_year/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      // Need CSRF token here from Next.js
      body: useUserSlice.getState().class_year.toString(),
    })
        .then((response) => response.json())
        .then((data) => console.log('Update success', data))
        .catch((error) => console.error('Update Error:', error));


    console.log(localMajor)
    console.log(useUserSlice.getState().major)
    onClose();
  };
  return (
    <div className='fixed top-0 left-0 w-screen h-screen flex justify-center items-center z-50'>
      <div className='bg-white p-5 rounded-lg max-w-md w-1/2 shadow-lg'>
        <div className='grid grid-cols-2 gap-4'>
          <Input
            placeholder='First name'
            variant='soft'
            value={localFirstName}
            onChange={(e) => setLocalFirstName(e.target.value)}
            fullWidth
          />
          <Input
            placeholder='Last name'
            variant='soft'
            value={localLastName}
            onChange={(e) => setLocalLastName(e.target.value)}
            fullWidth
          />
          <Autocomplete
            autoHighlight
            options={majors}
            placeholder='Select your major'
            variant='soft'
            value={localMajor}
            onChange={(_, e) => setLocalMajor(e ?? undeclared)}
            getOptionLabel={(option) => option.label}
            renderOption={(props, option) => (
              <AutocompleteOption {...props}>
                <ListItemContent>
                  {option.label}
                  <Typography level='body-xs'>({option.code})</Typography>
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
          <Autocomplete
            multiple
            autoHighlight
            options={minors}
            placeholder={'Select your minor(s)'}
            variant='soft'
            value={localMinors ?? undefined}
            onChange={(_, e) => setLocalMinors(e)}
            getOptionLabel={(option) => option.label}
            renderOption={(props, option) => (
              <AutocompleteOption {...props}>
                <ListItemContent>
                  {option.label}
                  <Typography level="body-xs">
                    ({option.code})
                  </Typography>
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
          <Autocomplete
            autoHighlight
            options={generateClassYears()}
            placeholder='Class year'
            variant='soft'
            value={localClassYear}
            onChange={(_, e) => setLocalClassYear(e ?? undefined)}
            renderOption={(props, option) => (
              <AutocompleteOption {...props}>
                <ListItemContent>
                  {option}
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
          <FormControl
            orientation='horizontal'
            sx={{ width: '100%', justifyContent: 'space-between' }}
          >
            <div>
              <FormLabel>Dark Mode</FormLabel>
            </div>
            <Switch
              checked={localThemeDarkMode}
              onChange={(e) => setLocalThemeDarkMode(e.target.checked)}
              color={localThemeDarkMode ? 'success' : 'neutral'}
              variant={localThemeDarkMode ? 'solid' : 'outlined'}
            />
          </FormControl>
          <FormControl
            orientation='horizontal'
            sx={{ width: '100%', justifyContent: 'space-between' }}
          >
            <div>
              <FormLabel>24-Hour Time Format</FormLabel>
            </div>
            <Switch
              checked={localTimeFormat24h}
              onChange={(e) => setLocalTimeFormat24h(e.target.checked)}
              color={localTimeFormat24h ? 'success' : 'neutral'}
              variant={localTimeFormat24h ? 'solid' : 'outlined'}
            />
          </FormControl>
        </div>
        <div className='mt-5 text-right'>
          <Button
            variant='solid'
            color='primary'
            onClick={handleSave}
            size='md'>
            Save
          </Button>
          <Button
            variant='outlined'
            color='neutral'
            onClick={onClose}
            sx={{ ml: 2 }}
            size='sm'>
            Close
          </Button>
        </div>
        </div>
      </div>
  );
};

export default UserSettings;
