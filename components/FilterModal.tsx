import React from 'react';
import { X, Check } from 'lucide-react';
import { FilterOption } from '../types';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: FilterOption[];
    onToggleFilter: (filter: FilterOption) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, currentFilters, onToggleFilter }) => {
    if (!isOpen) return null;

    const options: { value: FilterOption; label: string }[] = [
        { value: 'ALL', label: 'Tutte' },
        { value: 'READ', label: 'Letti' },
        { value: 'TO_READ', label: 'Da leggere' },
        { value: 'RATED', label: 'Valutati' },
        { value: 'EBOOK', label: 'Ebook' },
        { value: 'PAPERBACK', label: 'Cartacei' },
        { value: 'PREGIATA', label: 'Edizioni Particolari' },
        { value: 'LOANED', label: 'Prestati' },
        { value: 'MANUAL', label: 'Aggiunti Manualmente' },
        { value: 'NOTES', label: 'Note scritte' }
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50 shrink-0">
                    <h3 className="text-lg font-bold text-white">Filtra per</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-2 flex flex-col gap-1 overflow-y-auto">
                    {options.map(option => {
                        const isSelected = currentFilters.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => onToggleFilter(option.value)}
                                className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${
                                    isSelected 
                                        ? 'bg-indigo-600/20 text-indigo-400 font-bold' 
                                        : 'text-slate-300 hover:bg-slate-800/50'
                                }`}
                            >
                                <span>{option.label}</span>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-800 shrink-0">
                    <button onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
                        Applica Filtri
                    </button>
                </div>
            </div>
        </div>
    );
};
