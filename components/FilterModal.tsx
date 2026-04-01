import React from 'react';
import { X, Check } from 'lucide-react';
import { FilterOption } from '../types';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilter: FilterOption;
    onSelectFilter: (filter: FilterOption) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, currentFilter, onSelectFilter }) => {
    if (!isOpen) return null;

    const options: { value: FilterOption; label: string }[] = [
        { value: 'ALL', label: 'Tutti' },
        { value: 'READ', label: 'Letti' },
        { value: 'RATED', label: 'Valutati' },
        { value: 'EBOOK', label: 'Ebook' },
        { value: 'PAPERBACK', label: 'Cartacei' },
        { value: 'LOANED', label: 'Prestati' },
        { value: 'MANUAL', label: 'Aggiunti Manualmente' }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="text-lg font-bold text-white">Filtra per</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-2 flex flex-col gap-1">
                    {options.map(option => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onSelectFilter(option.value);
                                onClose();
                            }}
                            className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${
                                currentFilter === option.value 
                                    ? 'bg-indigo-600/20 text-indigo-400 font-bold' 
                                    : 'text-slate-300 hover:bg-slate-800/50'
                            }`}
                        >
                            <span>{option.label}</span>
                            {currentFilter === option.value && <Check className="w-5 h-5" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
