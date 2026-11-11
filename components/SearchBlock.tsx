import React, { useRef } from 'react';
import { Search, Zap, Target, X, Loader2, ArrowDownAZ, ArrowUpAZ, User, BookType, Eraser, Users, BookHeart, RefreshCw, Plus, Filter, NotebookPen } from 'lucide-react';
import { SortOption, SortDirection, FilterOption } from '../types';

interface SearchBlockProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: () => void;
  isBusy: boolean;
  uiOpacity: number;
  
  // Search Field
  searchField: 'all' | 'title' | 'author';
  setSearchField: (field: 'all' | 'title' | 'author') => void;

  // Sort Props
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  sortDirection: SortDirection;
  setSortDirection: (dir: SortDirection) => void;

  // Filter Props
  filterBy: FilterOption[];
  onOpenFilterModal: () => void;

  // Author & Fav Props (Migrated from AuthorComboBlock)
  selectedAuthors: string[];
  openAuthorModal: () => void;
  resetAuthors: () => void;
  showOnlyUserData: boolean;
  toggleShowOnlyUserData: () => void;

  // Add Manual Book
  onAddManualBook: () => void;

  // Quick Notes
  onOpenQuickNotes?: () => void;
}

const getFilterBadgeInfo = (filterBy: FilterOption[]): { label: string; style: string } => {
    if (!filterBy || filterBy.length === 0 || filterBy.includes('ALL')) {
        return {
            label: 'TUTTI',
            style: 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/80 hover:text-slate-300'
        };
    }
    if (filterBy.length > 1) {
        return {
            label: `M:${filterBy.length}`,
            style: 'bg-emerald-600/30 border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950'
        };
    }
    const single = filterBy[0];
    switch (single) {
        case 'TO_READ':
            return { label: 'DA L.', style: 'bg-sky-600/30 border-sky-500/70 text-sky-300 shadow-sm shadow-sky-950' };
        case 'READ':
            return { label: 'LETTI', style: 'bg-emerald-600/30 border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950' };
        case 'PAPERBACK':
            return { label: 'CART.', style: 'bg-amber-600/30 border-amber-500/70 text-amber-300 shadow-sm shadow-amber-950' };
        case 'LOANED':
            return { label: 'PREST', style: 'bg-purple-600/30 border-purple-500/70 text-purple-300 shadow-sm shadow-purple-950' };
        case 'RATED':
            return { label: 'VALUT', style: 'bg-yellow-500/30 border-yellow-400/70 text-yellow-300 shadow-sm shadow-yellow-950' };
        case 'EBOOK':
            return { label: 'EBOOK', style: 'bg-blue-600/30 border-blue-500/70 text-blue-300 shadow-sm shadow-blue-950' };
        case 'PREGIATA':
            return { label: 'PREG.', style: 'bg-rose-600/30 border-rose-500/70 text-rose-300 shadow-sm shadow-rose-950' };
        case 'MANUAL':
            return { label: 'MAN.', style: 'bg-indigo-600/30 border-indigo-500/70 text-indigo-300 shadow-sm shadow-indigo-950' };
        case 'NOTES':
            return { label: 'NOTE', style: 'bg-teal-600/30 border-teal-500/70 text-teal-300 shadow-sm shadow-teal-950' };
        default:
            return { label: 'FILT.', style: 'bg-emerald-600/30 border-emerald-500/70 text-emerald-300 shadow-sm shadow-emerald-950' };
    }
};

export const SearchBlock: React.FC<SearchBlockProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  onSearch,
  isBusy,
  uiOpacity,
  searchField,
  setSearchField,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  filterBy,
  onOpenFilterModal,
  selectedAuthors,
  openAuthorModal,
  resetAuthors,
  showOnlyUserData,
  toggleShowOnlyUserData,
  onAddManualBook,
  onOpenQuickNotes
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleSortClick = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  const authorCount = selectedAuthors.length;
  const isAuthorFilterActive = authorCount > 0;

  return (
    <div 
        className="w-full px-4 py-3 flex flex-col gap-3 relative z-20 transition-colors duration-300 border-b border-slate-700/20"
        style={{ backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` }}
    >
      
      {/* ROW 1: BUTTONS TOOLBAR (Equal width via flex-1) */}
      <div className="flex items-center gap-2 w-full">
          
          {/* 1. QUICK NOTES */}
          <button
            onClick={onOpenQuickNotes}
            className="h-12 flex-1 flex items-center justify-center rounded-xl shadow-md transition-all active:scale-95 border bg-slate-800/60 border-slate-700/50 text-amber-400 hover:bg-slate-700/60 hover:text-amber-300"
            title="Appunti Rapidi"
          >
            <NotebookPen className="w-6 h-6" />
          </button>


          {/* 2. FAVORITES TOGGLE */}
          <button
            onClick={toggleShowOnlyUserData}
            className={`
                h-12 flex-1 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center border
                ${showOnlyUserData 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/30' 
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-indigo-300'}
            `}
            title="Mostra solo i miei dati"
          >
            <BookHeart className={`w-6 h-6 ${showOnlyUserData ? 'fill-white/20' : ''}`} />
          </button>

          <div className="w-px h-8 bg-slate-700/50 mx-0.5 shrink-0"></div>

          {/* 3. SORT TITLE */}
          <button
              onClick={() => handleSortClick('title')}
              className={`
                 h-12 flex-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95
                 ${sortBy === 'title'
                    ? (sortDirection === 'asc' ? 'bg-blue-600 border-blue-400 text-white shadow-blue-900/30' : 'bg-yellow-500 border-yellow-400 text-slate-900 shadow-yellow-900/30')
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}
              `}
          >
              <div className="flex items-center gap-1">
                  <BookType className="w-4 h-4" />
                  {sortBy === 'title' && (sortDirection === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpAZ className="w-3 h-3" />)}
              </div>
              <span className="text-[9px] font-bold uppercase truncate w-full text-center px-1">Titolo</span>
          </button>

          {/* 4. SORT AUTHOR */}
          <button
              onClick={() => handleSortClick('author')}
              className={`
                 h-12 flex-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95
                 ${sortBy === 'author'
                    ? (sortDirection === 'asc' ? 'bg-blue-600 border-blue-400 text-white shadow-blue-900/30' : 'bg-yellow-500 border-yellow-400 text-slate-900 shadow-yellow-900/30')
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}
              `}
          >
              <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {sortBy === 'author' && (sortDirection === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpAZ className="w-3 h-3" />)}
              </div>
              <span className="text-[9px] font-bold uppercase truncate w-full text-center px-1">Autore</span>
          </button>

           {/* 5. FILTER BUTTON */}
           {(() => {
               const badgeInfo = getFilterBadgeInfo(filterBy);
               return (
                   <button
                      onClick={onOpenFilterModal}
                      className={`
                          h-12 flex-1 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 relative px-1 py-1
                          ${badgeInfo.style}
                      `}
                      title="Filtra libri"
                   >
                      <Filter className="w-4 h-4" />
                      <span className="text-[9px] font-bold uppercase truncate w-full text-center px-0.5 tracking-tight">
                          {badgeInfo.label}
                      </span>
                      {!filterBy.includes('ALL') && filterBy.length > 1 && (
                          <div className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-emerald-400 text-slate-950 text-[8px] font-bold rounded-full shadow-sm">
                              {filterBy.length}
                          </div>
                      )}
                   </button>
               );
           })()}

      </div>

      {/* ROW 2: SEARCH INPUT + ADD BUTTON */}
      <div className="w-full flex gap-2">
        <div className="relative flex-1 group">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
                searchField === 'all' ? "Cerca libro o autore..." : 
                searchField === 'title' ? "Cerca per TITOLO..." : 
                "Cerca per AUTORE..."
            }
            className="w-full bg-slate-800/80 text-slate-100 rounded-xl py-3 pl-4 pr-[80px] border border-slate-600/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner transition-colors placeholder-slate-500"
          />
           
           <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
               {searchTerm.length > 0 && (
                    <button 
                        onClick={handleClear}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
               )}
               {/* Search Scope Toggle */}
               <button
                    onClick={() => {
                        if (searchField === 'all') setSearchField('author');
                        else if (searchField === 'author') setSearchField('title');
                        else setSearchField('all');
                    }}
                    className={`
                        text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors
                        ${searchField === 'all' ? 'bg-slate-700 text-slate-300' : 
                          searchField === 'author' ? 'bg-emerald-600/80 text-white' : 
                          'bg-blue-600/80 text-white'}
                    `}
                    title="Cambia campo di ricerca"
               >
                   {searchField === 'all' ? 'Tutto' : searchField === 'author' ? 'Autore' : 'Titolo'}
               </button>
           </div>
        </div>

        {/* PULSANTE AGGIUNGI MANUALE */}
        <button
            onClick={onAddManualBook}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-emerald-700/50 text-emerald-400 hover:text-emerald-200 border border-slate-700/50 shadow-md transition-all active:scale-95"
            title="Aggiungi libro manuale"
        >
            <Plus className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
}