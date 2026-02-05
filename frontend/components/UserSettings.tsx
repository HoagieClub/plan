import { useCallback, useEffect, useState, type FC } from 'react';

import {
	Autocomplete,
	AutocompleteOption,
	FormLabel,
	Input,
	Button as JoyButton,
	ListItemContent,
	Snackbar,
	Typography,
} from '@mui/joy';

import useUserSlice from '@/store/userSlice';
import type { MajorMinorType, ProfileProps } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';
import { CERTIFICATE_OPTIONS, MAJOR_OPTIONS, MINOR_OPTIONS } from '@/utils/programs';

import { isOptionEqual, smartSearch } from './MajorMinorSearch';

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

// TODO: Should probably id these corresponding to the ids in the database
const undeclared = { code: 'Undeclared', name: 'Undeclared' };
const defaultClassYear = new Date().getFullYear();

export const UserSettings: FC<ProfileProps> = ({ profile, onClose, onSave }) => {
	const updateProfile = useUserSlice((state) => state.updateProfile);
	const { updateRequirements } = useUserSlice((state) => ({
		updateRequirements: state.updateRequirements,
	}));
	const [firstName, setFirstName] = useState(profile.firstName);
	const [lastName, setLastName] = useState(profile.lastName);
	const [classYear, setClassYear] = useState(profile.classYear || defaultClassYear);
	const startingMajor = typeof profile.major !== 'string' ? profile.major : undeclared;
	const [major, setMajor] = useState<MajorMinorType>(startingMajor);
	const [minors, setMinors] = useState<MajorMinorType[]>(profile.minors || []);
	const [certificates, setCertificates] = useState<MajorMinorType[]>(profile.certificates || []);
	const [openSnackbar, setOpenSnackbar] = useState(false);
	// const [timeFormat24h, setTimeFormat24h] = useState<boolean>(profile.timeFormat24h);
	// const [themeDarkMode, setThemeDarkMode] = useState<boolean>(profile.themeDarkMode);

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

	const [csrfToken, setCsrfToken] = useState('');
	useEffect(() => {
		void (async () => {
			const token = await fetchCsrfToken();
			setCsrfToken(token);
		})();
	}, []);

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

		try {
			const response = await fetch(`/api/hoagie/profile/update`, {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrfToken,
				},
				body: JSON.stringify(profile),
			});

			if (!response.ok) {
				throw new Error('POST request to update profile failed.');
			}

			updateProfile(profile);
			onSave(profile);
			await updateRequirements();
		} catch (error) {
			console.error('Error updating profile:', error);
		}
	}, [
		updateProfile,
		firstName,
		lastName,
		major,
		minors,
		certificates,
		classYear,
		csrfToken,
		onSave,
		updateRequirements,
	]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				void handleSave();
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
					{/* TODO: Names are now fixed due to Auth0 migration. Either see if we can change Auth0 data directly or deprecate this. */}
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
						options={MAJOR_OPTIONS}
						// Call smartSearch to search through all majors and determine matches for inputValue.
						filterOptions={(options, { inputValue }) => smartSearch(inputValue, options)}
						placeholder='Select your major'
						variant='soft'
						value={major}
						// inputValue={major.code === undeclared.code ? '' : major.code}
						isOptionEqualToValue={isOptionEqual}
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
						options={MINOR_OPTIONS}
						// Call smartSearch to search through all minors and determine matches for inputValue.
						filterOptions={(options, { inputValue }) => smartSearch(inputValue, options)}
						placeholder='Select your minor(s)'
						variant='soft'
						value={minors}
						isOptionEqualToValue={isOptionEqual}
						onChange={(event, newMinors: MajorMinorType[]) => {
							event.stopPropagation();
							handleMinorsChange(event, newMinors);
						}}
						getOptionLabel={(option: MajorMinorType) => option.code}
						renderOption={(props, option) => {
							// Determine if current minor 'option' is already selected by the user.
							const isAlreadySelected = minors.some((minor) => minor.code === option.code);
							return (
								<AutocompleteOption
									{...props}
									key={option.name}
									component='li'
									// Disable the selection of and add custom styling (i.e. darkened background) to already selected minors.
									sx={{
										...(isAlreadySelected && {
											color: 'darkgray',
											pointerEvents: 'none',
										}),
									}}
								>
									<ListItemContent>
										{option.code}
										<Typography level='body-sm'>{option.name}</Typography>
									</ListItemContent>
								</AutocompleteOption>
							);
						}}
					/>
				</div>
				<div>
					<FormLabel>Certificate(s)</FormLabel>
					<Autocomplete
						multiple={true}
						autoHighlight
						options={CERTIFICATE_OPTIONS}
						// Call smartSearch to search through all certificates and determine matches for inputValue.
						filterOptions={(options, { inputValue }) => smartSearch(inputValue, options)}
						placeholder='Select your certificate(s)'
						variant='soft'
						value={certificates}
						isOptionEqualToValue={isOptionEqual}
						onChange={(event, newCertificates: MajorMinorType[]) => {
							event.stopPropagation();
							handleCertificatesChange(event, newCertificates);
						}}
						getOptionLabel={(option: MajorMinorType) => option.code}
						renderOption={(props, option) => {
							// Determine if current certificate 'option' is already selected by the user.
							const isAlreadySelected = certificates.some(
								(certificate) => certificate.code === option.code
							);
							return (
								<AutocompleteOption
									{...props}
									key={option.name}
									component='li'
									// Disable the selection of and add custom styling (i.e. darkened background) to already selected certificates.
									sx={{
										...(isAlreadySelected && {
											color: 'darkgray',
											pointerEvents: 'none',
										}),
									}}
								>
									<ListItemContent>
										{option.code}
										<Typography level='body-sm'>{option.name}</Typography>
									</ListItemContent>
								</AutocompleteOption>
							);
						}}
					/>
				</div>
				<Snackbar
					open={openSnackbar}
					color='primary'
					variant='soft'
					onClose={handleCloseSnackbar}
					autoHideDuration={6000}
					sx={{
						'.MuiSnackbar-root': {
							borderRadius: '16px', // Roundedness
						},
						backgroundColor: '#0F1E2F', // Hoagie Plan Blue
						color: '#f6f6f6', // Hoagie Plan Gray
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
