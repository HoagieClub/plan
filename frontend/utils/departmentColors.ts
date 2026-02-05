import type { UniqueIdentifier } from '@dnd-kit/core';

export const departmentColors: Record<string, string> = {
	AAS: '#ff5f6d',
	AFS: '#edb200',
	AMS: '#00b4db',
	ANT: '#284277',
	AOS: '#33c395',
	APC: '#ff0844',
	ARA: '#551a80',
	ARC: '#ff4e50',
	ART: '#db36a4',
	ASA: '#ffb347',
	AST: '#2980b9',
	ATL: '#dd2476',
	BCS: '#614385',
	CBE: '#3a7bd5',
	CEE: '#11998e',
	CGS: '#4776e6',
	CHI: '#ff416c',
	CHM: '#ee0979',
	CHV: '#1d2b64',
	CLA: '#e65c00',
	CLG: '#59c173',
	COM: '#f46b45',
	COS: '#4bb0e0',
	CSE: '#45b649',
	CTL: '#0854a1',
	CWR: '#693fbf',
	CZE: '#a43f75',
	DAN: '#3c556e',
	EAS: '#ff6e7f',
	ECE: '#12c2e9',
	ECO: '#f2994a',
	ECS: '#2f6254',
	EEB: '#1abc9c',
	EGR: '#354f7e',
	ELE: '#7f00ff',
	ENE: '#16a085',
	ENG: '#355c7d',
	ENT: '#6a3093',
	ENV: '#1e9600',
	EPS: '#134e5e',
	FIN: '#f12711',
	FRE: '#8a2387',
	FRS: '#9b59b6',
	GEO: '#c0392b',
	GER: '#ad5389',
	GHP: '#ff0099',
	GLS: '#3a6186',
	GSS: '#ff512f',
	HEB: '#c33764',
	HIN: '#b92b27',
	HIS: '#3494e6',
	HLS: '#e44d26',
	HOS: '#16bffd',
	HPD: '#1c92d2',
	HUM: '#2193b0',
	ISC: '#4ca1af',
	ITA: '#4ca2cd',
	JDS: '#5d4157',
	JPN: '#ff5858',
	JRN: '#ffb347',
	KOR: '#ff4b1f',
	LAO: '#f2709c',
	LAS: '#8a2387',
	LAT: '#7b4397',
	LCA: '#a8ff78',
	LIN: '#422080',
	MAE: '#2ec5a6',
	MAT: '#ed213a',
	MED: '#314755',
	MOD: '#17223b',
	MOG: '#ee9ca7',
	MOL: '#02aab0',
	MPP: '#42275a',
	MSE: '#636363',
	MTD: '#141e30',
	MUS: '#544a7d',
	NES: '#ddd6f3',
	NEU: '#2980b9',
	ORF: '#de6262',
	PAW: '#ff5f6d',
	PER: '#c31432',
	PHI: '#7f7fd5',
	PHY: '#e52d27',
	PLS: '#c0392b',
	POL: '#3c556e',
	POP: '#ff512f',
	POR: '#1d976c',
	PSY: '#ff5f6d',
	QCB: '#1f4037',
	REL: '#00b4db',
	RES: '#8e44ad',
	RUS: '#c0392b',
	SAN: '#704216',
	SAS: '#b92b27',
	SLA: '#c0392b',
	SML: '#723488',
	SOC: '#3498db',
	SPA: '#fc4a1a',
	SPI: '#667eea',
	STC: '#f7971e',
	SWA: '#e53935',
	THR: '#c2e59c',
	TPP: '#f09819',
	TRA: '#654ea3',
	TUR: '#009245',
	TWI: '#45b649',
	URB: '#2f6479',
	URD: '#0575e6',
	VIS: '#005c97',
	WRI: '#1e9600',
	WWS: '#667eea',
};

function lightenColor(hex: string): string {
	let color = hex.startsWith('#') ? hex.slice(1) : hex;

	if (color.length === 3) {
		color = color
			.split('')
			.map((ch) => ch + ch)
			.join('');
	}

	const r = parseInt(color.substring(0, 2), 16);
	const g = parseInt(color.substring(2, 4), 16);
	const b = parseInt(color.substring(4, 6), 16);

	const lighten = (channel: number) => Math.round(channel + (255 - channel) * 0.25);
	const rLight = lighten(r);
	const gLight = lighten(g);
	const bLight = lighten(b);

	const toHex = (num: number) => num.toString(16).padStart(2, '0');

	return `#${toHex(rLight)}${toHex(gLight)}${toHex(bLight)}`;
}

export const getDepartmentGradient = (departmentCode: string, angle: number) => {
	const color = departmentColors[departmentCode];
	if (!color) {
		return 'linear-gradient(135deg, #000000, #FFFFFF)';
	}
	const colors = [color, lightenColor(color)];
	return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`;
};

export function getPrimaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the first color
	const colors = gradient.split(',');
	const firstColor = colors[1]?.trim();

	return firstColor;
}

export function getSecondaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the second color
	const colors = gradient.split(',');
	const secondColor = colors[2]?.trim().split(')')[0];

	return secondColor;
}
