import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Book, AppData, AppSettings, BookNotes, BookStatus } from './types';
import { initializeFileSystem, loadData, loadSettings, loadNotes, saveNotes, getBookKey, getLastBackupInfo, getRawKey } from './services/csvService';
import { Header } from './components/Header';
import { SearchBlock } from './components/SearchBlock';
// AuthorComboBlock rimosso perché fuso in SearchBlock
import { AuthorFilterModal } from './components/AuthorFilterModal';
import { BookListBlock } from './components/BookListBlock';
import { DetailBlock } from './components/DetailBlock';
import { StatusModal, StatusModalState } from './components/StatusModal';
import { NoteModal } from './components/NoteModal';
import { AddBookModal } from './components/AddBookModal';

// --- CONFIGURAZIONE SFONDO ---
const BACKGROUND_IMAGE_URL = '/background.jpg'; 

export type SortOption = 'title' | 'author';
export type SortDirection = 'asc' | 'desc';

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({ metadata: null, books: [] });
  const [bookNotes, setBookNotes] = useState<BookNotes>({}); // Stato delle note
  const [isAppLoading, setIsAppLoading] = useState(true); // Stato di caricamento iniziale
  
  // UI States (Unified Opacity)
  const [uiOpacity, setUiOpacity] = useState(0.6); // Default 60%

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter/Sort States
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false); // Modal State
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false); // Add Book Modal

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // USER DATA FILTER
  const [showOnlyUserData, setShowOnlyUserData] = useState(false);

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
        setData(loadedData);
        setBookNotes(loadedNotes);
        setSelectedBook(null); 
        setIsAppLoading(false);
    });
  }, []);

  // Caricamento iniziale impostazioni e check backup
  const refreshSettings = useCallback(() => {
      const settings = loadSettings();
      if (settings.uiOpacity !== undefined) setUiOpacity(settings.uiOpacity);
      
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

  // Salvataggio Libro Manuale
  const handleManualBookSave = (author: string, title: string, status: BookStatus | null) => {
      const key = getRawKey(author, title);
      const updatedNotes = { ...bookNotes };
      const currentEntry = updatedNotes[key] || {};

      if (status) {
          updatedNotes[key] = {
              ...currentEntry,
              status: status,
              updatedAt: new Date().toISOString()
          };
      } else {
          // Se stato è nullo (caso raro da UI), salviamo comunque una nota vuota se non esiste
          // per marcare la presenza. Oppure se c'è già, non facciamo nulla.
          if(!currentEntry.updatedAt) {
             updatedNotes[key] = {
                 ...currentEntry,
                 updatedAt: new Date().toISOString()
             }
          }
      }

      setBookNotes(updatedNotes);
      saveNotes(updatedNotes);
      
      // Auto-switch to "My Data" view per vedere il risultato
      if (!showOnlyUserData) {
          setShowOnlyUserData(true);
      }
  };

  useEffect(() => {
    initializeFileSystem();
    refreshAppData();
    refreshSettings();
  }, [refreshAppData, refreshSettings]);

  const uniqueAuthors = useMemo(() => {
    const authors = new Set(data.books.map((b) => b.author));
    return Array.from(authors).sort((a: string, b: string) => a.localeCompare(b));
  }, [data.books]);

  // --- FILTER & SORT LOGIC ---
  const filteredBooks = useMemo(() => {
    // 1. Filter CSV Books
    let result = data.books.filter((book) => {
      // 1. User Data Filter (Top Priority)
      if (showOnlyUserData) {
          const key = getBookKey(book);
          const entry = bookNotes[key];
          // Keep if entry exists AND (has status OR has note)
          if (!entry || (!entry.status && !entry.note)) {
              return false;
          }
      }

      // 2. Author Filter
      const matchAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(book.author);
      if (!matchAuthor) return false;
      
      // 3. Search Filter (Only Contains mode now)
      if (searchTerm === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      const titleLower = book.title.toLowerCase();
      const authorLower = book.author.toLowerCase();

      return titleLower.includes(searchLower) || authorLower.includes(searchLower);
    });

    // 2. Sorting Main List
    result.sort((a, b) => {
      let compare = 0;
      if (sortBy === 'author') {
        compare = a.author.localeCompare(b.author);
        if (compare === 0) {
           return a.title.localeCompare(b.title);
        }
      } else {
        compare = a.title.localeCompare(b.title);
      }
      return sortDirection === 'asc' ? compare : -compare;
    });

    // 3. ORPHAN BOOKS LOGIC (Solo se siamo in modalità Preferiti)
    if (showOnlyUserData) {
        const csvKeys = new Set(data.books.map(b => getBookKey(b)));
        const orphanBooks: Book[] = [];

        Object.keys(bookNotes).forEach(key => {
            // Se la chiave NON è presente nell'indice CSV, è un libro manuale
            if (!csvKeys.has(key)) {
                const parts = key.split('|');
                if (parts.length >= 2) {
                    const author = parts[0]; // Già Uppercase dalla key
                    const title = parts[1];  // Già Uppercase dalla key
                    
                    // Controllo filtro ricerca anche per gli orfani
                    let matchesSearch = true;
                    if (searchTerm !== '') {
                        const searchLower = searchTerm.toLowerCase();
                        matchesSearch = author.toLowerCase().includes(searchLower) || title.toLowerCase().includes(searchLower);
                    }
                    
                    // Controllo filtro autori anche per gli orfani
                    let matchesAuthor = true;
                    if (selectedAuthors.length > 0) {
                         // Attenzione: selectedAuthors provengono dal CSV (case sensitive originali). 
                         // Qui abbiamo author UPPERCASE. Facciamo confronto loose.
                         matchesAuthor = selectedAuthors.some(sa => sa.toUpperCase() === author);
                    }

                    if (matchesSearch && matchesAuthor) {
                        orphanBooks.push({
                            id: `manual-${key}`,
                            author: author, // Mostrerà testo maiuscolo
                            title: title,   // Mostrerà testo maiuscolo
                            format: 'MANUAL'
                        });
                    }
                }
            }
        });

        // Ordina orfani tra di loro
        orphanBooks.sort((a, b) => {
             let compare = 0;
             if (sortBy === 'author') {
                 compare = a.author.localeCompare(b.author);
                 if(compare === 0) compare = a.title.localeCompare(b.title);
             } else {
                 compare = a.title.localeCompare(b.title);
             }
             return sortDirection === 'asc' ? compare : -compare;
        });

        // Appendi in fondo
        result = [...result, ...orphanBooks];
    }

    return result;
  }, [data.books, searchTerm, selectedAuthors, sortBy, sortDirection, showOnlyUserData, bookNotes]);

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
        />

        {/* UNIFIED CONTROL PANEL (Sort, Filters, Search) */}
        <SearchBlock 
          searchTerm={searchTerm} 
          setSearchTerm={handleSearchTermChange} 
          onSearch={handleManualSearch}
          isBusy={isBusy}
          uiOpacity={uiOpacity}
          // Sort Props
          sortBy={sortBy}
          setSortBy={handleSortChange}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection} 
          // Filter Props
          selectedAuthors={selectedAuthors}
          openAuthorModal={() => setIsAuthorModalOpen(true)}
          resetAuthors={handleResetAuthors}
          showOnlyUserData={showOnlyUserData}
          toggleShowOnlyUserData={handleToggleUserDataFilter}
          // Manual Book
          onAddManualBook={() => setIsAddBookModalOpen(true)}
        />

        {/* 
            MODIFICA LAYOUT:
            flex-1: Occupa tutto lo spazio verticale rimanente.
            min-h-0: Necessario per far funzionare lo scroll interno in flexbox nidificati.
        */}
        <div className="flex-1 w-full min-h-0 relative">
            <BookListBlock 
            books={filteredBooks} 
            onSelectBook={handleSelectBook} 
            selectedBookId={selectedBook?.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            isLoading={isAppLoading} // Nuovo stato loading
            />
        </div>

        {/* Pannello Dettaglio */}
        <DetailBlock 
            book={selectedBook}
            uiOpacity={uiOpacity}
            bookNotes={bookNotes} // Passiamo le note
            onRequestStatusChange={requestStatusChange}
            onRequestNoteEdit={requestNoteEdit}
            onRateBook={handleRateBook}
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
        onClose={() => setNoteModal({ ...noteModal, isOpen: false })}
        onSave={handleNoteSave}
      />

      {/* Add Manual Book Modal */}
      <AddBookModal 
         isOpen={isAddBookModalOpen}
         onClose={() => setIsAddBookModalOpen(false)}
         onConfirm={handleManualBookSave}
      />
    </div>
  );
};

export default App;