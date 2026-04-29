import { useEffect, useRef, useState, type FC } from 'react';

import { CircularProgress } from '@mui/material';

import { AISummary } from '@/components/ui/AISummary';

interface ReviewMenuProps {
	dept: string;
	coursenum: string;
	term_code?: string;
	onRatingLoaded?: (rating: number) => void;
	onSummaryLoaded?: (summary: string) => void;
}

export const ReviewMenu: FC<ReviewMenuProps> = ({
	dept,
	coursenum,
	term_code,
	onRatingLoaded,
	onSummaryLoaded,
}) => {
	const [reviews, setReviews] = useState<string[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [summary, setSummary] = useState<string>('');

	// Keep latest callbacks in refs — stable identity, never stale
	const onRatingLoadedRef = useRef(onRatingLoaded);
	const onSummaryLoadedRef = useRef(onSummaryLoaded);
	useEffect(() => {
		onRatingLoadedRef.current = onRatingLoaded;
	}, [onRatingLoaded]);
	useEffect(() => {
		onSummaryLoadedRef.current = onSummaryLoaded;
	}, [onSummaryLoaded]);

	useEffect(() => {
		if (!dept || !coursenum) {
			return;
		}

		const controller = new AbortController();

		const fetchReviews = async () => {
			try {
				setLoading(true);
				const params = new URLSearchParams({ dept, coursenum });
				if (term_code) {
					params.append('term_code', term_code);
				}

				const response = await fetch(`/api/hoagie/course/comments?${params}`, {
					signal: controller.signal,
				});
				const data = await response.json();

				if (data?.reviews) {
					setReviews(data.reviews);
				}
				if (data?.rating) {
					onRatingLoadedRef.current?.(data.rating);
				}
				if (data?.summary) {
					setSummary(data.summary);
					onSummaryLoadedRef.current?.(data.summary);
				}
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error('Error fetching course reviews:', err);
					setReviews([]);
				}
			} finally {
				// Only clear loading if this effect instance wasn't cancelled
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		};

		void fetchReviews();
		return () => controller.abort();

		// Callbacks intentionally excluded — accessed via stable refs above
	}, [dept, coursenum, term_code]);

	if (loading) {
		return (
			<div
				style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}
			>
				<CircularProgress size={24} sx={{ color: '#9e9e9e' }} />
			</div>
		);
	}

	if (reviews.length === 0) {
		return <div style={{ fontSize: '0.85rem', color: '#999' }}>No reviews yet.</div>;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
			<AISummary summary={summary} />
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
