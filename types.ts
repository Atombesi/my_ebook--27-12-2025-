
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
  lastUpdateUrl?: string; // New: Direct link to Last_Update.txt
  customProxyUrl?: string; 
  uiOpacity?: number;
  debugMode?: boolean;
}

export type BookStatus = 'READ' | 'TO_READ';

export interface BookNoteEntry {
    status?: BookStatus;
    note?: string;
    rating?: number; // 0, 1, 2, 3
    updatedAt?: string;
}

// Dizionario: Chiave "Autore|Titolo" -> Oggetto Dati
export type BookNotes = Record<string, BookNoteEntry>;

export type SortOption = 'title' | 'author';
export type SortDirection = 'asc' | 'desc';
