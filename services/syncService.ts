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

// CHECK VERSION LOGIC
export const checkVersion = async (
    currentDateStr: string,
    onStatusUpdate?: (status: string) => void
): Promise<CheckResult> => {
    
    const settings = loadSettings();
    if (!settings.folderUrl) return { hasUpdate: false, error: 'MISSING_URL', updateSource: 'ZIP' };

    // METODO 1: CONTROLLO LEGGERO (Last_Update.txt)
    if (settings.lastUpdateUrl && settings.lastUpdateUrl.trim() !== '') {
        try {
            if (onStatusUpdate) onStatusUpdate("Check File Versione...");
            // Nota: Anche qui userà fetchViaProxy che tenterà il metodo Nativo
            const response = await fetchViaProxy(settings.lastUpdateUrl, settings.customProxyUrl, onStatusUpdate);
            
            if (response.ok) {
                const text = await response.text();
                addLog(`[DEBUG] Last_Update: ${text.substring(0,20)}...`);
                
                const parts = text.split(';');
                if (parts.length >= 2) {
                    const remoteDateStr = parts[1].trim();
                    const remoteDate = parseCustomDate(remoteDateStr);
                    const currentDate = parseCustomDate(currentDateStr);
                    
                    if (remoteDate && currentDate && remoteDate > currentDate) {
                        return { hasUpdate: true, remoteDateStr, updateSource: 'TXT', txtContent: text };
                    } else if (remoteDate) {
                        return { hasUpdate: false, remoteDateStr, updateSource: 'TXT' };
                    }
                }
            }
        } catch (e) {
            addLog(`[WARN] Check Light fallito: ${e}`);
        }
    }

    // METODO 2: CONTROLLO COMPLETO (Fallback: Scarica ZIP e controlla header)
    try {
        if (onStatusUpdate) onStatusUpdate("Check Indice Full...");
        const response = await fetchViaProxy(settings.folderUrl, settings.customProxyUrl, onStatusUpdate);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        if (blob.size < 100) throw new Error("File troppo piccolo");

        // Leggi ZIP
        if (onStatusUpdate) onStatusUpdate("Lettura ZIP...");
        const zip = await JSZip.loadAsync(blob);
        const fileDataKey = Object.keys(zip.files).find(name => name.includes("Ebook_Index") || name.endsWith(".csv"));
        
        if (!fileDataKey) throw new Error("File indice non trovato nello ZIP");
        
        const content = await zip.file(fileDataKey)?.async("string");
        if (!content) throw new Error("ZIP illeggibile");

        const firstLine = content.split('\n')[0];
        const parts = firstLine.split(';');
        if (parts.length < 2) throw new Error("Header non valido");

        const remoteDateStr = parts[1].trim();
        const remoteDate = parseCustomDate(remoteDateStr);
        const currentDate = parseCustomDate(currentDateStr);

        if (remoteDate && currentDate && remoteDate > currentDate) {
             return { hasUpdate: true, remoteDateStr, updateSource: 'ZIP', zipBlob: blob };
        } else {
             return { hasUpdate: false, remoteDateStr, updateSource: 'ZIP' };
        }

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
        if (onStatusUpdate) onStatusUpdate("Download ZIP...");
        const response = await fetchViaProxy(settings.folderUrl, settings.customProxyUrl, onStatusUpdate);
        if (!response.ok) throw new Error("Download fallito");
        blob = await response.blob();
    }

    if (onStatusUpdate) onStatusUpdate("Estrazione...");
    const zip = await JSZip.loadAsync(blob);
    const fileDataKey = Object.keys(zip.files).find(name => name.includes("Ebook_Index") || name.endsWith(".csv"));
    
    if (!fileDataKey) throw new Error("Indice non trovato");
    
    const content = await zip.file(fileDataKey)?.async("string");
    return content || "";
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