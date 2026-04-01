import React, { useState, useEffect } from 'react';
import { BookPlus, User, Type, X, Check, Bookmark, CheckCircle2, Book, Globe } from 'lucide-react';
import { BookStatus } from '../types';

interface AddBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (author: string, title: string, status: BookStatus | null, cartaceo: boolean) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [author, setAuthor] = useState('');
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<BookStatus | null>(null);
    const [cartaceo, setCartaceo] = useState(false);

    // Reset fields on open
    useEffect(() => {
        if (isOpen) {
            setAuthor('');
            setTitle('');
            setStatus(null);
            setCartaceo(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!author.trim() || !title.trim()) {
            alert("Inserisci Autore e Titolo");
            return;
        }
        onConfirm(author.trim(), title.trim(), status, cartaceo);
        onClose();
    };

    const handleWebSearch = () => {
        const query = title.trim() || author.trim();
        if (!query) {
            alert("Inserisci almeno il titolo o l'autore per cercare.");
            return;
        }
        window.open(`https://www.google.com/search?q=libro+${encodeURIComponent(query)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <BookPlus className="w-5 h-5" />
                        <span className="font-bold">Aggiungi Libro Manuale</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleWebSearch} 
                            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-sky-400 transition-colors"
                            title="Cerca sul web"
                        >
                            <Globe className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-4 flex flex-col gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> Autore
                        </label>
                        <input 
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none placeholder-slate-600 uppercase"
                            placeholder="COGNOME NOME"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                            <Type className="w-3 h-3" /> Titolo
                        </label>
                        <input 
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none placeholder-slate-600 uppercase"
                            placeholder="TITOLO DEL LIBRO"
                        />
                    </div>

                    <div className="pt-1">
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setStatus(status === 'READ' ? null : 'READ')}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-colors
                                    ${status === 'READ' 
                                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
                                `}
                             >
                                 <CheckCircle2 className="w-4 h-4" />
                                 LETTO
                             </button>

                             <button 
                                onClick={() => setStatus(status === 'TO_READ' ? null : 'TO_READ')}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-colors
                                    ${status === 'TO_READ' 
                                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
                                `}
                             >
                                 <Bookmark className="w-4 h-4" />
                                 DA LEGGERE
                             </button>

                             <button 
                                onClick={() => setCartaceo(!cartaceo)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-colors
                                    ${cartaceo 
                                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
                                `}
                             >
                                 <Book className="w-4 h-4" />
                                 CARTACEO
                             </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                     <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-400 text-sm font-medium hover:text-white transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!author.trim() || !title.trim()}
                    >
                        <Check className="w-4 h-4" />
                        Salva
                    </button>
                </div>
            </div>
        </div>
    );
};