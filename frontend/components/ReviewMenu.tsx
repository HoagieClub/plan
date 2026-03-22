import { useEffect, useState, type FC } from 'react';

import ChatIcon from '@mui/icons-material/Chat';
import { CircularProgress, Rating } from '@mui/material';

interface ReviewMenuProps {
	dept: string;
	coursenum: string;
}

export const ReviewMenu: FC<ReviewMenuProps> = ({ dept, coursenum }) => {
	const [reviews, setReviews] = useState<string[]>([]);
	const [rating, setRating] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(true);
	const [summary, setSummary] = useState<string>('');

	useEffect(() => {
		if (dept && coursenum) {
			const fetchReviews = async () => {
				try {
					setLoading(true);

					const params = new URLSearchParams({ dept, coursenum });
					const response = await fetch(`/api/hoagie/course/comments/?${params}`);

					const data = await response.json();
					if (data?.reviews) {
						setReviews(data.reviews);
					}
					if (data?.rating) {
						setRating(data.rating);
					}
					if (data?.summary) {
						setSummary(data.summary);
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
				width: '475px',
				margin: '0 auto',
			}}
		>
			<table style={{ width: '100%' }}>
				<tbody>
					<tr>
						<td style={{ whiteSpace: 'nowrap' }}>
							<strong
								style={{
									color: 'gray',
									display: 'inline-flex',
									alignItems: 'center',
									fontWeight: 500,
									fontSize: '0.9rem',
									marginTop: '8px',
									marginBottom: '3px',
									gap: '6px',
								}}
							>
								<ChatIcon fontSize='small' />
								Student Feedback
							</strong>
						</td>
						<td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
							<div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
								{rating.toFixed(2)}
								<Rating name='course rating' value={rating} precision={0.1} readOnly />
							</div>
						</td>
					</tr>
				</tbody>
			</table>
			{summary && (
				<>
					<div
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '4px',
							margin: '8px 0 4px',
						}}
					>
						<span style={{ color: '#663399', fontSize: '0.9rem' }}>✦</span>
						<strong style={{ color: '#663399', fontSize: '0.85rem' }}>AI Summary</strong>
					</div>
					<div
						style={{
							border: '2px solid #663399',
							borderRadius: '6px',
							padding: '10px 12px',
							fontSize: '0.85rem',
							fontStyle: 'italic',
							color: '#663399',
							marginBottom: '10px',
							overflowY: 'auto',
							maxHeight: '150px',
						}}
					>
						{summary}
					</div>
				</>
			)}
			<div
				style={{
					height: '400px',
					overflowY: 'auto',
					border: '1px solid rgba(205,215,225,255)',
					padding: '10px',
					marginTop: '10px',
					borderRadius: '5px',
					backgroundColor: '#f5f5f5',
				}}
			>
				{reviews.map((review, index) => (
					<div
						key={index}
						style={{
							borderBottom: '1px solid rgba(0, 0, 0, 1)',
							paddingBottom: '5px',
							paddingTop: '5px',
						}}
					>
						<div
							style={{
								color: 'black',
								fontSize: '0.85rem',
							}}
						>
							{review}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
