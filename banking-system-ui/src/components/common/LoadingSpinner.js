import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const spinnerSizes = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div className="loading">
      <div 
        className="spinner" 
        style={{ 
          width: spinnerSizes[size], 
          height: spinnerSizes[size] 
        }}
      ></div>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;