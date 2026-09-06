import React from 'react';
import clsx from 'clsx';

interface VoiceWaveformProps {
  state: 'idle' | 'listening' | 'speaking';
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ state }) => {
  const bars = [1, 2, 3, 4, 5];
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex items-center gap-2 h-16">
        {bars.map((bar) => (
          <div
            key={bar}
            className={clsx(
              "w-2 rounded-full transition-all duration-300",
              state === 'idle' ? "bg-gray-300 h-2" : "bg-hyundai-blue",
              state === 'listening' ? "animate-pulse h-8" : "",
              state === 'speaking' ? "animate-wave" : ""
            )}
            style={{
              animationDelay: state === 'speaking' ? `${bar * 0.15}s` : '0s'
            }}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
        {state === 'idle' ? 'Paused' : state === 'listening' ? 'Listening...' : 'AI Speaking...'}
      </p>
    </div>
  );
};
