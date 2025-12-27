import React, { useState, useEffect } from 'react';
import { AlertCircle, Star } from 'lucide-react';
import { BookStatus } from '../types';

export interface StatusModalState {
    isOpen: boolean;
    targetStatus: BookStatus | null;
    actionType: 'ADD' | 'REMOVE' | 'SWITCH';
    bookTitle?: string;
}

interface StatusModalProps {
    state: StatusModalState;
    onClose: () => void;
    onConfirm: (rating?: number) => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ state, onClose, onConfirm }) => {
    const [rating, setRating] = useState(0);

    // Reset rating quando il modale si apre
    useEffect(() => {
        if (state.isOpen) {
            setRating(0);
        }
    }, [state.isOpen]);

    if (!state.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl flex flex-col items-center text-center">
                <AlertCircle className="w-10 h-10 text-emerald-400 mb-3" />
                
                <h3 className="text-white font-bold text-base mb-1">Conferma Azione</h3>
                {state.bookTitle && <p className="text-slate-500 text-xs italic mb-3 line-clamp-1">"{state.bookTitle}"</p>}
                
                <div className="text-sm text-slate-300 mb-4 px-1">
                    {state.actionType === 'REMOVE' && "Vuoi rimuovere lo stato assegnato?"}
                    {state.actionType === 'ADD' && state.targetStatus === 'READ' && "Hai completato la lettura di questo libro?"}
                    {state.actionType === 'ADD' && state.targetStatus === 'TO_READ' && "Aggiungere alla lista da leggere?"}
                    {state.actionType === 'SWITCH' && "Cambiare lo stato corrente?"}
                </div>

                {/* STAR RATING SELECTOR (Visibile solo se READ) */}
                {state.targetStatus === 'READ' && (
                    <div className="mb-6 flex flex-col gap-2 w-full bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                        <span className="text-xs text-slate-400 uppercase font-bold">Il tuo voto (opzionale)</span>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star === rating ? 0 : star)}
                                    className="focus:outline-none transition-transform active:scale-90"
                                >
                                    <Star 
                                        className={`w-8 h-8 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} 
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={() => onConfirm(rating)}
                        className={`flex-1 py-3 rounded-lg text-white text-sm font-bold shadow-lg transition-all active:scale-95
                            ${state.targetStatus === 'READ' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : ''}
                            ${state.targetStatus === 'TO_READ' ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' : ''}
                            ${state.targetStatus === null ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : ''}
                        `}
                    >
                        Conferma
                    </button>
                </div>
            </div>
        </div>
    );
};