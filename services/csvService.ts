import { Book, AppData, IndexMetadata, AppSettings, BookNotes, BookNoteEntry, BookStatus, LoanRecord } from '../types';
import { 
  DEFAULT_CSV_CONTENT, 
  STORAGE_KEY_INDEX, 
  STORAGE_KEY_NOTE, 
  STORAGE_KEY_CONFIG, 
  STORAGE_KEY_LAST_BACKUP,
  STORAGE_KEY_LOAN_HISTORY,
  CSV_SEPARATOR,
  DEFAULT_DROPBOX_FOLDER_URL
} from '../constants';

// Simple UUID generator for React keys
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const initializeFileSystem = (): void => {
  const existingIndex = localStorage.getItem(STORAGE_KEY_INDEX);
  
  if (!existingIndex) {
    console.log('Initializing My_Ebook environment...');
    localStorage.setItem(STORAGE_KEY_INDEX, DEFAULT_CSV_CONTENT);
    localStorage.setItem(STORAGE_KEY_NOTE, '{}'); // Init empty JSON object
  }
};

export const saveRawIndex = (content: string): void => {
  localStorage.setItem(STORAGE_KEY_INDEX, content);
};

// --- SETTINGS MANAGEMENT ---
export const loadSettings = (): AppSettings => {
  const rawConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
  
  // Default VUOTO per usare il proxy pubblico di fallback (AllOrigins)
  // Il proxy precedente era bloccato da Cloudflare Access
  const DEFAULT_PROXY = ''; 

  let settings: AppSettings = {
    folderUrl: DEFAULT_DROPBOX_FOLDER_URL,
    lastUpdateUrl: '', // Default empty
    customProxyUrl: DEFAULT_PROXY, 
    uiOpacity: 0.6, 
    debugMode: false
  };

  if (rawConfig) {
    try {
        const parsed = JSON.parse(rawConfig);
        settings = {
            folderUrl: parsed.folderUrl !== undefined ? parsed.folderUrl : DEFAULT_DROPBOX_FOLDER_URL,
            lastUpdateUrl: parsed.lastUpdateUrl || '',
            customProxyUrl: parsed.customProxyUrl !== undefined ? parsed.customProxyUrl : DEFAULT_PROXY,
            uiOpacity: parsed.uiOpacity !== undefined ? parsed.uiOpacity : 0.6,
            debugMode: parsed.debugMode !== undefined ? parsed.debugMode : false
        };
    } catch (e) {
        console.error("Error loading settings", e);
    }
  }
  return settings;
};

export const saveSettings = (settings: AppSettings): void => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(settings));
};

// --- NOTES / STATUS MANAGEMENT ---

export const getBookKey = (book: Book): string => {
    const nAuthor = book.author ? book.author.trim().toUpperCase() : "UNKNOWN";
    const nTitle = book.title ? book.title.trim().toUpperCase() : "UNKNOWN";
    return `${nAuthor}|${nTitle}`;
};

export const getRawKey = (author: string, title: string): string => {
    const nAuthor = author ? author.trim().toUpperCase() : "UNKNOWN";
    const nTitle = title ? title.trim().toUpperCase() : "UNKNOWN";
    return `${nAuthor}|${nTitle}`;
};

export const loadNotes = (): BookNotes => {
    const raw = localStorage.getItem(STORAGE_KEY_NOTE);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        const normalized: BookNotes = {};
        
        Object.keys(parsed).forEach(key => {
            const val = parsed[key];
            if (typeof val === 'string') {
                normalized[key] = { status: val as BookStatus };
            } else {
                normalized[key] = val;
            }
        });
        
        return normalized;
    } catch (e) {
        console.error("Error parsing notes", e);
        return {};
    }
};

export const saveNotes = (notes: BookNotes): void => {
    localStorage.setItem(STORAGE_KEY_NOTE, JSON.stringify(notes));
};

// --- LOAN HISTORY MANAGEMENT ---

export const loadLoanHistory = (): LoanRecord[] => {
    const raw = localStorage.getItem(STORAGE_KEY_LOAN_HISTORY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

export const saveLoanHistory = (history: LoanRecord[]): void => {
    localStorage.setItem(STORAGE_KEY_LOAN_HISTORY, JSON.stringify(history));
};

// --- BACKUP MANAGEMENT ---

export interface BackupInfo {
    date: string;
    filename: string;
    timestamp?: number; 
}

export const getLastBackupInfo = (): BackupInfo | null => {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_BACKUP);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

export const saveLastBackupInfo = (filename: string): void => {
    const now = new Date();
    const info: BackupInfo = {
        date: now.toLocaleString(),
        filename: filename,
        timestamp: now.getTime()
    };
    localStorage.setItem(STORAGE_KEY_LAST_BACKUP, JSON.stringify(info));
};

export const exportBackupData = (): string => {
    const notes = loadNotes();
    const settings = loadSettings();
    const loanHistory = loadLoanHistory();
    
    const backupObject = {
        version: 1,
        date: new Date().toISOString(),
        notes: notes,
        settings: settings,
        loanHistory: loanHistory
    };
    
    return JSON.stringify(backupObject, null, 2);
};

export const importBackupData = (jsonString: string): boolean => {
    try {
        const backupObject = JSON.parse(jsonString);
        
        if (!backupObject.notes) {
            throw new Error("Formato backup non valido: mancano le note.");
        }

        saveNotes(backupObject.notes);

        if (backupObject.settings) {
            saveSettings(backupObject.settings);
        }

        if (backupObject.loanHistory) {
            saveLoanHistory(backupObject.loanHistory);
        }

        return true;
    } catch (e) {
        console.error("Backup restore failed", e);
        return false;
    }
};

// --- DATA LOADING ---
export const loadData = (): AppData => {
  const rawContent = localStorage.getItem(STORAGE_KEY_INDEX);

  if (!rawContent) {
    return { metadata: null, books: [] };
  }

  const lines = rawContent.split('\n').filter(line => line.trim() !== '');

  let metadata: IndexMetadata | null = null;
  let startIndex = 0;

  if (lines.length > 0) {
    const firstLine = lines[0];
    const metaParts = firstLine.split(CSV_SEPARATOR);
    
    if (metaParts.length >= 2) {
      metadata = {
        label: metaParts[0].trim(),
        creationDate: metaParts[1].trim()
      };
      startIndex = 1;
    }
  }

  const booksMap = new Map<string, Book>();

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(CSV_SEPARATOR);
    
    if (parts.length >= 3) {
      const author = parts[0].trim();
      const title = parts[1].trim();
      const format = parts[2].trim();

      if (author && title) {
          const key = getRawKey(author, title);
          if (!booksMap.has(key)) {
              booksMap.set(key, {
                id: generateId(),
                author: author,
                title: title,
                format: format
              });
          } else {
              const existingBook = booksMap.get(key)!;
              if (format && !existingBook.format.includes(format)) {
                  existingBook.format += `, ${format}`;
              }
          }
      }
    }
  }

  const books = Array.from(booksMap.values());

  return { metadata, books };
};