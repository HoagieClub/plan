import { useEffect, useState, type FC } from 'react';

import { CircularProgress } from '@mui/material';

interface ReviewMenuProps {
	dept: string;
	coursenum: string;
	onRatingLoaded?: (rating: number) => void;
}

export const ReviewMenu: FC<ReviewMenuProps> = ({ dept, coursenum, onRatingLoaded }) => {
	const [reviews, setReviews] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [summary, setSummary] = useState<string>('');

	useEffect(() => {
		if (dept && coursenum) {
			const fetchReviews = async () => {
				try {
					setLoading(true);

					const params = new URLSearchParams({ dept, coursenum });
					const response = await fetch(`/api/hoagie/course/comments?${params}`);

					const data = await response.json();
					if (data?.reviews) {
						setReviews(data.reviews);
					}
					if (data && data.rating) {
						onRatingLoaded?.(data.rating);
					}
					if (data?.summary) {
						setSummary(data.summary);
					}
					if (data?.summary) {
						setSummary(data.summary);
					}
				} catch (err) {
					console.error('Error fetching course reviews:', err);
					setReviews([]);
				} finally {
					setLoading(false);
				}
			};

			void fetchReviews();
		}
	}, [dept, coursenum]);

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
				<CircularProgress size={24} sx={{ color: '#9e9e9e' }} />
			</div>
		);
	}

	if (reviews.length === 0) {
		return <div style={{ fontSize: '0.85rem', color: '#999' }}>No reviews yet.</div>;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
			{reviews.map((review, index) => (
				<div
					key={index}
					style={{
						fontSize: '0.85rem',
						paddingBottom: index !== reviews.length - 1 ? '12px' : '0px',
						marginBottom: index !== reviews.length - 1 ? '12px' : '0px',
						borderBottom: index !== reviews.length - 1 ? '1px solid #ccc' : 'none',
					}}
				>
					{review}
				</div>
			))}
		</div>
	);
};
