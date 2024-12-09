import Skeleton from '@mui/joy/Skeleton';
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';

const theme = extendTheme({
  components: {
    JoySkeleton: {
      styleOverrides: {
        root: {
          // Increase specificity here
          '&&': {
            backgroundColor: '#f6f6f6', // Correct property for background color
            animation: 'none', // Disable the wave animation
          },
        },
      },
    },
  },
});

function SkeletonApp() {
  return (
    <CssVarsProvider theme={theme}>
      <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
        {/* Body container */}
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          {/* Left sidebar with search bar */}
          <div style={{ width: '25%', marginRight: '12px', marginLeft: '12px' }}>
            <Skeleton variant='rectangular' height='100px' sx={{ mt: '10px', bgcolor: 'red' }} />
            <Skeleton
              variant='rectangular'
              height='calc(100vh - 120px)'
              sx={{ mt: '2px', bgcolor: 'red' }}
            />
          </div>

          {/* Middle 2x4 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridAutoRows: '1fr',
              gap: '25px',
              width: '40%',
              height: 'full',
              marginTop: '10px',
              marginLeft: '10px',
            }}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} variant='rectangular' sx={{ bgcolor: 'red' }} />
            ))}
          </div>

          {/* Right large vertical space */}
          <div style={{ width: '25%', marginRight: '12px', marginLeft: '22px' }}>
            <Skeleton
              variant='rectangular'
              height='calc(100vh - 20px)'
              sx={{
                mt: '10px',
                bgcolor: 'red',
                backgroundColor: '#f6f6f6',
                animation: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </CssVarsProvider>
  );
}

export default SkeletonApp;
