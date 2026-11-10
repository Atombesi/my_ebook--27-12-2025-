import React, { useState, useEffect } from 'react';
import { IndexMetadata, AppSettings } from '../types';
import { DownloadCloud, Settings, Loader2, AlertTriangle, CheckCircle2, ArrowDownToLine, Server, FileArchive, Zap, Smartphone, ExternalLink, Download } from 'lucide-react';
import { checkVersion, performDownload, applyUpdate, addLog, checkAppVersion, CheckResult } from '../services/syncService';
import { SettingsModal } from './SettingsModal';
import { InfoModal } from './InfoModal';
import { loadSettings } from '../services/csvService';
import { APP_VERSION } from '../version';

interface HeaderProps {
  metadata: IndexMetadata | null;
  filteredCount: number;
  totalCount: number;
  onRefreshData: () => void;
  onSettingsSaved: (settings: AppSettings) => void;
  isBusy: boolean;
  uiOpacity: number;
  onDataRestored?: () => void; 
  onOpenLoanHistory?: () => void;
}

interface UpdatesState {
    isOpen: boolean;
    indexUpdate?: CheckResult;
    appUpdate?: { versionStr: string; downloadUrl?: string };
    isDownloadingIndex?: boolean;
    indexSuccessDate?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
    metadata, 
    filteredCount, 
    totalCount, 
    onRefreshData, 
    onSettingsSaved, 
    isBusy, 
    uiOpacity,
    onDataRestored, onOpenLoanHistory 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false); 
  const [updatesModal, setUpdatesModal] = useState<UpdatesState>({ isOpen: false });
  
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  const isTestMode = metadata?.label?.trim() === 'TEST';

  // State to hold background check results
  const [backgroundIndexUpdate, setBackgroundIndexUpdate] = useState<CheckResult | null>(null);
  const [backgroundAppUpdate, setBackgroundAppUpdate] = useState<{versionStr: string; downloadUrl?: string} | null>(null);

  useEffect(() => {
    const settings = loadSettings();
    if (!settings.folderUrl || settings.folderUrl.trim() === '') {
        setIsOnboarding(true);
        setShowSettings(true);
    }

    // BACKGROUND CHECK on startup
    const timer = setTimeout(async () => {
        if (!navigator.onLine) return; // Fail fast if offline
        const setts = loadSettings();
        if ((setts.folderUrl && setts.folderUrl.trim() !== '') || (setts.lastUpdateUrl && setts.lastUpdateUrl.trim() !== '')) {
            try {
                // 1. Check Index Version
                const currentDate = metadata?.creationDate || "01-01-2000 00:00";
                const result = await checkVersion(currentDate);
                if (result.hasUpdate) {
                    setBackgroundIndexUpdate(result);
                }

                // 2. Check App Version
                const appRes = await checkAppVersion(APP_VERSION);
                if (appRes.hasUpdate && appRes.remoteVersionStr) {
                    setBackgroundAppUpdate({ versionStr: appRes.remoteVersionStr, downloadUrl: appRes.appDownloadUrl });
                }
            } catch (e) {
                console.log("Background check failed", e);
            }
        }
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, [metadata?.creationDate]);

  const handleCheckFlow = async () => {
    if (isChecking || isDownloading) return;

    // Se c'è già un avviso lampeggiante, apriamo subito la modale
    if (backgroundIndexUpdate || backgroundAppUpdate) {
        setUpdatesModal({ 
            isOpen: true, 
             indexUpdate: backgroundIndexUpdate || undefined,
             appUpdate: backgroundAppUpdate || undefined
         });
        return;
    }

    setIsChecking(true);
    setUpdateError(false);
    setProgressStatus("Controllo aggiornamenti...");
    
    try {
        const currentDate = metadata?.creationDate || "01-01-2000 00:00";
        
        // 1. Check File Indice
        const idxResult = await checkVersion(currentDate, (status) => setProgressStatus(status));
        await new Promise(r => setTimeout(r, 400));
        
        if (idxResult.error === 'MISSING_URL') {
            setIsChecking(false);
            setProgressStatus(null);
            setIsOnboarding(false);
            setShowSettings(true);
            return;
        }

        // 2. Check File App Version (passiamo lo zip blob se è stato scaricato durante checkVersion)
        setProgressStatus("Controllo versione app...");
        const appResult = await checkAppVersion(APP_VERSION, idxResult.zipBlob);

        if (idxResult.error || appResult.error) {
            setUpdateError(true);
            if (idxResult.error) addLog(`Error index check: ${idxResult.error}`);
            if (appResult.error) addLog(`Error app check: ${appResult.error}`);
        }

        if (idxResult.hasUpdate) setBackgroundIndexUpdate(idxResult);
        if (appResult.hasUpdate && appResult.remoteVersionStr) setBackgroundAppUpdate({ versionStr: appResult.remoteVersionStr, downloadUrl: appResult.appDownloadUrl });

        if (!updateError && !idxResult.error && !appResult.error) {
             setUpdatesModal({ 
                 isOpen: true, 
                 indexUpdate: idxResult.hasUpdate ? idxResult : undefined,
                 appUpdate: (appResult.hasUpdate && appResult.remoteVersionStr) 
                    ? { versionStr: appResult.remoteVersionStr, downloadUrl: appResult.appDownloadUrl } 
                    : undefined
             });
        } else {
             alert("Si è verificato un errore durante il controllo. Consulta i log.");
        }
        
    } catch (e: any) {
        setUpdateError(true);
        addLog(`CRITICAL CHECK ERROR: ${e.message}`);
    } finally {
        setIsChecking(false);
        setProgressStatus(null);
    }
  };

  const executeDownloadAndApply = async () => {
      const zipBlob = updatesModal.indexUpdate?.zipBlob;
      const remoteDate = updatesModal.indexUpdate?.remoteDateStr;
      
      setUpdatesModal(prev => ({ ...prev, isDownloadingIndex: true }));
      setIsDownloading(true);
      setProgressStatus("Download in corso...");

      try {
          // FASE 2: DOWNLOAD EFFETTIVO (Se necessario)
          const content = await performDownload(zipBlob, (s) => setProgressStatus(s));
          
          setProgressStatus("Salvataggio...");
          applyUpdate(content);
          
          setProgressStatus(null);
          setIsDownloading(false);
          setBackgroundIndexUpdate(null); // Clear notification
          onRefreshData(); // Reload UI
          
          setUpdatesModal(prev => ({ 
              ...prev, 
              isDownloadingIndex: false, 
              indexSuccessDate: remoteDate, 
              indexUpdate: undefined 
          }));
      } catch (e: any) {
          addLog("Errore Download: " + e.message);
          setIsDownloading(false);
          setProgressStatus(null);
          setUpdateError(true);
          setUpdatesModal(prev => ({ ...prev, isDownloadingIndex: false }));
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

  const hasAnyUpdate = !!backgroundIndexUpdate || !!backgroundAppUpdate;

  return (
    <>
      <div 
        className="shrink-0 min-h-[70px] py-1 w-full flex flex-col justify-center px-4 relative overflow-hidden z-30 transition-colors duration-200 ease-in-out"
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
            <div className="flex items-baseline gap-2 drop-shadow-md">
                <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    MY_Ebook
                </h1>
                <span className="text-[10px] text-slate-400 font-normal">{APP_VERSION}</span>
            </div>
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
                            : hasAnyUpdate
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 animate-pulse hover:bg-orange-500/30'
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
                         <span className="text-xs font-medium hidden sm:inline">
                              {hasAnyUpdate ? "Aggiornamenti!" : "Verifica"}
                         </span>
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
        onDataRestored={onDataRestored} onOpenLoanHistory={onOpenLoanHistory}
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

      {/* --- COMBINED UPDATES MODAL --- */}
      {updatesModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                  
                  <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                       <h3 className="text-lg font-bold text-white">Aggiornamenti</h3>
                       <button 
                           onClick={() => setUpdatesModal({isOpen: false})} 
                           disabled={updatesModal.isDownloadingIndex}
                           className={`text-slate-400 hover:text-white ${updatesModal.isDownloadingIndex ? 'opacity-50 cursor-not-allowed' : ''}`}
                       >
                           Chiudi
                       </button>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-4">
                      
                      {/* BOX INDICE */}
                      <div className={`border rounded-lg p-4 ${(updatesModal.indexUpdate || updatesModal.indexSuccessDate) ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-800/30 border-slate-700/50 opacity-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                              {updatesModal.isDownloadingIndex ? (
                                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                              ) : (
                                  <CheckCircle2 className={`w-5 h-5 ${(updatesModal.indexUpdate || updatesModal.indexSuccessDate) ? 'text-emerald-400' : 'text-slate-500'}`} />
                              )}
                              <h4 className="font-bold text-white text-sm">Indice DB</h4>
                          </div>
                          
                          {updatesModal.isDownloadingIndex ? (
                              <div className="text-xs text-emerald-400 font-medium py-2 flex items-center justify-center bg-emerald-900/30 rounded-lg">
                                  Sincronizzazione in corso...
                              </div>
                          ) : updatesModal.indexSuccessDate ? (
                              <div className="text-xs text-emerald-400 font-medium bg-emerald-900/30 p-2 rounded-lg border border-emerald-800/50">
                                  Indice aggiornato correttamente ({updatesModal.indexSuccessDate})
                              </div>
                          ) : updatesModal.indexUpdate ? (
                              <>
                                  <div className="text-xs text-slate-400 mb-3">
                                      Nuova versione trovata: <span className="font-mono text-emerald-300">{updatesModal.indexUpdate.remoteDateStr}</span>
                                  </div>
                                  <button 
                                      onClick={executeDownloadAndApply}
                                      className="w-full py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 shadow shadow-emerald-900/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                                  >
                                      <DownloadCloud className="w-4 h-4" /> Scarica e Applica
                                  </button>
                              </>
                          ) : (
                              <div className="text-xs text-slate-500">
                                  Già aggiornato <br/><span className="font-mono opacity-80 mt-1 block">Data locale: {metadata?.creationDate || 'N/A'}</span>
                              </div>
                          )}
                      </div>

                      {/* BOX APP */}
                      <div className={`border rounded-lg p-4 ${updatesModal.appUpdate ? 'bg-orange-900/10 border-orange-500/50' : 'bg-slate-800/30 border-slate-700/50 opacity-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                              <Smartphone className={`w-5 h-5 ${updatesModal.appUpdate ? 'text-orange-400' : 'text-slate-500'}`} />
                              <h4 className="font-bold text-white text-sm">Applicazione</h4>
                          </div>
                          {updatesModal.appUpdate ? (
                              <>
                                  <div className="text-xs text-slate-400 mb-3">
                                      Nuova versione rilasciata: <span className="font-mono text-orange-300">{updatesModal.appUpdate.versionStr}</span>
                                  </div>
                                  {updatesModal.appUpdate.downloadUrl ? (
                                      <button 
                                          onClick={() => {
                                              const url = updatesModal.appUpdate?.downloadUrl;
                                              setUpdatesModal({isOpen: false});
                                              if (url) {
                                                  window.open(url, '_blank');
                                              }
                                          }}
                                          className="w-full py-2 rounded-lg bg-orange-600 text-white font-bold text-sm hover:bg-orange-500 shadow shadow-orange-900/20 active:scale-95 transition-all flex justify-center items-center gap-2"
                                      >
                                          <Download className="w-4 h-4" /> Scarica Nuova Versione
                                      </button>
                                  ) : (
                                      <div className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-lg flex items-start gap-2">
                                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                          <span className="leading-tight">Nuova versione disponibile. Link di download non specificato in Ebook_update.txt (AppUrl).</span>
                                      </div>
                                  )}
                              </>
                          ) : (
                              <div className="text-xs text-slate-500">Già aggiornato (Ver. {APP_VERSION})</div>
                          )}
                      </div>

                  </div>
              </div>
          </div>
      )}
    </>
  );
};