import React, { useState, useEffect } from 'react';
import { Edit, User, Type, X, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Book } from '../types';

interface EditManualBookModalProps {
    isOpen: boolean;
    book: Book | null;
    onClose: () => void;
    onConfirm: (oldBook: Book, author: string, title: string) => void;
    onDelete: (book: Book) => void;
}

export const EditManualBookModal: React.FC<EditManualBookModalProps> = ({ isOpen, book, onClose, onConfirm, onDelete }) => {
    const [author, setAuthor] = useState('');
    const [title, setTitle] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    useEffect(() => {
        if (isOpen && book) {
            setAuthor(book.author);
            setTitle(book.title);
            setIsConfirmingDelete(false);
        }
    }, [isOpen, book]);

    if (!isOpen || !book) return null;

    const handleConfirm = () => {
        if (!author.trim() || !title.trim()) return;
        onConfirm(book, author.trim(), title.trim());
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2 text-sky-400">
                        <Edit className="w-5 h-5" />
                        <span className="font-bold">Modifica Libro Manuale</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col gap-3">
                    {isConfirmingDelete ? (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex flex-col items-center text-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                            <div>
                                <p className="text-slate-200 font-bold text-sm">Eliminare definitivamente?</p>
                                <p className="text-slate-400 text-xs mt-1">Questa operazione rimuoverà il libro e tutte le note associate. Non può essere annullata.</p>
                            </div>
                            <div className="flex gap-2 w-full mt-2">
                                <button 
                                    onClick={() => setIsConfirmingDelete(false)}
                                    className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button 
                                    onClick={() => onDelete(book)}
                                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                                >
                                    Sì, Elimina
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Autore
                                </label>
                                <input 
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm focus:border-sky-500 focus:outline-none placeholder-slate-600 uppercase"
                                    placeholder="COGNOME NOME"
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
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm focus:border-sky-500 focus:outline-none placeholder-slate-600 uppercase"
                                    placeholder="TITOLO DEL LIBRO"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!isConfirmingDelete && (
                    <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center gap-3">
                        <button 
                            onClick={() => setIsConfirmingDelete(true)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                            title="Elimina libro"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-slate-400 text-sm font-medium hover:text-white transition-colors"
                            >
                                Annulla
                            </button>
                            <button 
                                onClick={handleConfirm}
                                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!author.trim() || !title.trim() || (author.trim().toUpperCase() === book.author.toUpperCase() && title.trim().toUpperCase() === book.title.toUpperCase())}
                            >
                                <Check className="w-4 h-4" />
                                Salva
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
