const auditGradingOptions = ['FUL', 'PDF', 'ARC', 'NGR', 'NOT', 'NPD', 'YR'];

export const getAuditTag = (gradingBasis: string): string => {
	return auditGradingOptions.includes(gradingBasis) ? 'A' : 'NA';
};

export const getAuditColor = (auditTag: string): string => {
	return auditTag === 'A' ? '#fa9f3e' : '#ff6161';
};
