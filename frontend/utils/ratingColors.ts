/**
 * Utility functions for generating rating-based color gradients
 */

export function getRatingColor(rating: number): string {
	// Clamp rating between 0 and 5
	const clampedRating = Math.max(0, Math.min(5, rating));
	
	// Define color stops for the gradient
	const colorStops = [
		{ rating: 0, color: '#dddddd' },
		{ rating: 2.0, color: '#d95450' },
		{ rating: 2.5, color: '#ef8f00' },
		{ rating: 3.0, color: '#ef8f00' },
		{ rating: 3.5, color: '#c4ce37' },
		{ rating: 4.0, color: '#8bc44c' },
		{ rating: 4.5, color: '#4dae50' },
		{ rating: 5.0, color: '#2f7f32' }
	];
	
	// Find the two color stops to interpolate between
	let lowerStop = colorStops[0];
	let upperStop = colorStops[colorStops.length - 1];
	
	for (let i = 0; i < colorStops.length - 1; i++) {
		if (clampedRating >= colorStops[i].rating && clampedRating <= colorStops[i + 1].rating) {
			lowerStop = colorStops[i];
			upperStop = colorStops[i + 1];
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
	// Convert hex colors to RGB
	const r1 = parseInt(color1.slice(1, 3), 16);
	const g1 = parseInt(color1.slice(3, 5), 16);
	const b1 = parseInt(color1.slice(5, 7), 16);
	
	const r2 = parseInt(color2.slice(1, 3), 16);
	const g2 = parseInt(color2.slice(3, 5), 16);
	const b2 = parseInt(color2.slice(5, 7), 16);
	
	// Interpolate each component
	const r = Math.round(r1 + (r2 - r1) * ratio);
	const g = Math.round(g1 + (g2 - g1) * ratio);
	const b = Math.round(b1 + (b2 - b1) * ratio);
	
	// Convert back to hex
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getRatingBackground(rating: number): string {
	const color = getRatingColor(rating);
	return `linear-gradient(135deg, ${color}, ${color}dd)`;
}
