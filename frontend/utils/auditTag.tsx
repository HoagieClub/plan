const auditGradingOptions = ['FUL', 'PDF', 'ARC', 'NGR', 'NOT', 'NPD', 'YR'];

export const getAuditTag = (gradingBasis: string): string => {
	return auditGradingOptions.includes(gradingBasis) ? 'A' : 'NA';
};
