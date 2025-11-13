import { useEffect, useState, type FC } from 'react';

import { CircularProgress, Rating } from '@mui/material';

interface ReviewMenuProps {
	dept: string;
	coursenum: string;
}

export const ReviewMenu: FC<ReviewMenuProps> = ({ dept, coursenum }) => {
	const [reviews, setReviews] = useState<string[]>([]);
	const [rating, setRating] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (dept && coursenum) {
			const fetchReviews = async () => {
				try {
					setLoading(true);

					const params = new URLSearchParams({ dept, coursenum });
					const response = await fetch(`/api/hoagie/course/comments/?${params}`);

					const data = await response.json();
					if (data && data.reviews) {
						setReviews(data.reviews);
					}
					if (data && data.rating) {
						setRating(data.rating);
					}
				} catch (err) {
					console.error('Error fetching course reviews:', err);
					// TODO: What should we do if error?
					setReviews([]);
					setRating(0);
				} finally {
					setLoading(false);
				}
			};

			void fetchReviews();
		}
	}, [dept, coursenum]);

	if (loading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
				<CircularProgress size={35} />
			</div>
		);
	}

	return (
		<div
			style={{
				width: '450px',
				margin: '0 auto',
				border: '1px solid rgba(205,215,225,255)',
				padding: '20px',
				borderRadius: '5px',
			}}
		>
			<table>
				<tbody>
					<tr>
						<td>
							<strong style={{ color: '#333', display: 'block' }}>Course Reviews</strong>
						</td>
						<td width='120px' />
						<td>{rating}</td>
						<td>
							{' '}
							<Rating name='course rating' value={rating} precision={0.1} readOnly />{' '}
						</td>
					</tr>
				</tbody>
			</table>

			<div
				style={{
					height: '400px',
					overflowY: 'auto',
					border: '1px solid rgba(205,215,225,255)',
					padding: '10px',
					marginTop: '10px',
					borderRadius: '5px',
				}}
			>
				{reviews.map((review, index) => (
					<div
						key={index}
						style={{
							marginBottom: '10px',
							borderBottom: '1px solid rgba(0, 0, 0, 1)',
							paddingBottom: '10px',
						}}
					>
						<div style={{ color: 'black' }}>{review}</div>
					</div>
				))}
			</div>
		</div>
	);
};
