import React, { useState, useEffect } from 'react';
import { Book, BookNoteEntry } from '../types';
import { X, Save, UserCheck, UserMinus, History, Calendar } from 'lucide-react';

interface LoanModalProps {
    isOpen: boolean;
    book: Book | null;
    currentEntry?: BookNoteEntry;
    onClose: () => void;
    onSaveLoan: (destinatario: string, data: string) => void;
    onReturnLoan: () => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, book, currentEntry, onClose, onSaveLoan, onReturnLoan }) => {
    const [destinatario, setDestinatario] = useState('');
    const [dataPrestito, setDataPrestito] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const isLoaned = !!currentEntry?.destinatarioPrestito;

    useEffect(() => {
        if (isOpen) {
            if (isLoaned) {
                setDestinatario(currentEntry.destinatarioPrestito || '');
                setDataPrestito(currentEntry.dataPrestito || new Date().toISOString().split('T')[0]);
            } else {
                setDestinatario('');
                setDataPrestito(new Date().toISOString().split('T')[0]);
            }
            setShowHistory(false);
        }
    }, [isOpen, isLoaned, currentEntry]);

    if (!isOpen || !book) return null;

    const handleSave = () => {
        if (!destinatario.trim()) {
            alert("Inserisci il nome del destinatario.");
            return;
        }
        onSaveLoan(destinatario.trim(), dataPrestito);
        onClose();
    };

    const handleReturn = () => {
        onReturnLoan();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {isLoaned ? <UserMinus className="w-5 h-5 text-orange-400 shrink-0" /> : <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate">Gestione Prestito</span>
                            <span className="text-[10px] text-slate-400 truncate">{book.title}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-4 bg-slate-950/50 overflow-y-auto">
                    {!isLoaned ? (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400 mb-2">A chi stai prestando questo libro?</p>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Destinatario</label>
                                <input 
                                    type="text" 
                                    value={destinatario}
                                    onChange={(e) => setDestinatario(e.target.value)}
                                    placeholder="Es. Mario Rossi"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Data Prestito</label>
                                <input 
                                    type="date" 
                                    value={dataPrestito}
                                    onChange={(e) => setDataPrestito(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-orange-950/30 border border-orange-900/50 rounded-lg p-4 text-center">
                                <p className="text-xs text-orange-400 mb-1">Libro attualmente in prestito a:</p>
                                <p className="text-lg font-bold text-white mb-2">{currentEntry.destinatarioPrestito}</p>
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Dal: {currentEntry.dataPrestito}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Storico Prestiti Toggle */}
                    {currentEntry?.storicoPrestiti && currentEntry.storicoPrestiti.length > 0 && (
                        <div className="mt-6">
                            <button 
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full p-2 bg-slate-800/30 rounded-lg border border-slate-800"
                            >
                                <History className="w-4 h-4" />
                                {showHistory ? 'Nascondi Storico' : 'Mostra Storico Prestiti'}
                            </button>
                            
                            {showHistory && (
                                <div className="mt-2 space-y-2">
                                    {currentEntry.storicoPrestiti.map((prestito, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded p-2 text-xs">
                                            <div className="font-bold text-slate-200">{prestito.destinatario}</div>
                                            <div className="text-slate-500 flex justify-between mt-1">
                                                <span>Dal: {prestito.dataInizio}</span>
                                                <span>Al: {prestito.dataFine}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                     <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-400 text-xs font-medium hover:text-white transition-colors"
                    >
                        Annulla
                    </button>
                    {!isLoaned ? (
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-xs shadow-lg shadow-emerald-900/20"
                        >
                            <Save className="w-4 h-4" />
                            Conferma Prestito
                        </button>
                    ) : (
                        <button 
                            onClick={handleReturn}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-lg font-medium transition-colors text-xs shadow-lg shadow-orange-900/20"
                        >
                            <UserMinus className="w-4 h-4" />
                            Segna come Restituito
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
