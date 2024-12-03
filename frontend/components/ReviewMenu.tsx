import type { FC } from 'react';
import { useState, useEffect } from 'react';

import { Rating } from '@mui/material';

interface ReviewMenuProps {
  dept: string;
  coursenum: string;
}

const ReviewMenu: FC<ReviewMenuProps> = ({ dept, coursenum }) => {
  const [reviews, setReviews] = useState<string[]>([]);
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    if (dept && coursenum) {
      const url = new URL(`${process.env.BACKEND}/course/comments/`);
      url.searchParams.append('dept', dept);
      url.searchParams.append('coursenum', coursenum);

      fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data && data.reviews) {
            setReviews(data.reviews);
          }
          if (data && data.rating) {
            setRating(data.rating);
          }
        });
    }
  }, [dept, coursenum]);

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

export default ReviewMenu;
