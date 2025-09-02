// Color stops in the rating gradient (found using color picker)
const COLOR_STOPS = [
	{ rating: 0, color: '#dddddd' },
	{ rating: 2.0, color: '#d95450' },
	{ rating: 2.5, color: '#ef8f00' },
	{ rating: 3.0, color: '#ef8f00' },
	{ rating: 3.5, color: '#c4ce37' },
	{ rating: 4.0, color: '#8bc44c' },
	{ rating: 4.5, color: '#4dae50' },
	{ rating: 5.0, color: '#2f7f32' }
];

// Helper functions for RGB extraction from hex colors
function getRed(hexColor: string): number {
	return parseInt(hexColor.slice(1, 3), 16);
}

function getGreen(hexColor: string): number {
	return parseInt(hexColor.slice(3, 5), 16);
}

function getBlue(hexColor: string): number {
	return parseInt(hexColor.slice(5, 7), 16);
}

// Helper function to convert RGB values to hex color string
function rgbToHex(r: number, g: number, b: number): string {
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to interpolate rgb colors
function interpolateRgb(color1: number, color2: number, ratio: number): number {
	return Math.round(color1 + (color2 - color1) * ratio);
}

export function getRatingColor(rating: number): string {
	// Clamp rating between 0 and 5
	const clampedRating = Math.max(0, Math.min(5, rating));
	
	// Find the two color stops to interpolate between
	let lowerStop = COLOR_STOPS[0];
	let upperStop = COLOR_STOPS[COLOR_STOPS.length - 1];
	
	
	for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
		if (clampedRating >= COLOR_STOPS[i].rating && clampedRating <= COLOR_STOPS[i + 1].rating) {
			lowerStop = COLOR_STOPS[i];
			upperStop = COLOR_STOPS[i + 1];
			break;
		}
	}
	
	// If rating is exactly at a stop point, return that color
	if (clampedRating === lowerStop.rating) {
		return lowerStop.color;
	}
	if (clampedRating === upperStop.rating) {
		return upperStop.color;
	}
	
	// Interpolate between the two colors
	const ratio = (clampedRating - lowerStop.rating) / (upperStop.rating - lowerStop.rating);
	return interpolateColor(lowerStop.color, upperStop.color, ratio);
}

function interpolateColor(color1: string, color2: string, ratio: number): string {
	// Convert hex colors to RGB using helper functions
	const r1 = getRed(color1);
	const g1 = getGreen(color1);
	const b1 = getBlue(color1);
	
	const r2 = getRed(color2);
	const g2 = getGreen(color2);
	const b2 = getBlue(color2);
	
	// Interpolate each component
	const r = interpolateRgb(r1, r2, ratio);
	const g = interpolateRgb(g1, g2, ratio);
	const b = interpolateRgb(b1, b2, ratio);

	// Convert back to hex using helper function
	return rgbToHex(r, g, b);
}

export function getRatingBackground(rating: number): string {
	const color = getRatingColor(rating);
	return `linear-gradient(135deg, ${color}, ${color}dd)`;
}
