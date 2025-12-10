import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export type NodeWrapperProps = {
  children?: React.ReactNode;
  selected?: boolean;
  title?: string;
  width?: string;
  className?: string;
  headerClassName?: string;
};

export const NodeWrapper = ({ children, selected, title, width = "w-[340px]", className = "", headerClassName = "" }: NodeWrapperProps) => (
  <div className={`relative group rounded-xl bg-surface border-2 transition-all duration-200 ${width} shadow-lg ${selected ? 'border-accent shadow-accent/20' : 'border-border hover:border-zinc-600'} ${className}`}>
    {title && (
      <div className={`px-4 py-2 border-b border-border bg-zinc-900/50 rounded-t-xl flex items-center justify-between ${headerClassName}`}>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        <MoreHorizontal className="w-4 h-4 text-zinc-600" />
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);