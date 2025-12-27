import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { X, Save, FileText } from 'lucide-react';

interface NoteModalProps {
    isOpen: boolean;
    book: Book | null;
    initialNote: string;
    onClose: () => void;
    onSave: (note: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ isOpen, book, initialNote, onClose, onSave }) => {
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNoteText(initialNote || '');
        }
    }, [isOpen, initialNote]);

    if (!isOpen || !book) return null;

    const handleSave = () => {
        onSave(noteText);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col h-[60vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate">Note Personali</span>
                            <span className="text-[10px] text-slate-400 truncate">{book.title}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Editor */}
                <div className="flex-1 p-4 bg-slate-950/50">
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Scrivi qui le tue note..."
                        className="w-full h-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-sans leading-relaxed"
                        autoFocus
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                     <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-400 text-xs font-medium hover:text-white transition-colors"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-xs shadow-lg shadow-indigo-900/20"
                    >
                        <Save className="w-4 h-4" />
                        Salva Nota
                    </button>
                </div>
            </div>
        </div>
    );
};