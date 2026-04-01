import React, { useState, useEffect } from 'react';
import { X, Save, Link as LinkIcon, FolderOpen, Terminal, ChevronRight, ChevronDown, Sliders, Database, Network, ArrowLeft, CloudCog, FileText, Activity, QrCode, Download, CheckCircle2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { loadSettings, saveSettings, exportBackupData, importBackupData, getLastBackupInfo, saveLastBackupInfo, BackupInfo } from '../services/csvService';
import { getLogs, clearLogs, testProxyConnection } from '../services/syncService';
import { AppSettings } from '../types';
import { STORAGE_KEY_NOTE } from '../constants';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hideLogs?: boolean;
  onSave?: (settings: AppSettings) => void;
  onDataRestored?: () => void;
}

interface BackupSuccessState {
    isOpen: boolean;
    mode: 'EXPORT' | 'IMPORT';
    filename: string;
    resultLabel: string;
}

type SettingsView = 'MAIN' | 'DOWNLOAD_SETTINGS';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, hideLogs = false, onSave, onDataRestored }) => {
  const [currentView, setCurrentView] = useState<SettingsView>('MAIN');

  const [uiOpacity, setUiOpacity] = useState(0.3);
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Dropbox Folders
  const [tempUrlInput, setTempUrlInput] = useState(''); 
  const [hasConfiguredUrl, setHasConfiguredUrl] = useState(false); 
  
  // Last Update URL (NEW)
  const [tempUpdateUrl, setTempUpdateUrl] = useState('');
  
  // Proxy
  const [tempProxyInput, setTempProxyInput] = useState('');
  const [hasConfiguredProxy, setHasConfiguredProxy] = useState(false);
  const [isTestingProxy, setIsTestingProxy] = useState(false); 

  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  
  const [exportPreviewMode, setExportPreviewMode] = useState(false); 
  const [pendingFilename, setPendingFilename] = useState('');
  const [diskSaveConfirm, setDiskSaveConfirm] = useState<{filename: string} | null>(null);
  const [importConfirm, setImportConfirm] = useState<{name: string, content: string} | null>(null);

  const [showDbInspector, setShowDbInspector] = useState(false);
  const [inspectorContent, setInspectorContent] = useState('');
  const [inspectorCount, setInspectorCount] = useState(0);

  const [backupSuccess, setBackupSuccess] = useState<BackupSuccessState>({ isOpen: false, mode: 'EXPORT', filename: '', resultLabel: '' });
  
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showUpdateUrlInput, setShowUpdateUrlInput] = useState(false); // New accordion
  const [showProxyInput, setShowProxyInput] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  
  const [showVisuals, setShowVisuals] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrInput, setQrInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowBackup(false);
      setShowVisuals(false);
      setShowUrlInput(false);
      setShowUpdateUrlInput(false);
      setShowProxyInput(false);
      setShowConsole(false);
      setShowQrCode(false);
      setQrInput('');
      setCurrentView('MAIN');

      const settings = loadSettings();
      
      const currentUrl = settings.folderUrl || '';
      setHasConfiguredUrl(currentUrl.trim().length > 0);
      setTempUrlInput(''); 

      setTempUpdateUrl(settings.lastUpdateUrl || '');

      const currentProxy = settings.customProxyUrl || '';
      setHasConfiguredProxy(currentProxy.trim().length > 0);
      setTempProxyInput(currentProxy); 

      setUiOpacity(settings.uiOpacity !== undefined ? settings.uiOpacity : 0.3);
      setDebugMode(settings.debugMode || false);
      setExportPreviewMode(false);
      setImportConfirm(null);
      setDiskSaveConfirm(null);
      setShowDbInspector(false);
      setIsTestingProxy(false);
      
      setLastBackup(getLastBackupInfo());

      if (!hideLogs) {
          setLogs(getLogs());
      }
    }
  }, [isOpen, hideLogs]);

  const handleSaveUrlOnly = () => {
      let url = tempUrlInput.trim();
      if (!url.startsWith('http')) {
          alert("Inserisci un link valido");
          return;
      }
      const currentSettings = loadSettings();
      const newSettings: AppSettings = { ...currentSettings, folderUrl: url };
      saveSettings(newSettings);
      setHasConfiguredUrl(true);
      setTempUrlInput(''); 
      alert("Link Dropbox salvato.");
  };

  const handleSaveUpdateUrlOnly = () => {
      const currentSettings = loadSettings();
      const newSettings: AppSettings = { ...currentSettings, lastUpdateUrl: tempUpdateUrl.trim() };
      saveSettings(newSettings);
      alert("Link Versione salvato.");
  };

  const handleSaveProxyOnly = () => {
      let proxy = tempProxyInput.trim();
      if (proxy.length > 0) {
          if (proxy.includes('@')) {
              alert("L'URL contiene una '@' (email?). Usa il link pubblico.");
              return;
          }
          if (!proxy.startsWith('http')) proxy = 'https://' + proxy;
      } else {
           // Se vuoto, lo accettiamo (rimuove il proxy)
      }

      const currentSettings = loadSettings();
      const newSettings: AppSettings = { ...currentSettings, customProxyUrl: proxy };
      saveSettings(newSettings);
      setHasConfiguredProxy(proxy.length > 0);
      setTempProxyInput(proxy);
      alert(proxy.length > 0 ? "Proxy salvato." : "Proxy rimosso. Userà pubblico.");
  };

  const handleTestProxy = async () => {
      const proxy = tempProxyInput.trim() || loadSettings().customProxyUrl;
      // Se vuoto, testiamo il fallback pubblico
      const proxyToTest = proxy || '';
      
      setIsTestingProxy(true);
      const res = await testProxyConnection(proxyToTest);
      setIsTestingProxy(false);
      
      alert(res.msg);
  };

  const handleDownloadQrCode = () => {
    const canvas = document.getElementById('qr-gen') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'qrcode.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };
  
  const handleSave = () => {
    const currentSettings = loadSettings();
    
    let urlToSave = currentSettings.folderUrl;
    if (tempUrlInput.trim().startsWith('http')) urlToSave = tempUrlInput.trim();

    let proxyToSave = currentSettings.customProxyUrl;
    // Se l'input è stato toccato, usiamo quello, altrimenti manteniamo il vecchio
    // Qui semplifichiamo: se l'utente ha scritto qualcosa in tempProxyInput usiamo quello
    // Se è vuoto ma hasConfiguredProxy è false, salviamo vuoto.
    if (tempProxyInput !== currentSettings.customProxyUrl) {
         let p = tempProxyInput.trim();
         if (p.length > 0 && !p.startsWith('http')) p = 'https://' + p;
         proxyToSave = p;
    }

    const newSettings: AppSettings = { 
        folderUrl: urlToSave,
        lastUpdateUrl: tempUpdateUrl.trim(),
        customProxyUrl: proxyToSave,
        uiOpacity,
        debugMode
    };
    
    saveSettings(newSettings);
    if (onSave) onSave(newSettings);
    onClose();
  };

  const handleClearLogs = (e: React.MouseEvent) => {
      e.stopPropagation();
      clearLogs();
      setLogs([]);
  };

  // ... [INSPECTOR, EXPORT, IMPORT functions] (Keeping existing logic)
  const handleOpenInspector = () => {
    const raw = localStorage.getItem(STORAGE_KEY_NOTE);
    if (!raw) { setInspectorContent("{}"); setInspectorCount(0); }
    else {
        try { const p = JSON.parse(raw); setInspectorCount(Object.keys(p).length); setInspectorContent(JSON.stringify(p, null, 2)); }
        catch (e) { setInspectorContent("Err"); }
    }
    setShowDbInspector(true);
  };
  const handleExportSharePrepare = () => { setPendingFilename(`backup_${new Date().toISOString().split('T')[0]}.json`); setExportPreviewMode(true); };
  const handleExportShareExecute = async () => {
      const json = exportBackupData();
      const filename = pendingFilename;
      try {
        const res = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Backup', files: [res.uri] });
        saveLastBackupInfo(filename); setLastBackup(getLastBackupInfo()); setExportPreviewMode(false); setBackupSuccess({ isOpen: true, mode: 'EXPORT', filename, resultLabel: 'Condiviso' });
      } catch (e:any) { alert("Errore Export: " + e.message); }
  };
  const handleSaveDiskPrepare = () => { setDiskSaveConfirm({ filename: `backup_${new Date().toISOString().split('T')[0]}.json` }); };
  const handleSaveDiskExecute = async () => {
      if(!diskSaveConfirm) return;
      try {
          await Filesystem.writeFile({ path: diskSaveConfirm.filename, data: exportBackupData(), directory: Directory.Documents, encoding: Encoding.UTF8 });
          saveLastBackupInfo(diskSaveConfirm.filename); setLastBackup(getLastBackupInfo()); setDiskSaveConfirm(null); setBackupSuccess({ isOpen: true, mode: 'EXPORT', filename: diskSaveConfirm.filename, resultLabel: 'Salvato' });
      } catch(e:any) { alert("Errore: " + e.message); }
  };
  const decodeBase64 = (str: string) => {
    try { return new TextDecoder('utf-8').decode(Uint8Array.from(atob(str), c => c.charCodeAt(0))); } catch { return ""; }
  };
  const handleImportClick = async () => {
      try {
          const res = await FilePicker.pickFiles({ types: ['application/json'], readData: true });
          if(res.files[0]?.data) setImportConfirm({ name: res.files[0].name, content: decodeBase64(res.files[0].data) });
      } catch {}
  };
  const handleExecuteImport = () => {
      if(!importConfirm) return;
      if(importBackupData(importConfirm.content)) {
           const s = loadSettings(); setUiOpacity(s.uiOpacity||0.3); setDebugMode(s.debugMode||false); setHasConfiguredUrl(!!s.folderUrl); setHasConfiguredProxy(!!s.customProxyUrl); setTempUpdateUrl(s.lastUpdateUrl||'');
           if(onSave) onSave(s); if(onDataRestored) onDataRestored();
           setBackupSuccess({ isOpen: true, mode: 'IMPORT', filename: importConfirm.name, resultLabel: 'Successo' });
      } else alert("Backup non valido");
      setImportConfirm(null);
  };


  const showLinkSaveButton = tempUrlInput.trim().toLowerCase().startsWith('http');
  const showProxySaveButton = tempProxyInput.trim().length > 0; // Show save if text present

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Disk Save Confirm Modal */}
      {diskSaveConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center gap-4">
                  <Database className="w-8 h-8 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">Salva su Disco</h3>
                  <p className="text-sm text-slate-300">Vuoi salvare il backup nella cartella Documenti del tuo dispositivo?</p>
                  <p className="text-xs font-mono text-emerald-400 bg-slate-950 p-2 rounded w-full break-all">{diskSaveConfirm.filename}</p>
                  <div className="flex gap-3 w-full mt-2">
                      <button onClick={() => setDiskSaveConfirm(null)} className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Annulla</button>
                      <button onClick={handleSaveDiskExecute} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">Salva</button>
                  </div>
              </div>
          </div>
      )}

      {/* Import Confirm Modal */}
      {importConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center gap-4">
                  <Database className="w-8 h-8 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Importa Backup</h3>
                  <p className="text-sm text-slate-300">Vuoi sovrascrivere i dati attuali con questo backup? L'operazione non è reversibile.</p>
                  <p className="text-xs font-mono text-orange-400 bg-slate-950 p-2 rounded w-full break-all">{importConfirm.name}</p>
                  <div className="flex gap-3 w-full mt-2">
                      <button onClick={() => setImportConfirm(null)} className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">Annulla</button>
                      <button onClick={handleExecuteImport} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors">Importa</button>
                  </div>
              </div>
          </div>
      )}

      {/* DB Inspector Modal */}
      {showDbInspector && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                      <div className="flex items-center gap-2 text-white">
                          <Database className="w-5 h-5 text-purple-400" />
                          <h2 className="text-lg font-bold">DB Inspector</h2>
                      </div>
                      <button onClick={() => setShowDbInspector(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-4 flex flex-col gap-2 overflow-hidden flex-1">
                      <p className="text-xs text-slate-400">Elementi totali: <span className="text-white font-bold">{inspectorCount}</span></p>
                      <textarea 
                          readOnly 
                          value={inspectorContent} 
                          className="w-full flex-1 bg-black border border-slate-700 rounded p-3 text-[10px] text-green-400 font-mono resize-none focus:outline-none"
                      />
                  </div>
                  <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                      <button onClick={() => setShowDbInspector(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                          Chiudi
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Backup Success Modal */}
      {backupSuccess.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-900/30 flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Backup {backupSuccess.resultLabel}</h3>
                  <div className="text-sm text-slate-300 space-y-2">
                      <p>Il file di backup è stato salvato con successo.</p>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800 text-left">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Nome File</p>
                          <p className="font-mono text-emerald-400 break-all">{backupSuccess.filename}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold mt-2 mb-1">Percorso</p>
                          <p className="font-mono text-slate-300 break-all">Cartella Documenti</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => setBackupSuccess({ ...backupSuccess, isOpen: false })}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold transition-colors"
                  >
                      Chiudi
                  </button>
              </div>
          </div>
      )}

      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2 text-white">
            {currentView === 'MAIN' ? (
                <> <LinkIcon className="w-5 h-5 text-emerald-500" /> <h2 className="text-lg font-bold">Configurazione</h2> </>
            ) : (
                <button onClick={() => setCurrentView('MAIN')} className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"> <ArrowLeft className="w-5 h-5" /> <h2 className="text-lg font-bold">Download Settings</h2> </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {currentView === 'MAIN' && (
              <>
                  {/* BACKUP & VISUALS ACCORDIONS (SAME AS BEFORE) */}
                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowBackup(!showBackup)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><Database className="w-4 h-4 text-blue-400" />Backup & Ripristino</div>{showBackup ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showBackup && (
                        <div className="space-y-3 p-3 bg-slate-950/30 rounded border border-slate-800/50">
                             {!exportPreviewMode ? (
                                <>
                                    <div className="flex gap-2">
                                        <button onClick={handleExportSharePrepare} className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded-lg text-[10px] text-slate-300">Condividi</button>
                                        <button onClick={handleSaveDiskPrepare} className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded-lg text-[10px] text-slate-300">Salva Disco</button>
                                        <button onClick={handleImportClick} className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded-lg text-[10px] text-slate-300">Importa</button>
                                    </div>
                                    <button onClick={handleOpenInspector} className="w-full py-1.5 border border-slate-700 rounded text-slate-500 text-[10px] mt-2">DB Inspector</button>
                                </>
                             ) : (
                                <div className="text-center text-slate-400 text-xs">
                                     <p>Confermi export?</p>
                                     <div className="flex gap-2 mt-2"><button onClick={()=>setExportPreviewMode(false)} className="flex-1 py-2 border rounded">No</button><button onClick={handleExportShareExecute} className="flex-1 py-2 bg-emerald-600 text-white rounded">Si</button></div>
                                </div>
                             )}
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowVisuals(!showVisuals)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><Sliders className="w-4 h-4 text-emerald-400" />Aspetto</div>{showVisuals ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showVisuals && ( <div className="p-3 bg-slate-950/30 rounded border border-slate-800/50"> <input type="range" min="0" max="1" step="0.05" value={uiOpacity} onChange={(e) => setUiOpacity(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"/> </div> )}
                  </div>

                  {/* QR CODE GENERATOR */}
                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowQrCode(!showQrCode)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><QrCode className="w-4 h-4 text-sky-400" />Generatore QR Code</div>{showQrCode ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showQrCode && (
                        <div className="space-y-3 p-3 bg-slate-950/30 rounded border border-slate-800/50 flex flex-col items-center">
                            <input 
                                type="text" 
                                value={qrInput} 
                                onChange={(e) => setQrInput(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200" 
                                placeholder="Inserisci testo o link..." 
                            />
                            {qrInput.trim() !== '' && (
                                <div className="flex flex-col items-center gap-3 mt-2 bg-white p-3 rounded-lg">
                                    <QRCodeCanvas 
                                        id="qr-gen"
                                        value={qrInput} 
                                        size={150} 
                                        level={"H"}
                                        includeMargin={true}
                                    />
                                    <button 
                                        onClick={handleDownloadQrCode} 
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors w-full justify-center"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Scarica Immagine
                                    </button>
                                </div>
                            )}
                        </div>
                      )}
                  </div>

                  <button onClick={() => setCurrentView('DOWNLOAD_SETTINGS')} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                      <div className="flex items-center gap-2"><CloudCog className="w-4 h-4 text-purple-400" />Index Download</div><ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
              </>
          )}

          {currentView === 'DOWNLOAD_SETTINGS' && (
              <div className="flex flex-col gap-4">
                  {/* DROPBOX FOLDER */}
                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowUrlInput(!showUrlInput)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-emerald-400" />Cartella Dropbox</div>{showUrlInput ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showUrlInput && (
                        <div className="space-y-3 p-2 bg-slate-950/30 rounded border border-slate-800/50">
                            <div className="flex justify-between px-1 text-[11px] text-slate-400"><span>Stato:</span>{hasConfiguredUrl ? <span className="text-emerald-400 font-bold">Configurato</span> : <span className="text-red-400">Mancante</span>}</div>
                            <div className="relative"><textarea value={tempUrlInput} onChange={(e) => setTempUrlInput(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 h-16 resize-none" placeholder="https://dropbox.com/scl/fo/..."/>{showLinkSaveButton && (<button onClick={handleSaveUrlOnly} className="absolute bottom-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">Salva</button>)}</div>
                        </div>
                      )}
                  </div>

                  {/* LAST UPDATE URL (NEW) */}
                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowUpdateUrlInput(!showUpdateUrlInput)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" />File Versione (Opzionale)</div>{showUpdateUrlInput ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showUpdateUrlInput && (
                        <div className="space-y-3 p-2 bg-slate-950/30 rounded border border-slate-800/50 animate-in fade-in slide-in-from-top-2">
                            <p className="text-[10px] text-slate-500 leading-tight">Link diretto a <b>Last_Update.txt</b>. Se presente, l'app scaricherà solo questo file per controllare gli aggiornamenti.</p>
                            <div className="flex flex-col gap-2">
                                <input type="text" value={tempUpdateUrl} onChange={(e) => setTempUpdateUrl(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 font-mono" placeholder="https://dropbox.com/.../Last_Update.txt?dl=1" />
                                <button onClick={handleSaveUpdateUrlOnly} className="self-end bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-bold">Salva Link Versione</button>
                            </div>
                        </div>
                      )}
                  </div>

                  {/* PROXY */}
                  <div className="flex flex-col gap-2">
                      <button onClick={() => setShowProxyInput(!showProxyInput)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                          <div className="flex items-center gap-2"><Network className="w-4 h-4 text-purple-400" />Proxy Cloudflare</div>{showProxyInput ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {showProxyInput && (
                        <div className="space-y-3 p-2 bg-slate-950/30 rounded border border-slate-800/50">
                             <div className="flex justify-between px-1 text-[11px] text-slate-400"><span>Stato:</span>{hasConfiguredProxy ? <span className="text-emerald-400">Attivo (Custom)</span> : <span>Pubblico (Default)</span>}</div>
                             <input type="text" value={tempProxyInput} onChange={(e) => setTempProxyInput(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 font-mono" placeholder="Lascia vuoto per proxy pubblico..." />
                             <div className="flex justify-end gap-2 items-center">
                                 {/* TEST PROXY BUTTON */}
                                 <button onClick={handleTestProxy} disabled={isTestingProxy} className="flex items-center gap-1 bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs border border-slate-600 hover:bg-slate-600">
                                     {isTestingProxy ? <Activity className="w-3 h-3 animate-spin text-yellow-400" /> : <Activity className="w-3 h-3" />} Test
                                 </button>
                                 <button onClick={handleSaveProxyOnly} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold">Salva</button>
                             </div>
                        </div>
                      )}
                  </div>
                  
                  {/* LOGS */}
                  {!hideLogs && (
                    <div className="flex flex-col gap-2">
                        <button onClick={() => setShowConsole(!showConsole)} className="flex items-center justify-between w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 font-medium text-sm">
                            <div className="flex items-center gap-2"><Terminal className="w-4 h-4 text-orange-400" />Log Sistema</div>{showConsole ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {showConsole && (
                            <div className="flex flex-col gap-2">
                                <div className="w-full bg-black border border-slate-800 rounded p-2 text-[10px] text-green-400 font-mono h-40 overflow-y-auto">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
                                <div className="flex justify-between p-2 bg-slate-950/50 rounded border border-slate-800"><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={debugMode} onChange={e=>setDebugMode(e.target.checked)} className="accent-red-500"/>Debug</label><button onClick={handleClearLogs} className="text-xs text-red-400 border border-slate-700 px-2 py-1 rounded">Clear</button></div>
                            </div>
                        )}
                    </div>
                  )}
              </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-800/30 flex justify-end">
          <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
            <Save className="w-4 h-4" /> Salva & Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};