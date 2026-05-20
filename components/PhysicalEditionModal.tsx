import React, { useState, useEffect, useRef } from 'react';
import { Book, BookNoteEntry } from '../types';
import { X, Book as BookIcon, Gem, Image as ImageIcon, Link as LinkIcon, DollarSign, AlertTriangle } from 'lucide-react';

interface PhysicalEditionModalProps {
    isOpen: boolean;
    book: Book | null;
    currentEntry?: BookNoteEntry;
    onClose: () => void;
    onSave: (data: {
        cartaceo: boolean;
        pregiata: boolean;
        valore: string;
        linkWeb: string;
        imageBase64: string | null;
    }) => void;
}

export const PhysicalEditionModal: React.FC<PhysicalEditionModalProps> = ({
    isOpen,
    book,
    currentEntry,
    onClose,
    onSave
}) => {
    const [isCartaceo, setIsCartaceo] = useState(false);
    const [isPregiata, setIsPregiata] = useState(false);
    const [valore, setValore] = useState('');
    const [linkWeb, setLinkWeb] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && book) {
            setIsCartaceo(currentEntry?.cartaceo || false);
            setIsPregiata(currentEntry?.pregiata || false);
            setValore(currentEntry?.valore || '');
            setLinkWeb(currentEntry?.linkWeb || '');
            setImageBase64(null); // Image will be loaded separately in DetailBlock, but here we only handle new image uploads. If we want to show existing image, we need to pass it or load it.
            setShowWarning(false);
        }
    }, [isOpen, book, currentEntry]);

    if (!isOpen || !book) return null;

    const handleCartaceoToggle = () => {
        if (isCartaceo && isPregiata) {
            setShowWarning(true);
        } else {
            setIsCartaceo(!isCartaceo);
            if (isCartaceo) {
                setIsPregiata(false);
                setValore('');
                setLinkWeb('');
                setImageBase64(null);
            }
        }
    };

    const confirmRemoveCartaceo = () => {
        setIsCartaceo(false);
        setIsPregiata(false);
        setValore('');
        setLinkWeb('');
        setImageBase64(null);
        setShowWarning(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave({
            cartaceo: isCartaceo,
            pregiata: isPregiata,
            valore: valore,
            linkWeb: linkWeb,
            imageBase64: imageBase64
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
                    <div className="pr-4">
                        <h3 className="text-lg font-bold text-white leading-tight">{book.title}</h3>
                        <p className="text-sm text-slate-400">{book.author}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Cartaceo Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isCartaceo ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                                <BookIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Edizione Cartacea</h4>
                                <p className="text-xs text-slate-400">Possiedi una copia fisica</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCartaceoToggle}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isCartaceo ? 'bg-amber-500' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isCartaceo ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Warning Modal for removing Cartaceo */}
                    {showWarning && (
                        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-2 text-red-400 mb-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p className="text-xs font-medium">Rimuovendo l'opzione cartaceo perderai anche i dati sull'edizione pregiata. Sei sicuro?</p>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setShowWarning(false)} className="px-3 py-1 text-xs text-slate-300 hover:text-white">Annulla</button>
                                <button onClick={confirmRemoveCartaceo} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500">Rimuovi</button>
                            </div>
                        </div>
                    )}

                    {/* Sezione Collezionista */}
                    {isCartaceo && (
                        <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-4">
                            
                            {/* Pregiata Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isPregiata ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                                        <Gem className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">Edizione Pregiata</h4>
                                        <p className="text-xs text-slate-400">Da collezione / Rara</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsPregiata(!isPregiata)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${isPregiata ? 'bg-purple-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isPregiata ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Dettagli Pregiata */}
                            {isPregiata && (
                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                    
                                    {/* Valore */}
                                    <div>
                                        <label className="text-xs text-slate-400 font-medium mb-1 block flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> Valore Stimato / Prezzo
                                        </label>
                                        <input 
                                            type="text" 
                                            value={valore}
                                            onChange={(e) => setValore(e.target.value)}
                                            placeholder="es. 50€"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>

                                    {/* Link Web */}
                                    <div>
                                        <label className="text-xs text-slate-400 font-medium mb-1 block flex items-center gap-1">
                                            <LinkIcon className="w-3 h-3" /> Link Scheda Web
                                        </label>
                                        <input 
                                            type="url" 
                                            value={linkWeb}
                                            onChange={(e) => setLinkWeb(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>

                                    {/* Immagine */}
                                    <div>
                                        <label className="text-xs text-slate-400 font-medium mb-1 block flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" /> Foto Copertina
                                        </label>
                                        
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                            />
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                {imageBase64 || currentEntry?.hasImage ? 'Cambia Foto' : 'Scegli Foto'}
                                            </button>
                                            
                                            {(imageBase64 || currentEntry?.hasImage) && (
                                                <div className="w-10 h-10 rounded bg-slate-800 border border-slate-600 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {imageBase64 ? (
                                                        <img src={imageBase64} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-5 h-5 text-purple-400" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button 
                        onClick={handleSave}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        Salva Modifiche
                    </button>
                </div>
            </div>
        </div>
    );
};
