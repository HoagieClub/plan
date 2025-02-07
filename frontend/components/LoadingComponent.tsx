function LoadingComponent() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      {/* <span style={{ fontStyle: 'italic' }}>Loading...</span>*/}
      <span className='loading loading-ring loading-lg' />
    </div>
  );
}

export default LoadingComponent;
