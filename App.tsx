import React, { useEffect, useState, useMemo, useCallback, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Book, AppData, AppSettings, BookNotes, BookStatus, LoanRecord } from './types';
import { initializeFileSystem, loadData, loadSettings, loadNotes, saveNotes, getBookKey, getLastBackupInfo, getRawKey, loadLoanHistory, saveLoanHistory, DEFAULT_SWIPE_FILTERS } from './services/csvService';
import { Filter } from 'lucide-react';
import { Header } from './components/Header';
import { SearchBlock } from './components/SearchBlock';
// AuthorComboBlock rimosso perché fuso in SearchBlock
import { AuthorFilterModal } from './components/AuthorFilterModal';
import { BookListBlock } from './components/BookListBlock';
import { DetailBlock } from './components/DetailBlock';
import { StatusModal, StatusModalState } from './components/StatusModal';
import { NoteModal } from './components/NoteModal';
import { LoanModal } from './components/LoanModal';
import { AddBookModal } from './components/AddBookModal';
import { FilterModal } from './components/FilterModal';
import { EditManualBookModal } from './components/EditManualBookModal';
import { PhysicalEditionModal } from './components/PhysicalEditionModal';
import { LoanHistoryModal } from './components/LoanHistoryModal';
import { QuickNotesModal } from './components/QuickNotesModal';
import { FilterOption } from './types';
import { saveImage, deleteImage } from './services/imageService';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 font-sans">
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Errore di Rendering
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              L'applicazione ha riscontrato un errore imprevisto. Invia questo screenshot allo sviluppatore:
            </p>
            <div className="bg-black/50 p-3 rounded-lg overflow-auto max-h-48 text-xs font-mono text-red-300 mb-4">
              {this.state.error && this.state.error.toString()}
              <br/><br/>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-medium transition-colors"
            >
              Ricarica App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- CONFIGURAZIONE SFONDO ---
const BACKGROUND_IMAGE_URL = '/background.jpg'; 

export type SortOption = 'title' | 'author';
export type SortDirection = 'asc' | 'desc';

const AppContent: React.FC = () => {
  const [data, setData] = useState<AppData>({ metadata: null, books: [] });
  const [bookNotes, setBookNotes] = useState<BookNotes>({}); // Stato delle note
  const [loanHistory, setLoanHistory] = useState<LoanRecord[]>([]); // Array globale prestiti
  const [isAppLoading, setIsAppLoading] = useState(true); // Stato di caricamento iniziale
  
  // UI States (Unified Opacity)
  const [uiOpacity, setUiOpacity] = useState(0.6); // Default 60%

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'title' | 'author'>('all');
  
  // Filter/Sort States
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false); // Modal State
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false); // Add Book Modal
  const [isLoanHistoryModalOpen, setIsLoanHistoryModalOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // USER DATA FILTER
  const [showOnlyUserData, setShowOnlyUserData] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterOption[]>(['ALL']);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // SWIPE CAROUSEL FILTERS
  const [swipeFilters, setSwipeFilters] = useState<FilterOption[]>(DEFAULT_SWIPE_FILTERS);
  const [swipeToast, setSwipeToast] = useState<{ label: string } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // UI Processing State
  const [isBusy, setIsBusy] = useState(false);

  // --- MODALS STATE ---
  const [statusModal, setStatusModal] = useState<StatusModalState & { book?: Book }>({
      isOpen: false,
      targetStatus: null,
      actionType: 'ADD'
  });

  const [noteModal, setNoteModal] = useState<{
      isOpen: boolean;
      book: Book | null;
      initialText: string;
  }>({ isOpen: false, book: null, initialText: '' });

  const [loanModal, setLoanModal] = useState<{
      isOpen: boolean;
      book: Book | null;
  }>({ isOpen: false, book: null });

  const [editManualModal, setEditManualModal] = useState<{
      isOpen: boolean;
      book: Book | null;
  }>({ isOpen: false, book: null });

  const [physicalModal, setPhysicalModal] = useState<{
      isOpen: boolean;
      book: Book | null;
  }>({ isOpen: false, book: null });

  // WATCHDOG
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isBusy) {
        timeoutId = setTimeout(() => {
            console.warn("Watchdog: Operazione troppo lunga, sblocco forzato UI.");
            setIsBusy(false);
        }, 10000);
    }
    return () => {
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isBusy]);

  const refreshAppData = useCallback(() => {
    // Simuliamo un minimo di caricamento per evitare flash
    setIsAppLoading(true);
    requestAnimationFrame(() => {
        const loadedData = loadData();
        const loadedNotes = loadNotes();
        const loadedLoanHistory = loadLoanHistory();
        setData(loadedData);
        setBookNotes(loadedNotes);
        setLoanHistory(loadedLoanHistory);
        setSelectedBook(null); 
        setIsAppLoading(false);
    });
  }, []);

  // Caricamento iniziale impostazioni e check backup
  const refreshSettings = useCallback(() => {
      const settings = loadSettings();
      if (settings.uiOpacity !== undefined) setUiOpacity(settings.uiOpacity);
      if (settings.swipeFilters && settings.swipeFilters.length > 0) {
          setSwipeFilters(settings.swipeFilters);
      }
      
      // Check Backup Time
      const backupInfo = getLastBackupInfo();
      if (backupInfo && backupInfo.timestamp) {
          const now = Date.now();
          const diffMs = now - backupInfo.timestamp;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          if (diffDays > 90) {
              // Avvisiamo con un piccolo ritardo per non sovrapporsi al rendering iniziale
              setTimeout(() => {
                  alert("Attenzione: non effettui un backup delle note da più di 3 mesi!");
              }, 1500);
          }
      }

  }, []);

  // Callback ottimizzata per aggiornamento immediato post-salvataggio
  const handleSettingsSaved = (newSettings: AppSettings) => {
      if (newSettings.uiOpacity !== undefined) setUiOpacity(newSettings.uiOpacity);
      if (newSettings.swipeFilters && newSettings.swipeFilters.length > 0) {
          setSwipeFilters(newSettings.swipeFilters);
      }
  };

  // Helper label leggibile per il toast di swipe
  const getFilterDisplayLabel = (f: FilterOption): string => {
      switch (f) {
          case 'ALL': return 'Tutti i libri';
          case 'TO_READ': return 'Da leggere';
          case 'READ': return 'Letti';
          case 'PAPERBACK': return 'Cartacei';
          case 'LOANED': return 'In Prestito';
          case 'RATED': return 'Valutati';
          case 'EBOOK': return 'Solo Ebook';
          case 'PREGIATA': return 'Pregiati';
          case 'MANUAL': return 'Aggiunti a Mano';
          case 'NOTES': return 'Con Note';
          default: return f;
      }
  };

  // Ciclo filtri tramite swipe orizzontale
  const cycleSwipeFilter = useCallback((direction: 'next' | 'prev') => {
      if (!swipeFilters || swipeFilters.length <= 1) return;

      const currentSingle = filterBy.length === 1 ? filterBy[0] : null;
      const currentIndex = currentSingle !== null ? swipeFilters.indexOf(currentSingle) : -1;

      let nextIndex = 0;
      if (currentIndex === -1) {
          nextIndex = direction === 'next' ? 0 : swipeFilters.length - 1;
      } else {
          if (direction === 'next') {
              nextIndex = (currentIndex + 1) % swipeFilters.length;
          } else {
              nextIndex = (currentIndex - 1 + swipeFilters.length) % swipeFilters.length;
          }
      }

      const nextFilter = swipeFilters[nextIndex];
      setFilterBy([nextFilter]);
      setSwipeToast({ label: getFilterDisplayLabel(nextFilter) });
  }, [filterBy, swipeFilters]);

  // Timer per auto-chiusura del badge toast
  useEffect(() => {
      if (!swipeToast) return;
      const timer = setTimeout(() => {
          setSwipeToast(null);
      }, 1100);
      return () => clearTimeout(timer);
  }, [swipeToast]);

  // Gestione touch swipe: movimento deciso (> 90px e orizzontalità > 2.2x) per evitare swipe involontari durante lo scroll verticale
  const handleTouchStart = (e: React.TouchEvent) => {
      if (!swipeFilters || swipeFilters.length <= 1) return;
      if (e.touches.length !== 1) {
          touchStartRef.current = null;
          return;
      }
      const touch = e.touches[0];
      touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
      };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current || !swipeFilters || swipeFilters.length <= 1) {
          touchStartRef.current = null;
          return;
      }
      if (e.changedTouches.length !== 1) {
          touchStartRef.current = null;
          return;
      }
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      const MIN_SWIPE_DISTANCE = 90; // Soglia aumentata: movimento ben deciso per evitare swipe involontari durante lo scroll
      const HORIZONTAL_DOMINANCE_RATIO = 2.2; // Orizzontale prevalente

      if (duration < 650 && Math.abs(diffX) >= MIN_SWIPE_DISTANCE && Math.abs(diffX) > Math.abs(diffY) * HORIZONTAL_DOMINANCE_RATIO) {
          if (diffX < 0) {
              // Swipe da destra verso sinistra -> successivo
              cycleSwipeFilter('next');
          } else {
              // Swipe da sinistra verso destra -> precedente
              cycleSwipeFilter('prev');
          }
      }
  };

  // --- LOGICA NOTE E STATO ---

  // Trigger dal DetailBlock per chiedere conferma cambio stato
  const requestStatusChange = (book: Book, targetStatus: BookStatus | null, actionType: 'ADD' | 'REMOVE' | 'SWITCH') => {
      setStatusModal({
          isOpen: true,
          book,
          targetStatus,
          actionType,
          bookTitle: book.title
      });
  };

  // Esecuzione effettiva dopo conferma nel modale
  const handleStatusConfirm = (ratingFromModal?: number) => {
      const { book, targetStatus } = statusModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      if (targetStatus === null) {
          // Rimuovi SOLO lo stato (e rating se presente), mantieni la nota
          delete currentEntry.status;
          delete currentEntry.rating; // Reset rating on clear status
          
          // Se l'oggetto è vuoto (no status, no note), pulisci
          if (!currentEntry.note) {
              delete updatedNotes[key];
          } else {
              updatedNotes[key] = currentEntry;
          }
      } else {
          // Imposta stato
          let newRating: number | undefined = currentEntry.rating;

          if (targetStatus === 'READ') {
              newRating = ratingFromModal && ratingFromModal > 0 ? ratingFromModal : (currentEntry.rating || undefined);
          } else if (targetStatus === 'TO_READ') {
              newRating = undefined;
          }

          updatedNotes[key] = {
              ...currentEntry,
              status: targetStatus,
              rating: newRating,
              updatedAt: new Date().toISOString()
          };
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      setStatusModal({ ...statusModal, isOpen: false });
  };

  // Salvataggio Rating (chiamato direttamente dal DetailBlock - modifica postuma)
  const handleRateBook = (book: Book, rating: number) => {
      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      // Se metto un rating, assumo che il libro sia LETTO
      const newStatus: BookStatus = 'READ';

      if (rating === 0) {
          delete currentEntry.rating;
      } else {
          currentEntry.rating = rating;
      }

      updatedNotes[key] = {
          ...currentEntry,
          status: newStatus,
          updatedAt: new Date().toISOString()
      };

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  // Trigger dal DetailBlock per aprire editor note
  const requestNoteEdit = (book: Book) => {
      const key = getBookKey(book);
      const currentEntry = bookNotes[key];
      setNoteModal({
          isOpen: true,
          book,
          initialText: currentEntry?.note || ''
      });
  };

  const requestLoanEdit = (book: Book) => {
      setLoanModal({
          isOpen: true,
          book
      });
  };

  const handleLoanSave = (destinatario: string, data: string) => {
      const { book } = loanModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      const isPhysical = currentEntry.cartaceo || false;
      const newLoan: LoanRecord = {
          id: Date.now().toString(),
          bookKey: key,
          title: book.title,
          author: book.author,
          recipient: destinatario,
          loanDate: data,
          isPhysical
      };
      
      const newHistory = [...loanHistory, newLoan];
      setLoanHistory(newHistory);
      saveLoanHistory(newHistory);

      updatedNotes[key] = {
          ...currentEntry,
          dataPrestito: data,
          destinatarioPrestito: destinatario,
          updatedAt: new Date().toISOString()
      };

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  const handleLoanReturn = () => {
      const { book } = loanModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key];
      
      if (!currentEntry || !currentEntry.destinatarioPrestito) return;

      const newHistory = [...loanHistory];
      for (let i = newHistory.length - 1; i >= 0; i--) {
          if (newHistory[i].bookKey === key && !newHistory[i].returnDate) {
              newHistory[i].returnDate = new Date().toISOString().split('T')[0];
              break;
          }
      }
      setLoanHistory(newHistory);
      saveLoanHistory(newHistory);

      const storico = currentEntry.storicoPrestiti || [];
      storico.push({
          dataInizio: currentEntry.dataPrestito || '',
          dataFine: new Date().toISOString().split('T')[0],
          destinatario: currentEntry.destinatarioPrestito
      });

      updatedNotes[key] = {
          ...currentEntry,
          dataPrestito: undefined,
          destinatarioPrestito: undefined,
          storicoPrestiti: storico,
          updatedAt: new Date().toISOString()
      };

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  // Salvataggio Nota
  const handleNoteSave = (text: string) => {
      const { book } = noteModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      if (!text || text.trim() === '') {
          // Cancella nota
          delete currentEntry.note;
          if (!currentEntry.status) {
              delete updatedNotes[key];
          } else {
              updatedNotes[key] = currentEntry;
          }
      } else {
          // Salva nota
          updatedNotes[key] = {
              ...currentEntry,
              note: text,
              updatedAt: new Date().toISOString()
          };
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
  };

  const handlePhysicalSave = async (data: { cartaceo: boolean; pregiata: boolean; valore: string; linkWeb: string; imageBase64: string | null }) => {
      const { book } = physicalModal;
      if (!book) return;

      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      let newEntry = { ...currentEntry, updatedAt: new Date().toISOString() };
      
      if (data.cartaceo) {
          newEntry.cartaceo = true;
          if (data.pregiata) {
              newEntry.pregiata = true;
              newEntry.valore = data.valore;
              newEntry.linkWeb = data.linkWeb;
              
              if (data.imageBase64) {
                  await saveImage(key, data.imageBase64);
                  newEntry.hasImage = true;
              }
          } else {
              delete newEntry.pregiata;
              delete newEntry.valore;
              delete newEntry.linkWeb;
              // We don't necessarily delete the image from DB here, but we set hasImage to false
              newEntry.hasImage = false;
          }
      } else {
          delete newEntry.cartaceo;
          delete newEntry.pregiata;
          delete newEntry.valore;
          delete newEntry.linkWeb;
          newEntry.hasImage = false;
      }

      // Se l'oggetto è vuoto (no status, no note, no cartaceo, no rating), pulisci
      if (!newEntry.status && !newEntry.note && !newEntry.cartaceo && !newEntry.rating) {
          delete updatedNotes[key];
      } else {
          updatedNotes[key] = newEntry;
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      setPhysicalModal({ isOpen: false, book: null });
  };

  // Salvataggio Libro Manuale
  const handleManualBookSave = (author: string, title: string, status: BookStatus | null, cartaceo: boolean) => {
      const key = getRawKey(author, title);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      let newEntry = { ...currentEntry, updatedAt: new Date().toISOString() };
      
      if (status) {
          newEntry.status = status;
      }
      
      if (cartaceo) {
          newEntry.cartaceo = true;
      } else {
          delete newEntry.cartaceo;
      }

      updatedNotes[key] = newEntry;

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      
      // Auto-switch to "My Data" view per vedere il risultato
      if (!showOnlyUserData) {
          setShowOnlyUserData(true);
      }
  };

  const handleEditManualBookSave = (oldBook: Book, newAuthor: string, newTitle: string) => {
      const oldKey = getBookKey(oldBook);
      const newKey = getRawKey(newAuthor, newTitle);
      
      if (oldKey !== newKey) {
          const updatedNotes = { ...bookNotes };
          const currentEntry = updatedNotes[oldKey];
          
          if (currentEntry) {
              updatedNotes[newKey] = { ...currentEntry, updatedAt: new Date().toISOString() };
              delete updatedNotes[oldKey];
              setBookNotes(updatedNotes);
              saveNotes(updatedNotes);
          }
      }
      setEditManualModal({ isOpen: false, book: null });
      if (selectedBook?.id === oldBook.id) {
          setSelectedBook(null);
      }
  };

  const handleDeleteManualBook = (book: Book) => {
      const key = getBookKey(book);
      const updatedNotes = { ...bookNotes };
      delete updatedNotes[key];
      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      
      setEditManualModal({ isOpen: false, book: null });
      if (selectedBook?.id === book.id) {
          setSelectedBook(null);
      }
  };

  useEffect(() => {
    initializeFileSystem();
    refreshAppData();
    refreshSettings();
  }, [refreshAppData, refreshSettings]);

  const uniqueAuthors = useMemo(() => {
    const authors = new Set(data.books.map((b) => b.author || 'Sconosciuto'));
    return Array.from(authors).sort((a: string, b: string) => a.localeCompare(b));
  }, [data.books]);

  // --- FILTER & SORT LOGIC ---
  const filteredBooks = useMemo(() => {
    // 1. Filter CSV Books
    let result = data.books.filter((book) => {
      if (filterBy.includes('MANUAL') && filterBy.length === 1) return false; // If ONLY MANUAL is selected, hide CSV books

      // 1. User Data Filter (Top Priority)
      if (showOnlyUserData) {
          const key = getBookKey(book);
          const entry = bookNotes[key];
          // Keep if entry exists AND (has status OR has note OR is cartaceo)
          if (!entry || (!entry.status && !entry.note && !entry.cartaceo)) {
              return false;
          }
      }

      // 2. Author Filter
      const matchAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(book.author);
      if (!matchAuthor) return false;
      
      // 3. Category Filter
      if (!filterBy.includes('ALL')) {
          const key = getBookKey(book);
          const entry = bookNotes[key] || {};
          
          let matchesAnyFilter = false;
          
          if (filterBy.includes('READ') && entry.status === 'READ') matchesAnyFilter = true;
          if (filterBy.includes('TO_READ') && entry.status === 'TO_READ') matchesAnyFilter = true;
          if (filterBy.includes('RATED') && (entry.rating && entry.rating > 0)) matchesAnyFilter = true;
          if (filterBy.includes('EBOOK') && !entry.cartaceo) matchesAnyFilter = true;
          if (filterBy.includes('PAPERBACK') && entry.cartaceo) matchesAnyFilter = true;
          if (filterBy.includes('PREGIATA') && entry.pregiata) matchesAnyFilter = true;
          if (filterBy.includes('LOANED') && entry.destinatarioPrestito) matchesAnyFilter = true;
          if (filterBy.includes('NOTES') && entry.note && entry.note.trim().length > 0) matchesAnyFilter = true;
          
          if (!matchesAnyFilter) return false;
      }

      // 4. Search Filter (Only Contains mode now)
      if (searchTerm === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      const titleLower = (book.title || '').toLowerCase();
      const authorLower = (book.author || '').toLowerCase();

      if (searchField === 'author') {
          return authorLower.includes(searchLower);
      } else if (searchField === 'title') {
          return titleLower.includes(searchLower);
      } else {
          return titleLower.includes(searchLower) || authorLower.includes(searchLower);
      }
    });

    // 2. ORPHAN BOOKS LOGIC (Libri aggiunti manualmente)
    const csvKeys = new Set(data.books.map(b => getBookKey(b)));
    const orphanBooks: Book[] = [];

    Object.keys(bookNotes).forEach(key => {
        // Se la chiave NON è presente nell'indice CSV, è un libro manuale
        if (!csvKeys.has(key)) {
            const entry = bookNotes[key];
            const parts = key.split('|');
            if (parts.length >= 2) {
                const author = parts[0]; // Già Uppercase dalla key
                const title = parts[1];  // Già Uppercase dalla key
                
                // Controllo filtro ricerca anche per gli orfani
                let matchesSearch = true;
                if (searchTerm !== '') {
                    const searchLower = searchTerm.toLowerCase();
                    const titleLower = title.toLowerCase();
                    const authorLower = author.toLowerCase();
                    
                    if (searchField === 'author') {
                        matchesSearch = authorLower.includes(searchLower);
                    } else if (searchField === 'title') {
                        matchesSearch = titleLower.includes(searchLower);
                    } else {
                        matchesSearch = authorLower.includes(searchLower) || titleLower.includes(searchLower);
                    }
                }
                
                // Controllo filtro autori anche per gli orfani
                let matchesAuthor = true;
                if (selectedAuthors.length > 0) {
                     matchesAuthor = selectedAuthors.some(sa => sa.toUpperCase() === author);
                }

                // Controllo filtro User Data
                let matchesUserData = true;
                if (showOnlyUserData) {
                    if (!entry || (!entry.status && !entry.note && !entry.cartaceo)) {
                        matchesUserData = false;
                    }
                }

                // Controllo filtro Categoria
                let matchesCategory = true;
                if (!filterBy.includes('ALL')) {
                    let matchesAnyFilter = false;
                    if (filterBy.includes('READ') && entry?.status === 'READ') matchesAnyFilter = true;
                    if (filterBy.includes('TO_READ') && entry?.status === 'TO_READ') matchesAnyFilter = true;
                    if (filterBy.includes('RATED') && (entry?.rating && entry.rating > 0)) matchesAnyFilter = true;
                    if (filterBy.includes('EBOOK') && !entry?.cartaceo) matchesAnyFilter = true;
                    if (filterBy.includes('PAPERBACK') && entry?.cartaceo) matchesAnyFilter = true;
                    if (filterBy.includes('PREGIATA') && entry?.pregiata) matchesAnyFilter = true;
                    if (filterBy.includes('LOANED') && entry?.destinatarioPrestito) matchesAnyFilter = true;
                    if (filterBy.includes('NOTES') && entry?.note && entry.note.trim().length > 0) matchesAnyFilter = true;
                    if (filterBy.includes('MANUAL')) matchesAnyFilter = true;
                    
                    if (!matchesAnyFilter) matchesCategory = false;
                }

                if (matchesSearch && matchesAuthor && matchesUserData && matchesCategory) {
                    orphanBooks.push({
                        id: `manual-${key}`,
                        author: author,
                        title: title,
                        format: 'MANUAL'
                    });
                }
            }
        }
    });

    // If filter is ONLY MANUAL, return ONLY orphan books
    if (filterBy.includes('MANUAL') && filterBy.length === 1) {
        result = orphanBooks;
    } else {
        result = [...result, ...orphanBooks];
    }

    // 3. Sorting Main List (Incluso gli orfani)
    result.sort((a, b) => {
      let compare = 0;
      if (sortBy === 'author') {
        compare = (a.author || '').localeCompare(b.author || '');
        if (compare === 0) {
           return (a.title || '').localeCompare(b.title || '');
        }
      } else {
        compare = (a.title || '').localeCompare(b.title || '');
      }
      return sortDirection === 'asc' ? compare : -compare;
    });

    return result;
  }, [data.books, searchTerm, searchField, selectedAuthors, sortBy, sortDirection, showOnlyUserData, filterBy, bookNotes]);

  // --- HANDLERS ---
  const performHeavyAction = (action: () => void) => {
      setIsBusy(true);
      requestAnimationFrame(() => {
          setTimeout(() => {
              try {
                  action(); 
              } catch (e) {
                  console.error("Errore azione:", e);
              } finally {
                  setIsBusy(false);
              }
          }, 100); 
      });
  };

  // AUTO-RESET FILTER HANDLERS
  const resetUserDataFilter = () => {
      if (showOnlyUserData) setShowOnlyUserData(false);
  };

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
    resetUserDataFilter(); 
    setSelectedBook(null);
  };

  const handleManualSearch = () => {
      // In contains mode, typing triggers search, button just closes keyboard mostly
      performHeavyAction(() => {
         resetUserDataFilter();
      });
  };

  const handleSortChange = (newSortBy: SortOption) => {
    performHeavyAction(() => {
        // Non resettiamo più il filtro dati utente al cambio ordinamento, è fastidioso
        setSortBy(newSortBy);
        setSortDirection('asc');
    });
  };

  const handleAuthorSelection = (selected: string[]) => {
      performHeavyAction(() => {
          resetUserDataFilter();
          setSelectedAuthors(selected);
      });
  };

  const handleResetAuthors = () => {
      performHeavyAction(() => {
          resetUserDataFilter(); // Reset filter
          setSelectedAuthors([]);
      });
  };

  const handleToggleUserDataFilter = () => {
      performHeavyAction(() => {
          setShowOnlyUserData(prev => !prev);
      });
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  };

  useEffect(() => {
      if (selectedBook) {
        const exists = filteredBooks.find(b => b.id === selectedBook.id);
        if (!exists) setSelectedBook(null);
      }
  }, [filteredBooks]); 

  return (
    <div className="h-screen w-full flex flex-col max-w-md mx-auto overflow-hidden relative font-sans">
      
      {/* OVERLAY DI BLOCCO */}
      {isBusy && (
          <div className="fixed inset-0 z-[100] cursor-wait bg-transparent" />
      )}

      {/* BACKGROUND IMAGE */}
      <div 
        className="absolute inset-0 z-0"
        style={{ 
            backgroundImage: `url('${BACKGROUND_IMAGE_URL}')`, 
            opacity: 1, 
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      <div className="z-10 flex flex-col h-full w-full">
        <Header 
          metadata={data.metadata} 
          filteredCount={filteredBooks.length} 
          totalCount={data.books.length}
          onRefreshData={refreshAppData}
          onSettingsSaved={handleSettingsSaved}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
          onDataRestored={refreshAppData}
          onOpenLoanHistory={() => setIsLoanHistoryModalOpen(true)}
        />

        {/* UNIFIED CONTROL PANEL (Sort, Filters, Search) */}
        <SearchBlock 
          searchTerm={searchTerm} 
          setSearchTerm={handleSearchTermChange} 
          onSearch={handleManualSearch}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
          searchField={searchField}
          setSearchField={setSearchField}
          // Sort Props
          sortBy={sortBy}
          setSortBy={handleSortChange}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection} 
          // Filter Props
          filterBy={filterBy}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          // Author & Fav Props
          selectedAuthors={selectedAuthors}
          openAuthorModal={() => setIsAuthorModalOpen(true)}
          resetAuthors={handleResetAuthors}
          showOnlyUserData={showOnlyUserData}
          toggleShowOnlyUserData={handleToggleUserDataFilter}
          // Manual Book
          onAddManualBook={() => setIsAddBookModalOpen(true)}
          // Quick Notes
          onOpenQuickNotes={() => setIsQuickNotesOpen(true)}
        />

        {/* 
            MODIFICA LAYOUT:
            flex-1: Occupa tutto lo spazio verticale rimanente.
            min-h-0: Necessario per far funzionare lo scroll interno in flexbox nidificati.
        */}
        <div 
          className="flex-1 w-full min-h-0 relative select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
            <BookListBlock 
            books={filteredBooks} 
            onSelectBook={handleSelectBook} 
            selectedBookId={selectedBook?.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            isLoading={isAppLoading} // Nuovo stato loading
            onRequestEditManualBook={(book) => setEditManualModal({ isOpen: true, book })}
            onRequestNoteEdit={requestNoteEdit}
            />

            {/* Toast feedback pill al cambio filtro via swipe */}
            {swipeToast && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-200">
                    <div className="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/70 text-emerald-300 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
                        <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold tracking-wide">
                            {swipeToast.label}
                        </span>
                    </div>
                </div>
            )}
        </div>

        {/* Pannello Dettaglio */}
        <DetailBlock 
            book={selectedBook}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            onRequestStatusChange={requestStatusChange}
            onRequestNoteEdit={requestNoteEdit}
            onRequestLoanEdit={requestLoanEdit}
            onRateBook={handleRateBook}
            onRequestPhysicalEdit={(book) => setPhysicalModal({ isOpen: true, book })}
        />
      </div>

      {/* --- MODALI (LIVELLO APP) --- */}

      {/* Author Filter Modal */}
      <AuthorFilterModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        authors={uniqueAuthors}
        initialSelected={selectedAuthors}
        onConfirm={handleAuthorSelection}
      />
      
      {/* Modale Conferma Stato */}
      <StatusModal 
        state={statusModal}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        onConfirm={handleStatusConfirm}
      />

      {/* Modale Note */}
      <NoteModal
        isOpen={noteModal.isOpen}
        book={noteModal.book}
        initialNote={noteModal.initialText}
        currentEntry={noteModal.book ? bookNotes[getBookKey(noteModal.book)] : undefined}
        onClose={() => setNoteModal({ ...noteModal, isOpen: false })}
        onSave={handleNoteSave}
      />

      {/* Modale Prestito */}
      <LoanModal
        isOpen={loanModal.isOpen}
        book={loanModal.book}
        currentEntry={loanModal.book ? bookNotes[getBookKey(loanModal.book)] : undefined}
        onClose={() => setLoanModal({ ...loanModal, isOpen: false })}
        onSaveLoan={handleLoanSave}
        onReturnLoan={handleLoanReturn}
      />

      {/* Modale Edizione Fisica */}
      <PhysicalEditionModal
        isOpen={physicalModal.isOpen}
        book={physicalModal.book}
        currentEntry={physicalModal.book ? bookNotes[getBookKey(physicalModal.book)] : undefined}
        onClose={() => setPhysicalModal({ isOpen: false, book: null })}
        onSave={handlePhysicalSave}
      />

      {/* Add Manual Book Modal */}
      <AddBookModal 
         isOpen={isAddBookModalOpen}
         onClose={() => setIsAddBookModalOpen(false)}
         onConfirm={handleManualBookSave}
      />

      {/* Loan History Modal */}
      <LoanHistoryModal
         isOpen={isLoanHistoryModalOpen}
         onClose={() => setIsLoanHistoryModalOpen(false)}
         loanHistory={loanHistory}
      />

      {/* Filter Modal */}
      <FilterModal
         isOpen={isFilterModalOpen}
         onClose={() => setIsFilterModalOpen(false)}
         currentFilters={filterBy}
         onToggleFilter={(filter) => {
             setFilterBy(prev => {
                 if (filter === 'ALL') return ['ALL'];
                 
                 const newFilters = prev.includes(filter) 
                     ? prev.filter(f => f !== filter)
                     : [...prev.filter(f => f !== 'ALL'), filter];
                     
                 return newFilters.length === 0 ? ['ALL'] : newFilters;
             });
         }}
      />

      {/* Edit Manual Book Modal */}
      <EditManualBookModal
         isOpen={editManualModal.isOpen}
         book={editManualModal.book}
         onClose={() => setEditManualModal({ isOpen: false, book: null })}
         onConfirm={handleEditManualBookSave}
         onDelete={handleDeleteManualBook}
      />

      {/* Quick Notes Modal */}
      <QuickNotesModal
        isOpen={isQuickNotesOpen}
        onClose={() => setIsQuickNotesOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}