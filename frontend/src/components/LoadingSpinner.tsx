import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-hyundai-blue rounded-full animate-spin"></div>
      {text && <p className="mt-3 text-sm font-medium text-gray-500">{text}</p>}
    </div>
  );
};
