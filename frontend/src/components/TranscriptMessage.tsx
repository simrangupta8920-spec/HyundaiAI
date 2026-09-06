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
    <div className={clsx("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[80%] items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", isUser ? "bg-hyundai-blue text-white" : "bg-gray-200 text-gray-700")}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
        <div className={clsx(
          "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
          isUser ? "bg-hyundai-blue text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
};
