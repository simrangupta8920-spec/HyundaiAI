import React from 'react';
import { Message } from '../types';
import clsx from 'clsx';
import { Bot, User } from 'lucide-react';

interface TranscriptMessageProps {
  message: Message;
}

export const TranscriptMessage: React.FC<TranscriptMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={clsx("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[85%] sm:max-w-[75%] items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs", isUser ? "bg-hyundai-blue text-white" : "bg-gray-200 text-gray-700")}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div className={clsx(
          "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm leading-relaxed",
          isUser ? "bg-hyundai-blue text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
};

