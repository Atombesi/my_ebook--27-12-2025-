import React, { useState, useRef, useEffect } from 'react';
import type { Book, BookNotes, BookStatus } from '../types';
import { Check, CheckCircle2, Bookmark, FileSignature, CircleDashed, XCircle, Star, Globe, ScrollText, UserCheck, UserMinus, Gem, DollarSign, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { getBookKey } from '../services/csvService';
import { loadImage } from '../services/imageService';

interface DetailBlockProps {
  book: Book | null;
  uiOpacity: number;
  bookNotes: BookNotes;
  // Callbacks per delegare l'apertura modali al padre (App)
  onRequestStatusChange: (book: Book, targetStatus: BookStatus | null, actionType: 'ADD' | 'REMOVE' | 'SWITCH') => void;
  onRequestNoteEdit: (book: Book) => void;
  onRequestLoanEdit: (book: Book) => void;
  onRateBook: (book: Book, rating: number) => void;
  onRequestPhysicalEdit: (book: Book) => void;
}

export const DetailBlock: React.FC<DetailBlockProps> = ({ 
    book,
    uiOpacity,
    bookNotes,
    onRequestStatusChange,
    onRequestNoteEdit,
    onRequestLoanEdit,
    onRateBook,
    onRequestPhysicalEdit
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Stati per la ricerca Web Smart
  const [webSearchState, setWebSearchState] = useState<{ visible: boolean; query: string }>({ visible: false, query: '' });
  const [bookImage, setBookImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Ottieni dati attuali
  const currentKey = book ? getBookKey(book) : '';
  const currentEntry = book ? bookNotes[currentKey] : undefined;
  const currentStatus = currentEntry?.status;
  const currentRating = currentEntry?.rating || 0;
  const hasNote = currentEntry?.note && currentEntry.note.trim().length > 0;

  // Carica immagine se presente
  useEffect(() => {
      if (currentEntry?.hasImage && currentKey) {
          loadImage(currentKey).then(img => setBookImage(img));
      } else {
          setBookImage(null);
      }
  }, [currentKey, currentEntry?.hasImage]);

  // Chiudi menu se clicco fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (
            menuRef.current && 
            !menuRef.current.contains(event.target as Node) &&
            buttonRef.current &&
            !buttonRef.current.contains(event.target as Node)
        ) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chiudi menu e prepara ricerca quando cambia libro
  useEffect(() => {
      setIsMenuOpen(false);
      
      if (book) {
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
          setWebSearchState({
              visible: true,
              query: `il libro ${book.title}, autore,storia,curiosita`
          });
          searchTimerRef.current = setTimeout(() => {
              setWebSearchState(prev => ({ ...prev, visible: false }));
          }, 10000);
      } else {
          setWebSearchState({ visible: false, query: '' });
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      }
  }, [book?.id]); // Usiamo opzional chaining sulla dipendenza


  const handlePressStart = (text: string, fieldName: string) => {
    pressTimer.current = setTimeout(() => {
        // 1. Azione Standard: Copia nella clipboard
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        });

        // 2. Azione Nuova: Prepara e mostra bottone Ricerca Web
        let query = "";
        if (fieldName === 'author') {
            query = `quali libri ha scritto ${text} (bibliografia)`;
        } else if (fieldName === 'title') {
            query = `il libro ${text}, autore,storia,curiosita`;
        }

        if (query) {
            // Pulisci eventuale timer precedente di nascondimento
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

            setWebSearchState({ visible: true, query });

            // Imposta timer di 10 secondi per nascondere l'icona
            searchTimerRef.current = setTimeout(() => {
                setWebSearchState(prev => ({ ...prev, visible: false }));
            }, 10000);
        }

    }, 600);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
    }
  };

  const handleWebSearch = () => {
      if (!webSearchState.query) return;
      const url = `https://www.google.com/search?q=${encodeURIComponent(webSearchState.query)}`;
      window.open(url, '_blank');
      
      // Nascondi dopo il click
      setWebSearchState(prev => ({ ...prev, visible: false }));
  };

  const handleMenuSelection = (selectedStatus: BookStatus | null) => {
      if (!book) return;
      
      if (selectedStatus === currentStatus) {
         if (selectedStatus === null) setIsMenuOpen(false);
         setIsMenuOpen(false);
         return; 
      }

      setIsMenuOpen(false);

      if (selectedStatus === null) {
          onRequestStatusChange(book, null, 'REMOVE');
      } else {
          const action = currentStatus ? 'SWITCH' : 'ADD';
          onRequestStatusChange(book, selectedStatus, action);
      }
  };

  const handleRatingClick = (e: React.MouseEvent, rating: number) => {
      e.stopPropagation(); 
      if (!book) return;
      onRateBook(book, rating);
  };

  // Renderizza l'icona dello stato corrente nel bottone principale
  const renderMainIcon = () => {
      if (currentStatus === 'READ') return <CheckCircle2 className="w-6 h-6" />;
      if (currentStatus === 'TO_READ') return <Bookmark className="w-6 h-6" />;
      return <CircleDashed className="w-6 h-6" />;
  };

  const getMainButtonClass = () => {
      if (currentStatus === 'READ') return 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/50';
      if (currentStatus === 'TO_READ') return 'bg-yellow-600 border-yellow-400 text-white shadow-yellow-900/50';
      return 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-white';
  };

  const isRead = currentStatus === 'READ';

  return (
    <div 
        className="h-auto shrink-0 w-full z-20 overflow-visible flex flex-col transition-colors duration-300 border-t border-slate-700/30 relative"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      <div className="p-4 h-full flex flex-col relative">
        {book ? (
            <div className="flex flex-col gap-2">
            
            <div className="flex items-start gap-4 h-full relative">
                
                {/* SINISTRA: MENU STATO */}
                <div className="relative">
                    {/* Popup Menu */}
                    {isMenuOpen && (
                        <div 
                            ref={menuRef}
                            className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50"
                        >
                            {true && (
                                <button 
                                    onClick={() => {
                                        onRequestLoanEdit(book);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 border-b border-slate-800 ${!!currentEntry?.destinatarioPrestito ? 'text-orange-400' : 'text-slate-300'}`}
                                >
                                    {!!currentEntry?.destinatarioPrestito ? <UserMinus className="w-4 h-4 text-orange-500" /> : <UserCheck className="w-4 h-4" />}
                                    Prestito
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    onRequestNoteEdit(book);
                                    setIsMenuOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 ${hasNote ? 'text-indigo-400' : 'text-slate-300'}`}
                            >
                                <FileSignature className={`w-4 h-4 ${hasNote ? 'text-indigo-500' : ''}`} />
                                Note
                            </button>
                            <button 
                                onClick={() => handleMenuSelection('READ')}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 border-t border-slate-800 ${currentStatus === 'READ' ? 'text-emerald-400' : 'text-slate-300'}`}
                            >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Letto
                            </button>
                            <button 
                                onClick={() => handleMenuSelection('TO_READ')}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 border-t border-slate-800 ${currentStatus === 'TO_READ' ? 'text-yellow-400' : 'text-slate-300'}`}
                            >
                                <Bookmark className="w-4 h-4 text-yellow-500" />
                                Da Leggere
                            </button>
                            <button 
                                onClick={() => handleMenuSelection(null)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 border-t border-slate-800 ${!currentStatus ? 'text-white' : 'text-slate-400'}`}
                            >
                                <XCircle className="w-4 h-4" />
                                Nessuno
                            </button>
                            
                            {/* NEW CARTACEO TOGGLE */}
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(book) onRequestPhysicalEdit(book); 
                                    setIsMenuOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-800 border-t border-slate-800 ${currentEntry?.cartaceo ? 'text-amber-300' : 'text-slate-400'}`}
                            >
                                <ScrollText className={`w-4 h-4 ${currentEntry?.cartaceo ? 'text-amber-400' : ''}`} />
                                Edizione Fisica
                            </button>

                            {/* RATING SECTION (Solo se LETTO) */}
                            {isRead && (
                                <div className="border-t border-slate-800 p-2 flex justify-center gap-2 bg-slate-950/50">
                                    {[1, 2, 3].map((star) => (
                                        <button
                                            key={star}
                                            onClick={(e) => handleRatingClick(e, star === currentRating ? 0 : star)} // Toggle off if clicking same
                                            className="p-1 hover:scale-110 transition-transform active:scale-95 focus:outline-none"
                                        >
                                            <Star 
                                                className={`w-5 h-5 ${currentRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Button */}
                    <div className="relative flex flex-col items-center">
                        <button 
                            ref={buttonRef}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`
                                mt-1 p-3 rounded-full border shadow-sm transition-all active:scale-95 shrink-0
                                ${getMainButtonClass()}
                            `}
                            title="Cambia Stato"
                        >
                            {renderMainIcon()}
                        </button>
                        
                        {/* Mini Stars Indicator */}
                        {isRead && currentRating > 0 && (
                            <div className="absolute -bottom-2 flex gap-0.5 bg-slate-900/80 rounded-full px-1.5 py-0.5 border border-slate-700 shadow-sm">
                                {[...Array(currentRating)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_2px_rgba(250,204,21,0.8)]" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTRO: TESTI */}
                <div className="flex-1 flex flex-col pt-0.5 min-w-0">
                    {/* TITOLO */}
                    <div 
                        className="relative group cursor-pointer select-none active:scale-[0.98] transition-transform origin-left"
                        onClick={() => {
                            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                            setWebSearchState({
                                visible: true,
                                query: `il libro ${book.title}, autore,storia,curiosita`
                            });
                            searchTimerRef.current = setTimeout(() => {
                                setWebSearchState(prev => ({ ...prev, visible: false }));
                            }, 10000);
                        }}
                        onMouseDown={() => handlePressStart(book.title, 'title')}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(book.title, 'title')}
                        onTouchEnd={handlePressEnd}
                    >
                        <h2 className="text-base font-bold text-white leading-tight line-clamp-3 drop-shadow-md break-words">
                        {book.title}
                        </h2>
                        {copiedField === 'title' && (
                            <span className="absolute -right-2 top-0 text-emerald-400 text-[9px] flex items-center bg-black/80 px-1 rounded border border-emerald-900">
                                <Check className="w-3 h-3 mr-0.5" /> Copiato
                            </span>
                        )}
                    </div>

                    {/* AUTORE + FORMATO */}
                    <div 
                        className="relative group cursor-pointer select-none active:scale-[0.98] transition-transform origin-left mt-1.5"
                        onMouseDown={() => handlePressStart(book.author, 'author')}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(book.author, 'author')}
                        onTouchEnd={handlePressEnd}
                    >
                        <div className="flex items-center text-sm drop-shadow-md overflow-hidden">
                            {/* Autore Troncato */}
                            <span className="text-emerald-400 font-medium truncate shrink">
                                {book.author}
                            </span>
                            
                            {/* Formato Bianco e Visibile */}
                            <span className="text-white font-bold ml-2 shrink-0 whitespace-nowrap">
                                ({book.format})
                            </span>

                            {/* ICONA PREGIATA */}
                            {currentEntry?.pregiata && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsImageModalOpen(true); }}
                                    className="ml-2 p-1.5 rounded-full border shadow-sm transition-all active:scale-95 bg-purple-900/50 border-purple-500/50 text-purple-400 hover:text-purple-300 hover:bg-purple-800/50"
                                    title="Dettagli Edizione Pregiata"
                                >
                                    <Gem className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        
                        {copiedField === 'author' && (
                            <span className="absolute -right-2 top-0 text-emerald-400 text-[9px] flex items-center bg-black/80 px-1 rounded border border-emerald-900">
                                <Check className="w-3 h-3 mr-0.5" /> Copiato
                            </span>
                        )}
                    </div>
                </div>

                {/* DESTRA: PULSANTE RICERCA WEB */}
                <div className="flex flex-col gap-1 shrink-0 items-center justify-start mt-1">
                    <button
                        onClick={() => {
                            if (webSearchState.query) {
                                handleWebSearch();
                            } else {
                                // Default search if no specific query is active
                                const defaultQuery = `${book.title} ${book.author}`;
                                window.open(`https://www.google.com/search?q=${encodeURIComponent(defaultQuery)}`, '_blank');
                            }
                        }}
                        className={`
                            p-3 rounded-full border shadow-sm transition-all active:scale-95 relative
                            ${webSearchState.visible 
                                ? (webSearchState.query.includes('bibliografia')
                                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/50 animate-pulse'
                                    : 'bg-sky-600 border-sky-400 text-white shadow-sky-900/50 animate-pulse')
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-sky-400'}
                        `}
                        title="Cerca su Google"
                    >
                        <Globe className="w-6 h-6" />
                        {webSearchState.visible && (
                            <span className={`absolute -top-1 -right-1 text-white text-[8px] font-bold px-1 rounded-full border ${
                                webSearchState.query.includes('bibliografia') 
                                    ? 'bg-emerald-500 border-emerald-900' 
                                    : 'bg-sky-500 border-sky-900'
                            }`}>
                                {webSearchState.query.includes('bibliografia') ? 'Aut' : 'Tit'}
                            </span>
                        )}
                    </button>
                </div>

            </div>
            
            </div>
        ) : (
            <div className="h-24 flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                <Bookmark className="w-8 h-8 stroke-1 drop-shadow-md" />
                <p className="text-xs italic drop-shadow-md">Seleziona un libro</p>
            </div>
        )}

        {/* MODALE IMMAGINE PREGIATA */}
        {isImageModalOpen && currentEntry?.pregiata && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsImageModalOpen(false)}>
                <div 
                    className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 max-w-sm w-full max-h-[90vh] overflow-y-auto flex flex-col items-center gap-4 relative shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setIsImageModalOpen(false)}
                        className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full z-10"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-2 text-purple-400 mb-2 mt-4">
                        <Gem className="w-5 h-5" />
                        <h3 className="font-bold text-lg">Edizione Particolare</h3>
                    </div>

                    {bookImage ? (
                        <div className="w-full aspect-[2/3] rounded-lg overflow-hidden border border-slate-700 shadow-inner bg-black shrink-0">
                            <img src={bookImage} alt="Copertina" className="w-full h-full object-contain" />
                        </div>
                    ) : currentEntry.hasImage ? (
                        <div className="w-full aspect-[2/3] rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center animate-pulse gap-2 shrink-0">
                            <ImageIcon className="w-10 h-10 text-slate-600" />
                            <span className="text-slate-500 text-sm">Caricamento...</span>
                        </div>
                    ) : (
                        <div className="w-full aspect-[2/3] rounded-lg bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center gap-2 shrink-0">
                            <ImageIcon className="w-10 h-10 text-slate-600 opacity-50" />
                            <span className="text-slate-500 text-sm italic">Nessuna immagine</span>
                        </div>
                    )}

                    <div className="w-full flex items-stretch justify-between gap-2 mt-2 h-12">
                        {currentEntry.valore && (
                            <div className="flex items-center justify-center gap-1 text-yellow-400 bg-black px-4 rounded-lg border border-yellow-400/20 shrink-0">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold">{currentEntry.valore}</span>
                            </div>
                        )}
                        
                        {currentEntry.linkWeb && (
                            <button 
                                onClick={() => window.open(currentEntry.linkWeb, '_blank')}
                                className="flex-1 flex items-center justify-center gap-2 text-sky-400 hover:text-sky-300 bg-sky-400/10 rounded-lg font-medium border border-sky-400/20 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="text-sm">Open Link</span>
                            </button>
                        )}

                        <button 
                            onClick={() => setIsImageModalOpen(false)}
                            className="flex items-center justify-center px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors border border-slate-700 shrink-0"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
