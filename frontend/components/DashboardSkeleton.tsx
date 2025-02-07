import Skeleton from '@mui/joy/Skeleton';

export default function DashboardSkeleton() {
  const skeletonStyle = {
    backgroundColor: '#f6f6f6',
    animation: 'none',
    borderRadius: '0.5rem', // Rounded corners
  };

  return (
    <div className='flex h-screen w-screen'>
      <div className='flex h-full w-full'>
        {/* Left sidebar with search bar */}
        <div className='w-29% mx-3 flex flex-col'>
          <Skeleton variant='rectangular' height='98px' sx={{ mt: '10px', ...skeletonStyle }} />
          <Skeleton
            variant='rectangular'
            height='calc(100vh - 110px)'
            sx={{ mt: '2px', ...skeletonStyle }}
          />
        </div>

        {/* Middle 2x4 grid */}
        <div className='auto-rows-minmax[155px_auto] w-53% ml-2.5 mt-2.5 grid grid-cols-2 gap-6'>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} variant='rectangular' height='155px' sx={skeletonStyle} />
          ))}
        </div>

        {/* Right large vertical space */}
        <div className='w-28% mx-3 mt-2.5'>
          <Skeleton
            variant='rectangular'
            height='calc(100vh - 13px)'
            sx={{ mt: '2px', ...skeletonStyle }}
          />
        </div>
      </div>
    </div>
  );
}
