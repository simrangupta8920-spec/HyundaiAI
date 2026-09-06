import React from 'react';
import { Lead } from '../types';
import clsx from 'clsx';

interface LeadStatusBadgeProps {
  status: Lead['status'];
}

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status }) => {
  const getStatusClass = (s: string) => {
    switch (s) {
      case 'new': return 'badge-new';
      case 'warm': return 'badge-warm';
      case 'hot': return 'badge-hot';
      case 'converted': return 'badge-converted';
      case 'lost': return 'bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full';
      default: return 'bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full';
    }
  };

  return (
    <span className={clsx(getStatusClass(status), "uppercase tracking-wide")}>
      {status}
    </span>
  );
};
