export const getSemesterTag = (semesterAvailability: string): string => {
	switch (semesterAvailability) {
		case 'Fall':
			return 'F';
		case 'Spring':
			return 'S';
		case 'Both':
			return 'F/S';
		default:
			return '';
	}
};

export const getSemesterColor = (semesterTag: string): string => {
	switch (semesterTag) {
		case 'F':
			return '#e07c3e';
		case 'S':
			return '#4caf50';
		case 'F/S':
			return '#7c4dff';
		default:
			return '#9e9e9e';
	}
};

export const getSemesterTitle = (semesterTag: string): string => {
	switch (semesterTag) {
		case 'F':
			return 'Offered in Fall';
		case 'S':
			return 'Offered in Spring';
		case 'F/S':
			return 'Offered in Fall & Spring';
		default:
			return '';
	}
};
