import React, { useState, useEffect } from 'react';
import { X, NotebookPen, Save, Copy, Check, Trash2 } from 'lucide-react';
import { STORAGE_KEY_QUICK_NOTES } from '../constants';

interface QuickNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickNotesModal: React.FC<QuickNotesModalProps> = ({ isOpen, onClose }) => {
  const [noteText, setNoteText] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Carica gli appunti al momento dell'apertura
  useEffect(() => {
    if (isOpen) {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY_QUICK_NOTES);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setNoteText(parsed.text || '');
          setLastSaved(parsed.updatedAt || null);
        } else {
          setNoteText('');
          setLastSaved(null);
        }
      } catch {
        const raw = localStorage.getItem(STORAGE_KEY_QUICK_NOTES) || '';
        setNoteText(raw);
      }
      setIsCopied(false);
      setShowClearConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    const payload = {
      text: noteText,
      updatedAt: formattedDate
    };
    try {
      localStorage.setItem(STORAGE_KEY_QUICK_NOTES, JSON.stringify(payload));
      setLastSaved(formattedDate);
    } catch (e) {
      console.error('Errore salvataggio appunti', e);
    }
    onClose();
  };

  const handleCopy = () => {
    if (!noteText.trim()) return;
    navigator.clipboard.writeText(noteText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleClear = () => {
    setNoteText('');
    setLastSaved(null);
    try {
      localStorage.removeItem(STORAGE_KEY_QUICK_NOTES);
    } catch (e) {
      console.error('Errore cancellazione appunti', e);
    }
    setShowClearConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <NotebookPen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Appunti Rapidi</h2>
              <p className="text-[11px] text-slate-400">Note personali salvate in locale</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            title="Chiudi"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Textarea */}
        <div className="p-4 flex-1 flex flex-col min-h-[260px] bg-slate-950/40">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Scrivi qui i tuoi appunti, titoli consigliati, libri da ricordare, note al volo..."
            className="w-full flex-1 min-h-[220px] bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 resize-none leading-relaxed font-sans"
            autoFocus
          />

          {/* Footer info & quick tools */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
              {lastSaved ? `Modificato il: ${lastSaved}` : 'Nessuna modifica recente'}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              {/* Bottone Copia */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!noteText.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-xs"
                title="Copia appunti"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copiato' : 'Copia'}</span>
              </button>

              {/* Bottone Pulisci */}
              {showClearConfirm ? (
                <div className="flex items-center gap-1 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px]"
                  >
                    Conferma
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-[11px]"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={!noteText.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 disabled:opacity-40 transition-colors text-xs"
                  title="Cancella appunto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-800/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Salva Appunto</span>
          </button>
        </div>

      </div>
    </div>
  );
};
