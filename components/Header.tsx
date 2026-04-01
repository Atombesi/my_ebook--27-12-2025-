import React, { useState, useEffect } from 'react';
import { IndexMetadata, AppSettings } from '../types';
import { DownloadCloud, Settings, Loader2, AlertTriangle, CheckCircle2, ArrowDownToLine, Server, FileArchive, Zap } from 'lucide-react';
import { checkVersion, performDownload, applyUpdate, addLog } from '../services/syncService';
import { SettingsModal } from './SettingsModal';
import { InfoModal } from './InfoModal';
import { loadSettings } from '../services/csvService';

const APP_VERSION = "(Ver. 2.2)";

interface HeaderProps {
  metadata: IndexMetadata | null;
  filteredCount: number;
  totalCount: number;
  onRefreshData: () => void;
  onSettingsSaved: (settings: AppSettings) => void;
  isBusy: boolean;
  uiOpacity: number;
  onDataRestored?: () => void; 
}

interface UpdateState {
    isOpen: boolean;
    date: string;
    zipBlob?: Blob; // Se abbiamo già il blob (metodo classico)
}

export const Header: React.FC<HeaderProps> = ({ 
    metadata, 
    filteredCount, 
    totalCount, 
    onRefreshData, 
    onSettingsSaved, 
    isBusy, 
    uiOpacity,
    onDataRestored 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false); 
  const [confirmModal, setConfirmModal] = useState<UpdateState>({ isOpen: false, date: '' });
  
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isTestMode = metadata?.label?.trim() === 'TEST';

  useEffect(() => {
    const settings = loadSettings();
    if (!settings.folderUrl || settings.folderUrl.trim() === '') {
        setIsOnboarding(true);
        setShowSettings(true);
    }
  }, []);

  const handleCheckFlow = async () => {
    if (isChecking || isDownloading) return;
    setIsChecking(true);
    setUpdateError(false);
    setProgressStatus("Controllo aggiornamenti...");
    
    try {
        const currentDate = metadata?.creationDate || "01-01-2000 00:00";
        
        // FASE 1: CONTROLLO (Txt o Zip Header)
        const result = await checkVersion(currentDate, (status) => setProgressStatus(status));

        // Delay UX
        await new Promise(r => setTimeout(r, 400));
        
        if (result.error === 'MISSING_URL') {
            setIsChecking(false);
            setProgressStatus(null);
            setIsOnboarding(false);
            setShowSettings(true);
            return;
        }

        if (result.error) {
            setUpdateError(true);
            addLog(`Error check: ${result.error}`);
            setIsChecking(false);
            setProgressStatus(null);
            return;
        }

        if (!result.hasUpdate) {
            setIsChecking(false);
            setProgressStatus(null);
            alert("Nessun aggiornamento trovato.");
            return;
        }

        // UPDATE FOUND
        setConfirmModal({
            isOpen: true,
            date: result.remoteDateStr || "???",
            zipBlob: result.zipBlob // Sarà undefined se abbiamo usato TXT, popolato se ZIP
        });
        
    } catch (e: any) {
        setUpdateError(true);
        addLog(`CRITICAL CHECK ERROR: ${e.message}`);
    } finally {
        setIsChecking(false);
        setProgressStatus(null);
    }
  };

  const executeDownloadAndApply = async () => {
      setConfirmModal({ isOpen: false, date: '' });
      setIsDownloading(true);
      setProgressStatus("Download in corso...");

      try {
          // FASE 2: DOWNLOAD EFFETTIVO (Se necessario)
          // Se abbiamo zipBlob nel confirmModal, usiamo quello, altrimenti scarichiamo
          const content = await performDownload(confirmModal.zipBlob, (s) => setProgressStatus(s));
          
          setProgressStatus("Salvataggio...");
          applyUpdate(content);
          
          setProgressStatus(null);
          setIsDownloading(false);
          onRefreshData(); // Reload UI
      } catch (e: any) {
          addLog("Errore Download: " + e.message);
          setIsDownloading(false);
          setProgressStatus(null);
          setUpdateError(true);
      }
  };

  const handleSettingsSave = (settings: AppSettings) => {
      onSettingsSaved(settings);
      if (isOnboarding) {
          setIsOnboarding(false); 
          setTimeout(() => {
              handleCheckFlow();
          }, 300);
      }
  };

  const bgStyle = isBusy 
    ? { backgroundColor: 'rgb(234, 179, 8)' }
    : { backgroundColor: `rgba(15, 23, 42, ${uiOpacity})` };

  return (
    <>
      <div 
        className="h-[10%] w-full flex flex-col justify-center px-4 relative overflow-hidden z-30 transition-colors duration-200 ease-in-out"
        style={bgStyle}
      >
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowInfo(true)}
                className="transition-transform active:scale-90 hover:opacity-80 focus:outline-none rounded-full"
                title="Informazioni e Credits"
            >
                <img 
                    src="/logo.png" 
                    alt="App Logo" 
                    className="w-8 h-8 object-cover rounded-full drop-shadow-md"
                    onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'/%3E%3Cpath d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'/%3E%3C/svg%3E";
                    }}
                />
            </button>
            <h1 className="text-xl font-bold tracking-wide text-white drop-shadow-md flex items-baseline gap-2">
                MY_Ebook
                <span className="text-[10px] text-slate-400 font-normal">{APP_VERSION}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                  onClick={() => { setIsOnboarding(false); setShowSettings(true); }}
                  className="p-1.5 rounded-full bg-slate-800/40 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                  <Settings className="w-4 h-4" />
              </button>

              <button 
                  onClick={handleCheckFlow}
                  disabled={isChecking || isDownloading}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 shadow-sm
                    ${updateError 
                        ? 'bg-red-900/50 text-red-200' 
                        : (isChecking || isDownloading) 
                            ? 'bg-slate-800/60 text-emerald-400 cursor-wait' 
                            : 'bg-slate-800/40 text-slate-300 hover:text-emerald-400'
                    }
                  `}
              >
                  {(isChecking || isDownloading) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-medium">Loading...</span>
                      </>
                  ) : updateError ? (
                       <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Errore</span>
                      </>
                  ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        <span className="text-xs font-medium hidden sm:inline">Aggiorna</span>
                      </>
                  )}
              </button>
          </div>
        </div>
        
        <div className="mt-1 z-10 flex items-center justify-between">
          {metadata && (
            isTestMode ? (
              <div className="text-red-500 font-bold tracking-wider animate-pulse text-sm drop-shadow-md">
                NO INDEX
              </div>
            ) : (
              <div className="text-slate-300 text-xs flex items-center gap-1 drop-shadow-md">
                <span className="opacity-80">Data:</span>
                <span className="font-mono text-white">{metadata.creationDate}</span>
              </div>
            )
          )}
          
          <div className="text-xs flex items-center gap-1 drop-shadow-md">
                 <span className="text-white font-semibold">{filteredCount}</span>
                 <span className="text-slate-500">/</span>
                 <span className="text-green-500 font-semibold">{totalCount}</span>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        hideLogs={isOnboarding}
        onSave={handleSettingsSave}
        onDataRestored={onDataRestored}
      />
      
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* --- PROGRESS MODAL --- */}
      {progressStatus && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
              <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                  <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                      <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative z-10" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                      <h3 className="text-xl font-bold text-white tracking-wide">Attendere...</h3>
                      <p className="text-slate-400 text-sm text-center max-w-[200px] animate-pulse">
                          Operazione in corso.
                      </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 w-full min-w-[250px] flex flex-col gap-3">
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                          <Server className="w-4 h-4 text-slate-500" />
                          <ArrowDownToLine className="w-4 h-4 text-slate-500" />
                          <FileArchive className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="h-px w-full bg-slate-700"></div>
                      <span className="text-xs font-mono text-emerald-300 text-center">
                          {progressStatus}
                      </span>
                  </div>
              </div>
          </div>
      )}

      {/* --- CONFIRM UPDATE MODAL --- */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-5 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mb-3 ring-1 ring-emerald-500/50">
                          {confirmModal.zipBlob ? (
                               // Icona standard se abbiamo già scaricato tutto (Check via ZIP)
                               <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                               // Icona "Fulmine" se abbiamo controllato via TXT leggero
                               <Zap className="w-6 h-6 text-yellow-400" />
                          )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">Nuovo Indice Trovato!</h3>
                      <p className="text-slate-400 text-sm mb-4">
                          Versione disponibile sul server.
                          {!confirmModal.zipBlob && <span className="block text-[10px] text-yellow-500/80 mt-1">(Check rapido da file versione)</span>}
                      </p>
                      
                      <div className="bg-slate-950 rounded p-3 border border-slate-800 w-full mb-6">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Data Rilascio</div>
                          <div className="text-lg font-mono text-emerald-400">{confirmModal.date}</div>
                      </div>

                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setConfirmModal({isOpen: false, date:''})}
                              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
                          >
                              Annulla
                          </button>
                          <button 
                              onClick={executeDownloadAndApply}
                              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                          >
                              {confirmModal.zipBlob ? "Applica Ora" : "Scarica e Applica"}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};