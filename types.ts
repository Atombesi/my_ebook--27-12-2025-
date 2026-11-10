
export interface Book {
  id: string; // generated UUID for internal use
  title: string;
  author: string;
  format: string;
}

export interface IndexMetadata {
  label: string;
  creationDate: string;
}

export interface AppData {
  metadata: IndexMetadata | null;
  books: Book[];
}

export interface AppSettings {
  folderUrl: string;
  lastUpdateUrl?: string; // Direct link to Ebook_update.txt
  customProxyUrl?: string; 
  uiOpacity?: number;
  debugMode?: boolean;
}

export interface LoanRecord {
  id: string; // uuid
  bookKey: string;
  title: string;
  author: string;
  recipient: string;
  loanDate: string;
  returnDate?: string | null;
  isPhysical: boolean;
}

export type BookStatus = 'READ' | 'TO_READ';

export interface BookNoteEntry {
    status?: BookStatus;
    note?: string;
    rating?: number; // 0, 1, 2, 3
    updatedAt?: string;
    cartaceo?: boolean;
    pregiata?: boolean;
    valore?: string;
    linkWeb?: string;
    hasImage?: boolean;
    dataPrestito?: string;
    destinatarioPrestito?: string;
    storicoPrestiti?: Array<{
        dataInizio: string;
        dataFine: string;
        destinatario: string;
    }>;
}

// Dizionario: Chiave "Autore|Titolo" -> Oggetto Dati
export type BookNotes = Record<string, BookNoteEntry>;

export type SortOption = 'title' | 'author';
export type SortDirection = 'asc' | 'desc';
export type FilterOption = 'ALL' | 'READ' | 'TO_READ' | 'RATED' | 'EBOOK' | 'PAPERBACK' | 'LOANED' | 'MANUAL' | 'PREGIATA' | 'NOTES';
