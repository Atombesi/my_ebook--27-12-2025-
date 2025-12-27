import React, { useRef, useEffect, useMemo } from 'react';
import { Book, BookNotes, SortOption, SortDirection } from '../types';
import { User, CheckCircle2, Bookmark, Loader2 } from 'lucide-react';
import { getBookKey } from '../services/csvService';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface BookListBlockProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  sortBy: SortOption;
  sortDirection: SortDirection;
  uiOpacity: number;
  bookNotes: BookNotes;
  isLoading: boolean;
}

// Tipo unione per gli elementi della lista: o un Libro o una Intestazione
type ListItem = 
  | { type: 'book'; data: Book }
  | { type: 'header'; author: string };

// Interfaccia per i dati passati alla singola riga (Row)
interface RowData {
  items: ListItem[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  bookNotes: BookNotes;
  sortBy: SortOption; // Necessario per sapere se siamo in modalità autore
}

// Componente Riga Virtualizzata (Renderizzato solo quando visibile)
const BookRow = ({ index, style, data }: ListChildComponentProps<RowData>) => {
  const { items, onSelectBook, selectedBookId, bookNotes, sortBy } = data;
  const item = items[index];
  const isAuthorMode = sortBy === 'author';

  // Caso 1: Header Autore
  if (item.type === 'header') {
      const adjustedStyle = {
          ...style,
          width: `calc(${style.width} - 32px)`,
          left: 0,
          zIndex: 5
      };
      
      return (
          <div style={adjustedStyle} className="px-3 flex items-end pb-1.5">
              <div className="text-white font-bold text-sm tracking-wide w-full leading-none pb-1 mt-auto flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  {item.author}
              </div>
          </div>
      );
  }

  // Caso 2: Libro
  const book = item.data;
  const key = getBookKey(book);
  const noteEntry = bookNotes[key]; 
  const status = noteEntry?.status; 

  // Determinazione stile: Colore e Dimensione
  let baseColor = isAuthorMode ? "text-slate-300" : "text-slate-100";
  let textSize = isAuthorMode ? "text-[11px]" : "text-sm font-medium";

  // Override colori per status
  if (status === 'READ') {
      baseColor = "text-emerald-400";
  } else if (status === 'TO_READ') {
      baseColor = "text-yellow-400";
  }

  // Override colore selezione (se non ha status o per evidenziare)
  if (selectedBookId === book.id && !status) {
     baseColor = "text-emerald-100";
  }

  const titleClass = `${textSize} ${baseColor}`;
  
  let statusIcon = null;
  if (status === 'READ') {
      statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  } else if (status === 'TO_READ') {
      statusIcon = <Bookmark className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
  }

  // Nota: lo 'style' passato da react-window è essenziale per il posizionamento assoluto
  const adjustedStyle = {
      ...style,
      width: `calc(${style.width} - 32px)`, // Lascia spazio alla barra A-Z
      left: 0, 
  };
  
  return (
    <div style={adjustedStyle} className="px-2">
        <div
            onClick={() => onSelectBook(book)}
            className={`
            w-full px-2 rounded-lg cursor-pointer transition-all duration-200
            flex flex-col justify-center shadow-sm h-full
            ${selectedBookId === book.id 
                ? 'bg-emerald-900/90 ring-1 ring-emerald-500/50 backdrop-blur-sm' 
                : 'hover:bg-slate-600/30 bg-transparent border-b border-slate-700/20'}
            `}
        >
            <div className={`flex items-center justify-between gap-2 ${!isAuthorMode ? 'items-start' : ''}`}>
                <span className={`line-clamp-1 ${titleClass}`}>
                    {book.title}
                </span>
                {statusIcon}
            </div>
            
            {!isAuthorMode && (
                <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5">
                    <User className="w-3 h-3 opacity-70" />
                    <span className="truncate">{book.author}</span>
                </div>
            )}
        </div>
    </div>
  );
};

export const BookListBlock: React.FC<BookListBlockProps> = ({ books, onSelectBook, selectedBookId, sortBy, sortDirection, uiOpacity, bookNotes, isLoading }) => {
  const listRef = useRef<List>(null);
  
  const baseLetters = ['A', 'F', 'K', 'P', 'U', 'Z'];
  const jumpLetters = sortDirection === 'asc' ? baseLetters : [...baseLetters].reverse();

  // ELABORAZIONE LISTA: Trasforma la lista piatta in lista con intestazioni se necessario
  const items: ListItem[] = useMemo(() => {
      if (sortBy === 'title') {
          // Modalità classica
          return books.map(b => ({ type: 'book', data: b }));
      } else {
          // Modalità Raggruppata per Autore
          const result: ListItem[] = [];
          let lastAuthor = '';
          
          books.forEach(book => {
              // Rileva cambio autore (Case Insensitive per il controllo, ma usa il primo trovato per display)
              const currentAuthorUpper = book.author.trim().toUpperCase();
              
              if (currentAuthorUpper !== lastAuthor) {
                  result.push({ type: 'header', author: book.author.trim() });
                  lastAuthor = currentAuthorUpper;
              }
              result.push({ type: 'book', data: book });
          });
          return result;
      }
  }, [books, sortBy]);

  // FIX SCROLL JUMP: Usiamo una firma univoca per capire se la struttura è cambiata (Es. cambio sort o cambio ricerca/filtri)
  // Se cambia solo lo stato di un libro (bookNotes), 'books' cambia riferimento ma il contenuto è stabile in termini di ID e lunghezza (se non filtriamo su stato)
  // Usiamo ID primo elemento + lunghezza come firma semplice.
  const listStructureKey = `${sortBy}-${sortDirection}-${books.length}-${books[0]?.id || 'empty'}`;

  useEffect(() => {
    if (listRef.current && items.length > 0) {
        listRef.current.scrollTo(0);
    }
  }, [listStructureKey]);

  const handleJumpTo = (letter: string) => {
      if (!listRef.current) return;

      // Cerca nell'array ELABORATO (items) e non in quello grezzo (books)
      const index = items.findIndex(item => {
          let textToCheck = '';
          if (item.type === 'header') {
              textToCheck = item.author.toUpperCase();
          } else {
              // Se è un libro, controlliamo in base all'ordinamento corrente
              textToCheck = (sortBy === 'author' ? item.data.author : item.data.title).toUpperCase();
          }

          if (sortDirection === 'asc') {
             return textToCheck.localeCompare(letter) >= 0;
          } else {
             return textToCheck.localeCompare(letter) <= 0;
          }
      });

      if (index !== -1) {
          listRef.current.scrollToItem(index, 'start');
      }
  };

  // Altezza riga dinamica: 64px per lista normale (2 righe), 40px per lista autore (1 riga compatta)
  const itemSize = sortBy === 'author' ? 40 : 64;

  if (isLoading) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="bg-slate-900/50 px-4 py-2 rounded-lg backdrop-blur-sm animate-pulse text-sm">
                Caricamento in corso...
            </p>
        </div>
      );
  }

  if (items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-400 bg-transparent">
        <p className="bg-slate-900/50 px-4 py-2 rounded-lg backdrop-blur-sm">Nessun libro trovato.</p>
      </div>
    );
  }

  // Prepara i dati da passare alle righe
  const itemData: RowData = {
      items, // Passiamo la lista elaborata (Headers + Books)
      onSelectBook,
      selectedBookId,
      bookNotes,
      sortBy
  };

  return (
    <div 
        className="h-full w-full relative flex transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      
      {/* Container Lista Virtualizzata */}
      <div className="flex-1 h-full pr-8">
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={items.length}
                itemSize={itemSize} 
                itemData={itemData}
                className="no-scrollbar"
                style={{ overflowX: 'hidden' }}
              >
                {BookRow}
              </List>
            )}
          </AutoSizer>
      </div>

      {/* Jump Bar Laterale */}
      <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-between items-center py-2 bg-slate-900/20 backdrop-blur-sm z-10">
          {jumpLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => handleJumpTo(letter)}
                className="w-full flex-1 flex items-center justify-center text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-800/30 transition-colors drop-shadow-sm"
              >
                  {letter}
              </button>
          ))}
      </div>
    </div>
  );
};