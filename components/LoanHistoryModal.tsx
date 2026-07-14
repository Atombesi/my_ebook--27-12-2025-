import React, { useMemo } from 'react';
import { X, History, UserCheck, Calendar } from 'lucide-react';
import { LoanRecord } from '../types';

interface LoanHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    loanHistory: LoanRecord[];
}

export const LoanHistoryModal: React.FC<LoanHistoryModalProps> = ({ isOpen, onClose, loanHistory }) => {
    
    // Raggruppiamo i prestiti per libro
    const groupedHistory = useMemo(() => {
        const groups: Record<string, {
            title: string;
            author: string;
            isPhysical: boolean;
            loans: LoanRecord[];
        }> = {};

        loanHistory.forEach(loan => {
            const key = loan.bookKey || `${loan.title}|${loan.author}`;
            if (!groups[key]) {
                groups[key] = {
                    title: loan.title,
                    author: loan.author,
                    isPhysical: loan.isPhysical,
                    loans: []
                };
            }
            groups[key].loans.push(loan);
        });

        // Convertiamo in array e ordiniamo i prestiti in ogni gruppo (più recenti prima)
        const result = Object.values(groups).map(group => {
            group.loans.sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());
            return group;
        });

        // Ordiniamo i gruppi per la data del prestito più recente
        result.sort((a, b) => {
            const dateA = a.loans[0] ? new Date(a.loans[0].loanDate).getTime() : 0;
            const dateB = b.loans[0] ? new Date(b.loans[0].loanDate).getTime() : 0;
            return dateB - dateA;
        });

        return result;
    }, [loanHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" />
                        <span className="text-base font-bold text-white">Archivio Prestiti</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-4 bg-slate-950/50 overflow-y-auto space-y-3">
                    {groupedHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                            <History className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">Nessun prestito registrato.</p>
                        </div>
                    ) : (
                        groupedHistory.map((group, index) => (
                            <div key={index} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-slate-200 text-sm">{group.title}</div>
                                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 whitespace-nowrap ml-2">
                                        {group.isPhysical ? 'Cartaceo' : 'eBook'}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 mb-3">{group.author}</div>
                                
                                <div className="space-y-2">
                                    {group.loans.map((loan) => (
                                        <div key={loan.id} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                                            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 shrink-0">
                                                <Calendar className="w-3 h-3" />
                                                <span>{loan.loanDate} {loan.returnDate ? ` - ${loan.returnDate}` : (loan.isPhysical ? ' (In prestito)' : '')}</span>
                                            </div>
                                            <span className="text-slate-600 hidden sm:inline">•</span>
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0 ml-auto sm:ml-0">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span className="font-medium truncate max-w-[120px] sm:max-w-none">{loan.recipient}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
