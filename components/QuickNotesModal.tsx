import React, { useState, useEffect, useRef } from 'react';
import { NotebookPen, Copy, Check, Trash2 } from 'lucide-react';
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

  // Ref per tracciare sempre l'ultimo testo e garantire l'auto-salvataggio
  const noteTextRef = useRef(noteText);
  noteTextRef.current = noteText;
  const initialTextRef = useRef('');

  // Carica gli appunti al momento dell'apertura
  useEffect(() => {
    if (isOpen) {
      let initial = '';
      try {
        const savedData = localStorage.getItem(STORAGE_KEY_QUICK_NOTES);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          initial = parsed.text || '';
          setNoteText(initial);
          setLastSaved(parsed.updatedAt || null);
        } else {
          setNoteText('');
          setLastSaved(null);
        }
      } catch {
        const raw = localStorage.getItem(STORAGE_KEY_QUICK_NOTES) || '';
        initial = raw;
        setNoteText(raw);
      }
      initialTextRef.current = initial;
      setIsCopied(false);
      setShowClearConfirm(false);
    }
  }, [isOpen]);

  const saveCurrentNote = (textToSave: string) => {
    const trimmed = textToSave;
    // Se era vuoto ed è ancora vuoto, non fare nulla
    if (trimmed === '' && initialTextRef.current === '') {
      return;
    }

    // Se l'utente ha cancellato tutto il testo manualmente
    if (trimmed.trim() === '') {
      try {
        localStorage.removeItem(STORAGE_KEY_QUICK_NOTES);
        initialTextRef.current = '';
        setLastSaved(null);
      } catch (e) {
        console.error('Errore pulizia appunti', e);
      }
      return;
    }

    // Se il testo non è cambiato rispetto all'apertura, non serve aggiornare la data
    if (trimmed === initialTextRef.current && lastSaved) {
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    const payload = {
      text: textToSave,
      updatedAt: formattedDate
    };
    try {
      localStorage.setItem(STORAGE_KEY_QUICK_NOTES, JSON.stringify(payload));
      initialTextRef.current = textToSave;
      setLastSaved(formattedDate);
    } catch (e) {
      console.error('Errore salvataggio appunti', e);
    }
  };

  // Auto-salvataggio di sicurezza se il modale viene smontato mentre aperto
  useEffect(() => {
    return () => {
      if (isOpen) {
        saveCurrentNote(noteTextRef.current);
      }
    };
  }, [isOpen]);

  // Gestione tasto Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        saveCurrentNote(noteTextRef.current);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Salvataggio esplicito e chiusura (premendo la spunta "Fine" in alto o cliccando sullo sfondo)
  const handleSaveAndClose = () => {
    saveCurrentNote(noteText);
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
    initialTextRef.current = '';
    try {
      localStorage.removeItem(STORAGE_KEY_QUICK_NOTES);
    } catch (e) {
      console.error('Errore cancellazione appunti', e);
    }
    setShowClearConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        // Tocco all'esterno del modale salva automaticamente e chiude
        if (e.target === e.currentTarget) {
          handleSaveAndClose();
        }
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header con pulsante spunta "Fine" sempre visibile e mai coperto dalla tastiera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-2.5 text-white">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <NotebookPen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Appunti Rapidi</h2>
              <p className="text-[11px] text-slate-400">Note salvate automaticamente</p>
            </div>
          </div>
          
          {/* Spunta in alto a destra: salva e chiude */}
          <button 
            type="button"
            onClick={handleSaveAndClose} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95"
            title="Salva e Chiudi"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Fine</span>
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

          {/* Barra inferiore compatta con data, copia e cestino */}
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

              {/* Bottone Pulisci (Cestino con conferma di sicurezza) */}
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

      </div>
    </div>
  );
};
