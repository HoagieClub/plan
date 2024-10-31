import { FC, useState, useEffect, useCallback } from 'react';

import {
  Autocomplete,
  AutocompleteOption,
  Button as JoyButton,
  ListItemContent,
  Input,
  Typography,
  FormLabel,
  Snackbar,
} from '@mui/joy';

import { MajorMinorType, ProfileProps } from '@/types';

import useUserSlice from '@/store/userSlice';

async function fetchCsrfToken() {
  try {
    const response = await fetch(`${process.env.BACKEND}/csrf`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.csrfToken ? String(data.csrfToken) : '';
  } catch (error) {
    return 'Error fetching CSRF token!';
  }
}

function generateClassYears() {
  const currentYear = new Date().getFullYear();
  const classYears = [
    currentYear,
    currentYear + 1,
    currentYear + 2,
    currentYear + 3,
    currentYear + 4,
  ];
  return classYears;
}

// Should probably id these corresponding to the ids in the database
const undeclared = { code: 'Undeclared', name: 'Undeclared' };
const defaultClassYear = new Date().getFullYear();

// Should probably id these corresponding to the ids in the database
const majorOptions = [
  { code: 'AAS', name: 'African American Studies' },
  { code: 'ANT', name: 'Anthropology' },
  { code: 'ARC', name: 'Architecture' },
  { code: 'ART', name: 'Art and Archaeology' },
  { code: 'AST', name: 'Astrophysical Sciences' },
  { code: 'CBE', name: 'Chemical and Biological Engineering' },
  { code: 'CEE', name: 'Civil and Environmental Engineering' },
  { code: 'CHM', name: 'Chemistry' },
  { code: 'CLA', name: 'Classics' },
  { code: 'COM', name: 'Comparative Literature' },
  { code: 'COS-AB', name: 'Computer Science - A.B.' },
  { code: 'COS-BSE', name: 'Computer Science - B.S.E.' },
  { code: 'EAS', name: 'East Asian Studies' },
  { code: 'ECE', name: 'Electrical and Computer Engineering' },
  { code: 'ECO', name: 'Economics' },
  { code: 'EEB', name: 'Ecology and Evolutionary Biology' },
  { code: 'ENG', name: 'English' },
  { code: 'FIT', name: 'French and Italian' },
  { code: 'GEO', name: 'Geosciences' },
  { code: 'GER', name: 'German' },
  { code: 'HIS', name: 'History' },
  { code: 'MAE', name: 'Mechanical and Aerospace Engineering' },
  { code: 'MAT', name: 'Mathematics' },
  { code: 'MOL', name: 'Molecular Biology' },
  { code: 'MUS', name: 'Music' },
  { code: 'NES', name: 'Near Eastern Studies' },
  { code: 'NEU', name: 'Neuroscience' },
  { code: 'ORF', name: 'Operations Research and Financial Engineering' },
  { code: 'PHI', name: 'Philosophy' },
  { code: 'PHY', name: 'Physics' },
  { code: 'POL', name: 'Politics' },
  { code: 'PSY', name: 'Psychology' },
  { code: 'REL', name: 'Religion' },
  { code: 'SLA', name: 'Slavic Languages and Literatures' },
  { code: 'SOC', name: 'Sociology' },
  { code: 'SPA', name: 'Spanish' },
  { code: 'POR', name: 'Portuguese' },
  { code: 'SPI', name: 'School of Public and International Affairs' },
  // { code: 'Independent', name: 'Independent' },
  { code: 'Undeclared', name: 'Undeclared' },
];

const minorOptions = [
  { code: 'AFS', name: 'African Studies' },
  { code: 'ARA', name: 'Arabic Language' },
  { code: 'ASA', name: 'Asian American Studies' },
  { code: 'CHI', name: 'Chinese Language' },
  { code: 'CLA', name: 'Classics' },
  { code: 'COS', name: 'Computer Science' },
  { code: 'CS', name: 'Climate Science' },
  { code: 'CWR', name: 'Creative Writing' },
  { code: 'DAN', name: 'Dance' },
  { code: 'EAS', name: 'East Asian Studies Program' },
  { code: 'ENG', name: 'English' },
  { code: 'ENV', name: 'Environmental Studies' },
  { code: 'FIN', name: 'Finance' },
  { code: 'GHP', name: 'Global Health and Health Policy' },
  { code: 'GSS', name: 'Gender and Sexuality Studies' },
  { code: 'HIS', name: 'History' },
  { code: 'HLS', name: 'Hellenic Studies' },
  { code: 'HSTM', name: 'History of Science, Technology, and Medicine' },
  { code: 'HUM', name: 'Humanistic Studies' },
  { code: 'JPN', name: 'Japanese Language' },
  { code: 'JRN', name: 'Journalism' },
  { code: 'KOR', name: 'Korean Language' },
  { code: 'LAO', name: 'Latino Studies' },
  { code: 'LIN', name: 'Linguistics' },
  { code: 'MED', name: 'Medieval Studies' },
  { code: 'MPP', name: 'Music Performance' },
  { code: 'MQE', name: 'Quantitative Economics' },
  { code: 'MSE', name: 'Materials Science and Engineering' },
  { code: 'MUS', name: 'Music' },
  { code: 'NEU', name: 'Neuroscience' },
  { code: 'PHI', name: 'Philosophy' },
  { code: 'RES', name: 'Russian, East European and Eurasian Studies' },
  { code: 'SAS', name: 'South Asian Studies' },
  { code: 'SLA', name: 'Slavic Languages and Literatures' },
  { code: 'SML', name: 'Statistics and Machine Learning' },
  { code: 'TMT', name: 'Theater and Music Theater' },
  { code: 'TRA', name: 'Translation and Intercultural Communication' },
  { code: 'VIS', name: 'Visual Arts' },
  { code: 'VPL', name: 'Values and Public Life' },
];

const certificateOptions = [
  { code: 'AAS', name: 'African American Studies - Open to Class of 25 only' },
  { code: 'ACE', name: 'Architecture and Engineering - Open to all class years' },
  { code: 'AMS', name: 'American Studies - Open to all class years' },
  { code: 'AST', name: 'Planets and Life - Open to all class years' },
  { code: 'ENT', name: 'Entrepreneurship - Open to all class years' },
  { code: 'GEO', name: 'Geological Engineering - Open to all class years' },
  { code: 'GER', name: 'German - Open to all class years' },
  { code: 'HPD', name: 'History and the Practice of Diplomacy - Open to all class years' },
  { code: 'LAC-CLA', name: 'Language and Culture: Classics - Open to Class of 25 only' },
  { code: 'LAC-POR', name: 'Portuguese Language and Culture - Open to Class of 25 only' },
  { code: 'LAC-SPA', name: 'Spanish Language and Culture - Open to Class of 25 only' },
  {
    code: 'OQDS',
    name: 'Optimization and Quantitative Decision Science - Open to all class years',
  },
  { code: 'QCB', name: 'Quantitative and Computational Biology - Open to all class years' },
  { code: 'RIS', name: 'Robotics and Intelligent Systems - Open to Class of 25 only' },
  { code: 'TAS-E', name: 'Technology and Society - Energy Track - Open to all class years' },
  { code: 'TAS-IT', name: 'Technology and Society - IT Track - Open to all class years' },
  { code: 'TPP', name: 'Teacher Preparation - Open to all class years' },
  { code: 'URB', name: 'Urban Studies - Open to all class years' },
];

const UserSettings: FC<ProfileProps> = ({ profile, onClose, onSave }) => {
  const { updateProfile } = useUserSlice((state) => state);
  const [firstName, setFirstName] = useState<string>(profile.firstName);
  const [lastName, setLastName] = useState<string>(profile.lastName);
  const [classYear, setClassYear] = useState(profile.classYear || defaultClassYear);
  const [major, setMajor] = useState<MajorMinorType>(profile.major ?? undeclared);
  const [minors, setMinors] = useState<MajorMinorType[]>(profile.minors || []);
  const [certificates, setCertificates] = useState<MajorMinorType[]>(profile.certificates || []);
  // const [timeFormat24h, setTimeFormat24h] = useState<boolean>(profile.timeFormat24h);
  // const [themeDarkMode, setThemeDarkMode] = useState<boolean>(profile.themeDarkMode);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);

  const handleMinorsChange = (_, newMinors: MajorMinorType[]) => {
    const uniqueMinors = Array.from(new Set(newMinors.map((minor) => minor.code))).map((code) =>
      newMinors.find((minor) => minor.code === code)
    );
    if (uniqueMinors.length > 3) {
      setOpenSnackbar(true);
    } else {
      setMinors(uniqueMinors);
    }
  };

  const handleCertificatesChange = (_, newCertificates: MajorMinorType[]) => {
    const uniqueCertificates = Array.from(
      new Set(newCertificates.map((certificate) => certificate.code))
    ).map((code) => newCertificates.find((certificate) => certificate.code === code));
    if (uniqueCertificates.length > 3) {
      setOpenSnackbar(true);
    } else {
      setCertificates(uniqueCertificates);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSave = useCallback(async () => {
    const oldProfile = useUserSlice.getState().profile;
    const profile = {
      ...oldProfile,
      firstName: firstName,
      lastName: lastName,
      major: major ?? undeclared,
      minors: minors,
      certificates: certificates,
      classYear: classYear,
    };
    const csrfToken = await fetchCsrfToken();

    fetch(`${process.env.BACKEND}/update_profile/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(profile),
    }).then((response) => {
      if (!response.ok) {
        throw new Error('POST request to update profile failed.');
      }
      updateProfile(profile);
      onSave(profile);
    });
  }, [updateProfile, firstName, lastName, major, minors, certificates, classYear, onSave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleSave]);

  return (
    <div>
      <div className='grid grid-cols-2 gap-6'>
        <div>
          <FormLabel>First name</FormLabel>
          <Input
            placeholder='First name'
            variant='soft'
            autoComplete='off'
            value={firstName}
            onChange={(event) => {
              event.stopPropagation();
              setFirstName(event.target.value);
            }}
          />
        </div>
        <div>
          <FormLabel>Last name</FormLabel>
          <Input
            placeholder='Last name'
            variant='soft'
            autoComplete='off'
            value={lastName}
            onChange={(event) => {
              event.stopPropagation();
              setLastName(event.target.value);
            }}
          />
        </div>
        <div>
          <FormLabel>Major</FormLabel>
          <Autocomplete
            multiple={false}
            autoHighlight
            options={majorOptions}
            placeholder='Select your major'
            variant='soft'
            value={major}
            // inputValue={major.code === undeclared.code ? '' : major.code}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            onChange={(event, newMajor: MajorMinorType) => {
              event.stopPropagation();
              setMajor(newMajor ?? undeclared);
            }}
            getOptionLabel={(option: MajorMinorType) => option.code}
            renderOption={(props, option) => (
              <AutocompleteOption {...props} key={option.name}>
                <ListItemContent>
                  {option.code}
                  <Typography level='body-sm'>{option.name}</Typography>
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
        </div>
        <div>
          <FormLabel>Minor(s)</FormLabel>
          <Autocomplete
            multiple={true}
            autoHighlight
            options={minorOptions}
            placeholder={'Select your minor(s)'}
            variant='soft'
            value={minors}
            isOptionEqualToValue={(option, value) =>
              value === undefined || option.code === value.code
            }
            onChange={(event, newMinors: MajorMinorType[]) => {
              event.stopPropagation();
              handleMinorsChange(event, newMinors);
            }}
            getOptionLabel={(option: MajorMinorType) => option.code}
            renderOption={(props, option) => (
              <AutocompleteOption {...props} key={option.name}>
                <ListItemContent>
                  {option.code}
                  <Typography level='body-sm'>{option.name}</Typography>
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
        </div>
        <div>
          <FormLabel>Certificate(s)</FormLabel>
          <Autocomplete
            multiple={true}
            autoHighlight
            options={certificateOptions}
            placeholder={'Select your certificate(s)'}
            variant='soft'
            value={certificates}
            isOptionEqualToValue={(option, value) =>
              value === undefined || option.code === value.code
            }
            onChange={(event, newCertificates: MajorMinorType[]) => {
              event.stopPropagation();
              handleCertificatesChange(event, newCertificates);
            }}
            getOptionLabel={(option: MajorMinorType) => option.code}
            renderOption={(props, option) => (
              <AutocompleteOption {...props} key={option.name}>
                <ListItemContent>
                  {option.code}
                  <Typography level='body-sm'>{option.name}</Typography>
                </ListItemContent>
              </AutocompleteOption>
            )}
          />
        </div>
        <Snackbar
          open={openSnackbar}
          color={'primary'}
          variant={'soft'}
          onClose={handleCloseSnackbar}
          autoHideDuration={6000}
          sx={{
            '.MuiSnackbar-root': {
              borderRadius: '16px', // Roundedness
            },
            backgroundColor: '#0F1E2F', // Compass Blue
            color: '#f6f6f6', // Compass Gray
          }}
        >
          <div className='text-center'>
            You can only minor in two programs and plan up to three.
          </div>
        </Snackbar>
        {/* <div>
            <FormLabel>Certificate(s)</FormLabel>
            <Autocomplete
              multiple={true}
              options={minorOptions}
              placeholder={'Select your certificate(s)'}
              variant='soft'
              value={minors}
              isOptionEqualToValue={(option, value) => value === undefined || option === value}
              onChange={handleMinorsChange}
              getOptionLabel={(option: MajorMinorType) => option.code}
              renderOption={(props, option) => (
                <AutocompleteOption {...props} key={option.name}>
                  <ListItemContent>
                    {option.code}
                    <Typography level='body-sm'>{option.name}</Typography>
                  </ListItemContent>
                </AutocompleteOption>
              )}
            />
          </div> */}
        <div>
          <FormLabel>Class year</FormLabel>
          <Autocomplete
            multiple={false}
            autoHighlight
            options={generateClassYears()}
            placeholder='Class year'
            variant='soft'
            value={classYear}
            isOptionEqualToValue={(option, value) => value === undefined || option === value}
            onChange={(event, newClassYear: number | undefined) => {
              event.stopPropagation();
              setClassYear(newClassYear ?? undefined);
            }}
            getOptionLabel={(option) => option.toString()}
            renderOption={(props, option) => (
              <AutocompleteOption {...props} key={option}>
                <ListItemContent>{option}</ListItemContent>
              </AutocompleteOption>
            )}
          />
        </div>
        {/* <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <FormLabel>Dark Mode</FormLabel>
            <Switch
              checked={themeDarkMode}
              onChange={(event) => setThemeDarkMode(event.target.checked)}
              color={themeDarkMode ? 'success' : 'neutral'}
              variant={themeDarkMode ? 'solid' : 'outlined'}
            />
          </Box> */}

        {/* Implement this once we have ReCal functionality, perhaps in IW work */}
        {/* <FormControl
            orientation='horizontal'
            sx={{ width: '100%', justifyContent: 'space-between' }}
          >
            <div>
              <FormLabel>24-Hour Time Format</FormLabel>
            </div>
            <Switch
              checked={timeFormat24h}
              onChange={(event) => setTimeFormat24h(event.target.checked)}
              // TODO: Consider changing color to match our color palette
              color={timeFormat24h ? 'success' : 'neutral'}
              variant={timeFormat24h ? 'solid' : 'outlined'}
            />
          </FormControl> */}
      </div>
      <div className='mt-5 text-right'>
        <JoyButton variant='soft' color='primary' onClick={handleSave} size='md'>
          Save
        </JoyButton>
        <JoyButton variant='soft' color='neutral' onClick={onClose} sx={{ ml: 2 }} size='md'>
          Cancel
        </JoyButton>
      </div>
    </div>
  );
};
export default UserSettings;
