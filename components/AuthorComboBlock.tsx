import React from 'react';
import { Users, BookHeart, X } from 'lucide-react';

interface AuthorComboBlockProps {
  selectedAuthors: string[];
  openModal: () => void;
  resetAuthors: () => void;
  showOnlyUserData: boolean;
  toggleShowOnlyUserData: () => void;
  uiOpacity: number;
}

export const AuthorComboBlock: React.FC<AuthorComboBlockProps> = ({ 
  selectedAuthors, 
  openModal,
  resetAuthors,
  showOnlyUserData,
  toggleShowOnlyUserData,
  uiOpacity
}) => {

  const isActive = selectedAuthors.length > 0;
  const count = selectedAuthors.length;

  return (
    <div 
        className="h-[8%] w-full px-4 py-2 flex items-center justify-between relative z-30 transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
        {/* BUTTON CONTAINER */}
        <div className="flex gap-4 items-center">
            
            {/* AUTHOR FILTER BUTTON (Compact) */}
            <div className="relative">
                <button
                    onClick={openModal}
                    className={`
                        w-11 h-11 flex items-center justify-center rounded-lg shadow-md transition-all active:scale-95 border
                        ${isActive 
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/40' 
                            : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'}
                    `}
                    title="Filtra per Autore"
                >
                    <Users className="w-5 h-5" />
                    
                    {/* Badge Count */}
                    {isActive && (
                        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white text-emerald-700 text-[10px] font-bold rounded-full border border-slate-900 shadow-sm">
                            {count}
                        </div>
                    )}
                </button>
            </div>

            {/* RESET BUTTON (Visible only if filter active) */}
            {isActive && (
                <button
                    onClick={resetAuthors}
                    className="w-11 h-11 flex items-center justify-center rounded-lg shadow-md transition-all active:scale-95 bg-slate-800/60 text-slate-400 hover:text-red-400 border border-slate-700/50 animate-in fade-in zoom-in duration-200"
                    title="Rimuovi filtri autore"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* USER DATA FILTER TOGGLE */}
        <button
            onClick={toggleShowOnlyUserData}
            className={`
                w-11 h-11 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center border
                ${showOnlyUserData 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/30' 
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-indigo-300'}
            `}
            title="Mostra solo i miei dati"
        >
            <BookHeart className={`w-5 h-5 ${showOnlyUserData ? 'fill-white/20' : ''}`} />
        </button>
    </div>
  );
};