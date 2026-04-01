import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Book, BookNotes, SortOption, SortDirection } from '../types';
import { User, CheckCircle2, Bookmark, Loader2, Book as BookIcon, UserMinus, Star, Edit2 } from 'lucide-react';
import { getBookKey } from '../services/csvService';

// --- SOLUZIONE RADICALE E DEFINITIVA ---
// Nessuna libreria esterna. Zero react-window, zero auto-sizer.
// Un virtualizer nativo scritto in React puro che non può crashare.

interface BookListBlockProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  sortBy: SortOption;
  sortDirection: SortDirection;
  uiOpacity: number;
  bookNotes: BookNotes;
  isLoading: boolean;
  onRequestEditManualBook: (book: Book) => void;
}

type ListItem = 
  | { type: 'book'; data: Book }
  | { type: 'header'; author: string };

interface RowData {
  items: ListItem[];
  onSelectBook: (book: Book) => void;
  selectedBookId: string | undefined;
  bookNotes: BookNotes;
  sortBy: SortOption;
  onRequestEditManualBook: (book: Book) => void;
}

const BookRow = ({ index, style, data }: { index: number, style: React.CSSProperties, data: RowData }) => {
  const { items, onSelectBook, selectedBookId, bookNotes, sortBy } = data;
  const item = items[index];
  const isAuthorMode = sortBy === 'author';

  if (item.type === 'header') {
      const adjustedStyle = {
          ...style,
          width: `calc(100% - 32px)`,
          left: 0,
          zIndex: 5
      };
      
      return (
          <div style={adjustedStyle} className="px-3 flex items-end pb-1.5 absolute">
              <div className="text-white font-bold text-sm tracking-wide w-full leading-none pb-1 mt-auto flex items-center gap-2 overflow-hidden">
                  <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <div className="truncate w-full min-w-0">{item.author}</div>
              </div>
          </div>
      );
  }

  const book = item.data;
  const key = getBookKey(book);
  const noteEntry = bookNotes[key]; 
  const status = noteEntry?.status; 

  let baseColor = isAuthorMode ? "text-slate-300" : "text-slate-100";
  let textSize = isAuthorMode ? "text-[11px]" : "text-sm font-medium";

  if (status === 'READ') {
      baseColor = "text-emerald-400";
  } else if (status === 'TO_READ') {
      baseColor = "text-yellow-400";
  }

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

  const isCartaceo = noteEntry?.cartaceo === true;
  const isLoaned = !!noteEntry?.destinatarioPrestito;
  const hasRating = (noteEntry?.rating || 0) > 0;
  const isManual = book.format === 'MANUAL';

  const adjustedStyle = {
      ...style,
      width: `calc(100% - 32px)`,
      left: 0, 
  };
  
  return (
    <div style={adjustedStyle} className="px-2 absolute">
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
            <div className={`flex items-center justify-between gap-2 overflow-hidden ${!isAuthorMode ? 'items-start' : ''}`}>
                <div className={`truncate w-full min-w-0 flex items-center gap-1.5 ${titleClass}`}>
                    {isCartaceo && <BookIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    {isLoaned && <UserMinus className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    {hasRating && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    <span className="truncate">{book.title}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {statusIcon}
                    {isManual && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); data.onRequestEditManualBook(book); }}
                            className="text-slate-400 hover:text-sky-400 transition-colors"
                            title="Modifica libro manuale"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            
            {!isAuthorMode && (
                <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5 overflow-hidden">
                    <User className="w-3 h-3 opacity-70 shrink-0" />
                    <span className="truncate w-full min-w-0">{book.author}</span>
                </div>
            )}
        </div>
    </div>
  );
};

export const BookListBlock: React.FC<BookListBlockProps> = ({ books, onSelectBook, selectedBookId, sortBy, sortDirection, uiOpacity, bookNotes, isLoading, onRequestEditManualBook }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const baseLetters = ['A', 'F', 'K', 'P', 'U', 'Z'];
  const jumpLetters = sortDirection === 'asc' ? baseLetters : [...baseLetters].reverse();

  const items: ListItem[] = useMemo(() => {
      if (sortBy === 'title') {
          return books.map(b => ({ type: 'book', data: b }));
      } else {
          const result: ListItem[] = [];
          let lastAuthor = '';
          
          books.forEach(book => {
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

  const listStructureKey = `${sortBy}-${sortDirection}-${books.length}-${books[0]?.id || 'empty'}`;

  // Reset scroll on sort/filter changes
  useEffect(() => {
    if (containerRef.current && items.length > 0) {
        containerRef.current.scrollTop = 0;
    }
  }, [listStructureKey]);

  // Measure container height
  useEffect(() => {
    if (!containerRef.current) return;
    
    let observer: ResizeObserver | null = null;
    let handleResize: (() => void) | null = null;

    if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            setContainerHeight(entry.contentRect.height);
          }
        });
        observer.observe(containerRef.current);
    } else {
        // Fallback for older WebViews
        handleResize = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
    }
    
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => {
        if (observer) observer.disconnect();
        if (handleResize) window.removeEventListener('resize', handleResize);
    };
  }, []);

  const itemSize = sortBy === 'author' ? 40 : 64;

  const handleJumpTo = (letter: string) => {
      if (!containerRef.current) return;

      const index = items.findIndex(item => {
          let textToCheck = '';
          if (item.type === 'header') {
              textToCheck = item.author.toUpperCase();
          } else {
              textToCheck = (sortBy === 'author' ? item.data.author : item.data.title).toUpperCase();
          }

          if (sortDirection === 'asc') {
             return textToCheck.localeCompare(letter) >= 0;
          } else {
             return textToCheck.localeCompare(letter) <= 0;
          }
      });

      if (index !== -1) {
          containerRef.current.scrollTop = index * itemSize;
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

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

  const itemData: RowData = {
      items,
      onSelectBook,
      selectedBookId,
      bookNotes,
      sortBy,
      onRequestEditManualBook
  };

  // Calcolo elementi visibili per la virtualizzazione
  const overscan = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemSize) - overscan);
  const endIndex = Math.min(
    items.length - 1, 
    Math.ceil((scrollTop + containerHeight) / itemSize) + overscan
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      <BookRow 
        key={i} 
        index={i} 
        data={itemData} 
        style={{ top: i * itemSize, height: itemSize }} 
      />
    );
  }

  const totalHeight = items.length * itemSize;

  return (
    <div 
        className="h-full w-full relative flex transition-colors duration-300"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      <div className="flex-1 h-full pr-8">
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar relative"
          >
            <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
              {visibleItems}
            </div>
          </div>
      </div>

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