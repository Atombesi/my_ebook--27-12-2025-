import JSZip from 'jszip';
import { saveRawIndex, loadSettings } from './csvService';
import { STORAGE_KEY_LOGS } from '../constants';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// --- SYSTEM LOGGING ---
let storedLogs: string[] = [];
try {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    if (saved) {
        storedLogs = JSON.parse(saved);
    }
} catch (e) {
    console.error("Error loading logs", e);
}

export let debugLogs: string[] = storedLogs;

export const addLog = (msg: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${msg}`;
  
  console.log(logEntry);
  
  debugLogs.unshift(logEntry);
  if (debugLogs.length > 100) debugLogs = debugLogs.slice(0, 100); 
  
  try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(debugLogs));
  } catch (e) {
      console.error("Error saving logs", e);
  }
};

export const clearLogs = () => {
    debugLogs = [];
    localStorage.removeItem(STORAGE_KEY_LOGS);
    addLog("Log azzerati dall'utente.");
};

export const getLogs = () => debugLogs;

const parseCustomDate = (dateStr: string): Date | null => {
  try {
    if (!dateStr) return null;
    const normalized = dateStr.replace(/\//g, '-').trim();
    const [d, t] = normalized.split(' ');
    if (!d || !t) return null;
    const [day, month, year] = d.split('-').map(Number);
    const [hour, minute] = t.split(':').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) return null;
    return new Date(year, month - 1, day, hour, minute);
  } catch (e) {
    return null;
  }
};

// --- ROBUST HYBRID FETCH STRATEGY ---

async function fetchViaProxy(
    targetUrl: string, 
    customProxyUrl?: string,
    onStatusUpdate?: (status: string) => void
): Promise<Response> {
    
    if (!navigator.onLine) {
        throw new Error("Nessuna connessione internet disponibile");
    }

    // 1. Normalizza URL Dropbox (Forza dl=1)
    let downloadUrl = targetUrl;
    if (downloadUrl.includes('dropbox.com')) {
        if (downloadUrl.includes('dl=0')) {
            downloadUrl = downloadUrl.replace('dl=0', 'dl=1');
        } else if (!downloadUrl.includes('dl=1')) {
            const separator = downloadUrl.includes('?') ? '&' : '?';
            downloadUrl = `${downloadUrl}${separator}dl=1`;
        }
    }

    const uniqueUrl = `${downloadUrl}&ts=${Date.now()}`;

    // --- TENTATIVO 1: CAPACITOR NATIVE HTTP (ANDROID/IOS) ---
    // Usiamo il plugin nativo SOLO se siamo su un dispositivo.
    // Usiamo controlli molto difensivi per evitare che errori qui blocchino l'app.
    let isNative = false;
    try {
        isNative = Capacitor.isNativePlatform();
    } catch (e) {
        console.warn("Capacitor check failed", e);
        isNative = false;
    }

    if (isNative) {
        try {
            if (onStatusUpdate) onStatusUpdate("Richiesta Nativa...");
            addLog(`[NATIVE] Tentativo GET: ${uniqueUrl}`);
            
            // Verifica difensiva: CapacitorHttp esiste?
            if (CapacitorHttp && typeof CapacitorHttp.get === 'function') {
                const response = await CapacitorHttp.get({
                    url: uniqueUrl,
                    responseType: 'blob' // Importante per file binari/zip
                });

                if (response.status >= 200 && response.status < 300) {
                    addLog(`[NATIVE] Successo (${response.status})`);
                    
                    // CapacitorHttp 'blob' ritorna i dati in base64 dentro 'data' su Android
                    const base64Data = response.data;
                    
                    // Conversione Base64 -> Blob
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray]);

                    return new Response(blob, {
                        status: response.status,
                        statusText: "OK"
                    });

                } else {
                    // Se fallisce (es. 404), lanciamo errore per provare il fallback web
                    throw new Error(`Native HTTP Error ${response.status}`);
                }
            } else {
                addLog("[WARN] Plugin CapacitorHttp non trovato o non caricato. Skip.");
            }
        } catch (nativeErr: any) {
            addLog(`[WARN] Native fetch fallita: ${nativeErr.message}. Fallback a Web.`);
            // Il codice continua qui sotto al blocco Web
        }
    }

    // --- TENTATIVO 2: WEB STANDARD (FALLBACK / BROWSER) ---
    let finalUrl = uniqueUrl;
    
    // Se abbiamo un proxy configurato o dobbiamo usare quello pubblico
    if (customProxyUrl && customProxyUrl.trim() !== '') {
        const separator = customProxyUrl.includes('?') ? '&' : '?';
        finalUrl = `${customProxyUrl}${separator}url=${encodeURIComponent(uniqueUrl)}`;
    } else if (!isNative) {
        // Se siamo su Browser e fallisce il diretto, usiamo proxy pubblico come ultima spiaggia
        finalUrl = `https://corsproxy.io/?url=${encodeURIComponent(uniqueUrl)}`;
    }

    if (onStatusUpdate) onStatusUpdate(`Connessione Web...`);
    addLog(`[WEB] Fetching: ${finalUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
        const response = await fetch(finalUrl, { 
            cache: "no-store", 
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (e: any) {
        clearTimeout(timeoutId);
        throw e;
    }
}

// Strumento di test
export const testProxyConnection = async (proxyUrl: string): Promise<{ success: boolean; msg: string }> => {
    try {
        const testTarget = "https://www.google.com";
        await fetchViaProxy(testTarget, proxyUrl);
        return { success: true, msg: "Connessione OK" };
    } catch (e: any) {
        return { success: false, msg: `Errore: ${e.message}` };
    }
};

export interface CheckResult {
    hasUpdate: boolean;
    remoteDateStr?: string;
    error?: string;
    updateSource: 'TXT' | 'ZIP';
    zipBlob?: Blob; 
    txtContent?: string;
}

export interface ParsedUpdateContent {
    indexDateStr?: string;
    appVersionStr?: string;
    appDownloadUrl?: string;
    versionInfo?: string;
}

// Memorizza temporaneamente il contenuto di Ebook_update.txt per evitare doppie chiamate di rete
let cachedUpdateFileText: string | null = null;

export const parseUpdateFileContent = (content: string): ParsedUpdateContent => {
    const lines = content.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0);
    let indexDateStr: string | undefined;
    let appVersionStr: string | undefined;
    let appDownloadUrl: string | undefined;
    let versionInfo: string | undefined;

    for (const line of lines) {
        const sepIdx = line.search(/[;:]/);
        if (sepIdx !== -1) {
            const key = line.substring(0, sepIdx).trim().toUpperCase();
            let val = line.substring(sepIdx + 1).replace(/^[;:\s]+/, '').trim();

            if (key.includes('INDEX')) {
                indexDateStr = val;
            } else if (key.includes('APPURL') || key.includes('APP_URL') || key.includes('APK') || key.includes('URL_APP')) {
                // Gestisce casi come "AppUrl;;" o stringhe senza link: viene considerato non specificato
                const cleanUrl = val.replace(/[;:\s]+$/, '').trim();
                if (cleanUrl.toLowerCase().startsWith('http')) {
                    appDownloadUrl = cleanUrl;
                }
            } else if (key.includes('VERSIONINFO') || key.includes('VERSION_INFO') || key.includes('CHANGELOG') || key === 'INFO' || key === 'DESC') {
                const cleanInfo = val.replace(/[;:\s]+$/, '').trim();
                if (cleanInfo.length > 0) {
                    versionInfo = cleanInfo;
                }
            } else if (key.includes('VER') || key.includes('APP')) {
                const match = val.replace(',', '.').match(/(\d+(\.\d+)*)/);
                appVersionStr = match ? match[0] : val;
            }
        }
    }

    // Se appVersionStr non è ancora stato trovato, cerca righe con VER o numero di versione
    if (!appVersionStr) {
        for (const line of lines) {
            if (/VER/i.test(line) && !/APPURL/i.test(line) && !/VERSIONINFO/i.test(line)) {
                const match = line.replace(',', '.').match(/(\d+(\.\d+)*)/);
                if (match) {
                    appVersionStr = match[0];
                    break;
                }
            }
        }
    }

    // Fallback: se indexDateStr non ha la parola INDEX, verifica se una riga contiene una data valida (vecchio Last_Update.txt)
    if (!indexDateStr) {
        for (const line of lines) {
            const sepIdx = line.indexOf(';');
            if (sepIdx !== -1) {
                const candidate = line.substring(sepIdx + 1).trim();
                if (parseCustomDate(candidate)) {
                    indexDateStr = candidate;
                    break;
                }
            }
        }
    }

    addLog(`[DEBUG] Update parse -> Data: ${indexDateStr || 'NON TROVATA'}, Versione: ${appVersionStr || 'NON TROVATA'}, AppUrl: ${appDownloadUrl || 'NON SPECIFICATO'}, Info: ${versionInfo || 'NESSUNA'}`);

    return { indexDateStr, appVersionStr, appDownloadUrl, versionInfo };
};

export const checkAppVersion = async (
    currentVersion: string,
    zipBlob?: Blob
): Promise<{ hasUpdate: boolean; remoteVersionStr?: string; appDownloadUrl?: string; versionInfo?: string; error?: string }> => {
    try {
        const settings = loadSettings();
        let remoteVersion = '';
        let fileAppUrl: string | undefined;
        let fileVersionInfo: string | undefined;

        // 1. Controlla prima se abbiamo già letto Ebook_update.txt in questa sessione
        if (cachedUpdateFileText) {
            const parsed = parseUpdateFileContent(cachedUpdateFileText);
            if (parsed.appVersionStr) {
                remoteVersion = parsed.appVersionStr;
            }
            if (parsed.appDownloadUrl) {
                fileAppUrl = parsed.appDownloadUrl;
            }
            if (parsed.versionInfo) {
                fileVersionInfo = parsed.versionInfo;
            }
        }

        // 2. Se non ancora trovata, prova a scaricare direttamente da lastUpdateUrl (Ebook_update.txt)
        if (!remoteVersion && settings.lastUpdateUrl && settings.lastUpdateUrl.trim() !== '') {
            try {
                const response = await fetchViaProxy(settings.lastUpdateUrl, settings.customProxyUrl);
                if (response.ok) {
                    const text = await response.text();
                    cachedUpdateFileText = text;
                    const parsed = parseUpdateFileContent(text);
                    if (parsed.appVersionStr) {
                        remoteVersion = parsed.appVersionStr;
                    }
                    if (parsed.appDownloadUrl) {
                        fileAppUrl = parsed.appDownloadUrl;
                    }
                    if (parsed.versionInfo) {
                        fileVersionInfo = parsed.versionInfo;
                    }
                }
            } catch (e) {
                // Ignore e continua con fallback
            }
        }

        // 3. Fallback: cerca all'interno dello ZIP (se fornito)
        if (!remoteVersion && zipBlob) {
            try {
                const zip = await JSZip.loadAsync(zipBlob);
                const appVersionFileKey = Object.keys(zip.files).find(name => 
                    (name.endsWith("AppVersion.txt") || name.endsWith("Ebook_update.txt")) && !name.includes("__MACOSX")
                );
                if (appVersionFileKey) {
                    const content = await zip.file(appVersionFileKey)?.async("string");
                    if (content) {
                        const parsed = parseUpdateFileContent(content);
                        remoteVersion = parsed.appVersionStr || content.trim();
                        if (parsed.appDownloadUrl) {
                            fileAppUrl = parsed.appDownloadUrl;
                        }
                        if (parsed.versionInfo) {
                            fileVersionInfo = parsed.versionInfo;
                        }
                    }
                }
            } catch {
                // Ignora se non è uno zip
            }
        }

        // 4. Se ancora non trovato e abbiamo folderUrl
        if (!remoteVersion && settings.folderUrl && !zipBlob) {
            try {
                const response = await fetchViaProxy(settings.folderUrl, settings.customProxyUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    try {
                        const zip = await JSZip.loadAsync(blob);
                        const appVersionFileKey = Object.keys(zip.files).find(name => 
                            (name.endsWith("AppVersion.txt") || name.endsWith("Ebook_update.txt")) && !name.includes("__MACOSX")
                        );
                        if (appVersionFileKey) {
                            const content = await zip.file(appVersionFileKey)?.async("string");
                            if (content) {
                                const parsed = parseUpdateFileContent(content);
                                remoteVersion = parsed.appVersionStr || content.trim();
                                if (parsed.appDownloadUrl) {
                                    fileAppUrl = parsed.appDownloadUrl;
                                }
                                if (parsed.versionInfo) {
                                    fileVersionInfo = parsed.versionInfo;
                                }
                            }
                        }
                    } catch {
                        // Non è uno zip
                    }
                }
            } catch (e) {
                addLog(`[WARN] AppVersion check fallito: ${e}`);
            }
        }

        // Link dal file Ebook_update.txt (riga AppUrl;...)
        const effectiveAppUrl = (fileAppUrl && fileAppUrl.startsWith('http')) ? fileAppUrl : undefined;

        if (remoteVersion) {
            const extractVersion = (v: string) => {
                const firstLine = v.split('\n').find(line => line.trim().length > 0) || '';
                const match = firstLine.replace(',', '.').match(/(\d+(\.\d+)*)/);
                return match ? match[0] : '';
            };

            const cClean = extractVersion(currentVersion); 
            const rClean = extractVersion(remoteVersion);

            if (rClean && rClean !== cClean) {
                const cvParts = cClean.split('.').map(Number);
                const rvParts = rClean.split('.').map(Number);
                
                let isNewer = false;
                for (let i = 0; i < Math.max(cvParts.length, rvParts.length); i++) {
                    const c = cvParts[i] || 0;
                    const r = rvParts[i] || 0;
                    if (r > c) {
                        isNewer = true;
                        break;
                    } else if (r < c) {
                        isNewer = false;
                        break;
                    }
                }
                
                if (isNewer) {
                    return { hasUpdate: true, remoteVersionStr: rClean, appDownloadUrl: effectiveAppUrl, versionInfo: fileVersionInfo };
                }
            }
            return { hasUpdate: false, remoteVersionStr: rClean, appDownloadUrl: effectiveAppUrl, versionInfo: fileVersionInfo };
        }
        return { hasUpdate: false };
    } catch (e: any) {
        return { hasUpdate: false, error: e.message };
    }
};

// CHECK VERSION LOGIC
export const checkVersion = async (
    currentDateStr: string,
    onStatusUpdate?: (status: string) => void
): Promise<CheckResult> => {
    
    const settings = loadSettings();
    if (!settings.folderUrl && !settings.lastUpdateUrl) {
        return { hasUpdate: false, error: 'MISSING_URL', updateSource: 'ZIP' };
    }

    // Reset cache per questa esecuzione
    cachedUpdateFileText = null;

    // METODO 1: CONTROLLO Ebook_update.txt (o Last_Update.txt)
    if (settings.lastUpdateUrl && settings.lastUpdateUrl.trim() !== '') {
        try {
            if (onStatusUpdate) onStatusUpdate("Check Ebook_update.txt...");
            const response = await fetchViaProxy(settings.lastUpdateUrl, settings.customProxyUrl, onStatusUpdate);
            
            if (response.ok) {
                const text = await response.text();
                cachedUpdateFileText = text;
                addLog(`[DEBUG] Ebook_update: ${text.replace(/\r?\n/g, ' | ').substring(0, 50)}...`);
                
                const parsed = parseUpdateFileContent(text);
                if (parsed.indexDateStr) {
                    const remoteDateStr = parsed.indexDateStr;
                    const remoteDate = parseCustomDate(remoteDateStr);
                    const currentDate = parseCustomDate(currentDateStr);
                    
                    if (remoteDate && currentDate && remoteDate > currentDate) {
                        return { hasUpdate: true, remoteDateStr, updateSource: 'TXT', txtContent: text };
                    } else if (remoteDate) {
                        return { hasUpdate: false, remoteDateStr, updateSource: 'TXT', txtContent: text };
                    }
                }
            }
        } catch (e) {
            addLog(`[WARN] Check Ebook_update fallito: ${e}`);
        }
    }

    if (!settings.folderUrl || settings.folderUrl.trim() === '') {
        return { hasUpdate: false, error: 'MISSING_URL', updateSource: 'TXT' };
    }

    // METODO 2: CONTROLLO COMPLETO (Fallback: Scarica da folderUrl sia come ZIP che come TXT)
    try {
        if (onStatusUpdate) onStatusUpdate("Check Indice...");
        const response = await fetchViaProxy(settings.folderUrl, settings.customProxyUrl, onStatusUpdate);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size < 5) throw new Error("File troppo piccolo");

        // 1. Proviamo come archivio ZIP
        try {
            if (onStatusUpdate) onStatusUpdate("Lettura...");
            const zip = await JSZip.loadAsync(blob);
            const fileDataKey = Object.keys(zip.files).find(name => 
                (name.includes("Ebook_Index") || name.endsWith(".csv") || name.endsWith(".txt")) && !name.includes("__MACOSX")
            );
            
            if (fileDataKey) {
                const content = await zip.file(fileDataKey)?.async("string");
                if (content) {
                    const firstLine = content.split('\n')[0];
                    const parts = firstLine.split(';');
                    if (parts.length >= 2) {
                        const remoteDateStr = parts[1].trim();
                        const remoteDate = parseCustomDate(remoteDateStr);
                        const currentDate = parseCustomDate(currentDateStr);

                        if (remoteDate && currentDate && remoteDate > currentDate) {
                             return { hasUpdate: true, remoteDateStr, updateSource: 'ZIP', zipBlob: blob };
                        } else {
                             return { hasUpdate: false, remoteDateStr, updateSource: 'ZIP', zipBlob: blob };
                        }
                    }
                }
            }
        } catch {
            // Non è uno zip, proviamo come file di testo diretto
        }

        // 2. Lettura diretta come file di testo (es. Ebook_index.txt)
        const textContent = await blob.text();
        const firstLine = textContent.split('\n')[0];
        const parts = firstLine.split(';');
        if (parts.length >= 2) {
            const remoteDateStr = parts[1].trim();
            const remoteDate = parseCustomDate(remoteDateStr);
            const currentDate = parseCustomDate(currentDateStr);

            if (remoteDate && currentDate && remoteDate > currentDate) {
                 return { hasUpdate: true, remoteDateStr, updateSource: 'TXT', txtContent: textContent };
            } else {
                 return { hasUpdate: false, remoteDateStr, updateSource: 'TXT', txtContent: textContent };
            }
        }

        return { hasUpdate: false, error: "Formato indice non riconosciuto", updateSource: 'TXT' };

    } catch (e: any) {
        return { hasUpdate: false, error: e.message, updateSource: 'ZIP' };
    }
};

// DOWNLOAD LOGIC
export const performDownload = async (
    cachedBlob?: Blob,
    onStatusUpdate?: (status: string) => void
): Promise<string> => {
    
    const settings = loadSettings();
    let blob = cachedBlob;

    if (!blob) {
        if (onStatusUpdate) onStatusUpdate("Download indice...");
        const response = await fetchViaProxy(settings.folderUrl, settings.customProxyUrl, onStatusUpdate);
        if (!response.ok) throw new Error("Download fallito");
        blob = await response.blob();
    }

    if (onStatusUpdate) onStatusUpdate("Elaborazione indice...");
    
    // 1. Prova estrazione da ZIP
    try {
        const zip = await JSZip.loadAsync(blob);
        const fileDataKey = Object.keys(zip.files).find(name => 
            (name.includes("Ebook_Index") || name.endsWith(".csv") || name.endsWith(".txt")) && !name.includes("__MACOSX")
        );
        
        if (fileDataKey) {
            const content = await zip.file(fileDataKey)?.async("string");
            if (content && content.trim().length > 0) {
                return content;
            }
        }
    } catch {
        // Non è uno ZIP valido, procede come file di testo diretto
    }

    // 2. Lettura diretta come file di testo puro (es. Ebook_index.txt)
    const textContent = await blob.text();
    if (textContent && textContent.trim().length > 0) {
        return textContent;
    }

    throw new Error("File indice non trovato o vuoto");
};

export const applyUpdate = (content: string) => {
    try {
        saveRawIndex(content);
        const lines = content.split('\n');
        const dateStr = lines[0].split(';')[1] || '???';
        addLog(`Aggiornamento applicato: ${dateStr}`);
    } catch (e: any) {
        addLog(`Errore salvataggio: ${e.message}`);
        throw e;
    }
};

export const checkForUpdatesAndDownload = async (currentDate: string, cb?: any) => {
    return { hasUpdate: false }; 
};