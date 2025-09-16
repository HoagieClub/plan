const distributionColors: Record<string, string> = {
	SA: '#d4e4bc',
	SEL: '#96acb7',
	SEN: '#36558f',
	QCR: '#78cad2',
	LA: '#48239c',
	HA: '#45a29e',
	EM: '#f8a55f',
	EC: '#f67280',
	CD: '#af7ac5',
	MULTI: '#a0aec0', // For multiple distribution
};

export const getDistributionColors = (distShort: string): string => {
	const isMultiDist = distShort.includes('OR');
	if (isMultiDist) {
		return distributionColors['MULTI'];
	}
	return distributionColors[distShort];
};
