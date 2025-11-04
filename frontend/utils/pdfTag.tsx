const pdfGradingOptions = ['PDF', 'FUL', 'NAU'];

export const getPdfTag = (gradingBasis: string): string => {
	return pdfGradingOptions.includes(gradingBasis) ? 'PDF' : 'NPDF';
};

export const getPdfColor = (pdfTag: string): string => {
	return pdfTag === 'PDF' ? '#fa9f3e' : '#ff6161';
};
