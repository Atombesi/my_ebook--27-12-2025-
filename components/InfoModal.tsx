import React from 'react';
import { X, Globe, Mail, MapPin, User, Code2 } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-300">
      
      {/* CARD CONTAINER: Aspect Ratio 3:2 fisso */}
      <div 
        className="relative w-full max-w-md shadow-2xl rounded-xl overflow-hidden aspect-[3/2] border border-slate-600/50 group"
      >
        
        {/* BACKGROUND IMAGE LAYER */}
        <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110"
            style={{ backgroundImage: "url('/sfondo-info.png')" }}
        />

        {/* OVERLAY SCURO (Per leggibilità testo) - TRASPARENZA AUMENTATA A 70% */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/70 to-slate-900/40" />

        {/* CLOSE BUTTON */}
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors z-20 backdrop-blur-md border border-white/10"
        >
            <X className="w-4 h-4" />
        </button>

        {/* CONTENUTO PRINCIPALE */}
        <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
            
            {/* PARTE SUPERIORE: FOTO + INFO */}
            <div className="flex items-start gap-4 mt-2">
                
                {/* COLONNA SINISTRA: FOTO (RIDOTTA A META') */}
                <div className="shrink-0 pt-1">
                    <div className="w-12 h-12 rounded-lg border border-emerald-500/50 shadow-lg overflow-hidden relative rotate-2 bg-slate-800">
                         <img 
                            src="/foto_andrea.jpg" 
                            alt="Andrea Tombesi" 
                            className="w-full h-full object-cover"
                            onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150"} 
                         />
                    </div>
                </div>

                {/* COLONNA DESTRA: TESTO */}
                <div className="flex flex-col gap-1.5 min-w-0 items-start text-left">
                    
                    {/* Author */}
                    <div className="flex items-center gap-2 text-white">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-bold text-sm tracking-wide">Andrea Tombesi</span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-slate-200">
                        <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <a href="mailto:brz.modena@gmail.com" className="text-xs font-mono hover:text-white transition-colors">
                            brz.modena@gmail.com
                        </a>
                    </div>

                    {/* Webpage */}
                    <div className="flex items-center gap-2 text-slate-200">
                        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <a 
                            href="https://andreatombesi.wordpress.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-medium hover:text-white transition-colors underline decoration-emerald-500/50 underline-offset-2 hover:decoration-emerald-400"
                        >
                            andreatombesi.wordpress.com
                        </a>
                    </div>

                    {/* Country */}
                    <div className="flex items-center gap-2 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-xs">Modena, Italy</span>
                    </div>

                </div>
            </div>

            {/* PARTE INFERIORE: CREDITS */}
            <div className="border-t border-white/20 pt-2 mt-auto">
                <div className="flex items-start gap-2 opacity-80">
                    <Code2 className="w-3 h-3 text-slate-300 mt-0.5" />
                    <p className="text-[10px] text-slate-200 italic leading-relaxed font-light">
                        Special thanks to the code generator and the open-source libraries that made this project possible.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};