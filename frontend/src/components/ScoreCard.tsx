import React from 'react';
import { Score } from '../types';
import clsx from 'clsx';

interface ScoreCardProps {
  score: Score;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ score }) => {
  const getColorClass = (value: number) => {
    if (value >= 75) return 'text-green-600 bg-green-100';
    if (value >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getProgressClass = (value: number) => {
    if (value >= 75) return 'bg-green-500';
    if (value >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ScoreBar = ({ label, value }: { label: string, value: number }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold">{value}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={clsx("h-2 rounded-full", getProgressClass(value))} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-100">
        <h3 className="text-lg font-bold">Lead Score</h3>
        <div className={clsx("px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2", getColorClass(score.overall_score))}>
          <span>Overall:</span>
          <span>{score.overall_score}</span>
        </div>
      </div>
      <div>
        <ScoreBar label="Intent" value={score.intent_score} />
        <ScoreBar label="Satisfaction" value={score.satisfaction_score} />
        <ScoreBar label="Engagement" value={score.engagement_score} />
      </div>
    </div>
  );
};
