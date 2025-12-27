import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, CheckSquare, Square } from 'lucide-react';

interface AuthorFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    authors: string[];
    initialSelected: string[];
    onConfirm: (selected: string[]) => void;
}

export const AuthorFilterModal: React.FC<AuthorFilterModalProps> = ({ 
    isOpen, 
    onClose, 
    authors, 
    initialSelected, 
    onConfirm 
}) => {
    const [tempSelected, setTempSelected] = useState<string[]>([]);
    const [filterText, setFilterText] = useState('');
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setTempSelected([...initialSelected]);
            setFilterText('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, initialSelected]);

    const filteredAuthors = useMemo(() => {
        if (!filterText) return authors;
        return authors.filter(a => a.toLowerCase().includes(filterText.toLowerCase()));
    }, [authors, filterText]);

    // Jump Bar Logic
    const baseLetters = ['A', 'F', 'K', 'P', 'U', 'Z'];

    const toggleAuthor = (author: string) => {
        setTempSelected(prev => {
            if (prev.includes(author)) return prev.filter(a => a !== author);
            return [...prev, author];
        });
    };

    const handleJumpTo = (e: React.MouseEvent, letter: string) => {
        e.stopPropagation(); 
        if (!listRef.current) return;
        const index = filteredAuthors.findIndex(auth => auth.toUpperCase().localeCompare(letter) >= 0);
        if (index !== -1 && listRef.current.children[index]) {
            listRef.current.children[index].scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    };

    const handleConfirm = () => {
        onConfirm(tempSelected);
        onClose();
    };

    const handleGlobalClear = () => {
        setFilterText('');
        setTempSelected([]);
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    // Show X if there is filter text OR there are selections
    const showClearButton = filterText.length > 0 || tempSelected.length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3 shadow-md">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">Filtra Autori</h2>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        className="w-full bg-slate-800 rounded-lg pl-10 pr-10 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                        placeholder="Cerca autore..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    {showClearButton && (
                        <button onClick={handleGlobalClear} className="absolute right-2 top-2 text-slate-500 hover:text-white p-1" title="Pulisci ricerca e selezione">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area with List and JumpBar */}
            <div className="flex-1 flex overflow-hidden relative">
                <ul ref={listRef} className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                    {filteredAuthors.length === 0 ? (
                        <li className="py-10 text-center text-slate-500 italic">Nessun autore trovato</li>
                    ) : (
                        filteredAuthors.map((author) => {
                            const isSelected = tempSelected.includes(author);
                            return (
                                <li 
                                    key={author} 
                                    onClick={() => toggleAuthor(author)}
                                    className={`
                                        py-3 border-b border-slate-800/50 flex items-center gap-3 cursor-pointer select-none active:bg-slate-800/40
                                    `}
                                >
                                    <div className={`w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors ${isSelected ? 'text-emerald-500' : 'text-slate-600'}`}>
                                        {isSelected ? <CheckSquare className="w-5 h-5 fill-emerald-500/10" /> : <Square className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-sm truncate ${isSelected ? 'text-emerald-100 font-medium' : 'text-slate-300'}`}>
                                        {author}
                                    </span>
                                </li>
                            );
                        })
                    )}
                    {/* Padding bottom per non coprire l'ultimo elemento con il footer */}
                    <div className="h-20" /> 
                </ul>

                {/* Jump Bar (Visible only when not searching) */}
                {!filterText && (
                    <div className="w-8 bg-slate-900/50 border-l border-slate-800 flex flex-col justify-center items-center py-4 gap-1 z-10">
                        {baseLetters.map((letter) => (
                            <button
                                key={letter}
                                onClick={(e) => handleJumpTo(e, letter)}
                                className="w-full flex-1 flex items-center justify-center text-[10px] font-bold text-slate-500 hover:text-emerald-400 active:text-white"
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions (Modified: Removed Reset Button) */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
                <button 
                    onClick={handleConfirm}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all py-3"
                >
                    <Check className="w-5 h-5" />
                    Applica {tempSelected.length > 0 && `(${tempSelected.length})`}
                </button>
            </div>
        </div>
    );
};