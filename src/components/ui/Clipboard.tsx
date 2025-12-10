import React from 'react';
import { ClipboardItem } from '../../types';
import { X, GripVertical } from 'lucide-react';

interface ClipboardProps {
  items: ClipboardItem[];
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: ClipboardItem) => void;
}

export const Clipboard: React.FC<ClipboardProps> = ({ items, onRemove, onDragStart }) => {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 border border-zinc-700 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex gap-3 overflow-x-auto max-w-[90vw] animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex items-center text-xs font-bold text-zinc-500 writing-vertical-lr rotate-180 px-1 border-l border-zinc-700/50">
            CLIPBOARD
        </div>
        {items.map(item => (
            <div 
                key={item.id} 
                className="relative group w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-zinc-700 hover:border-accent hover:shadow-lg transition-all cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
            >
                <img src={item.imageUrl} alt="Clipboard" className="w-full h-full object-cover" />
                <button 
                    onClick={() => onRemove(item.id)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        ))}
    </div>
  );
};