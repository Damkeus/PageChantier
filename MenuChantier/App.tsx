import React, { useMemo, useState, useRef } from 'react';
// useRef kept for SpeechRecognition in RapportPanel
import { MapPin, FileText, Activity, ClipboardEdit, Navigation, Camera, Phone, X, User, Mic } from './Icons';
import { SchemaView } from './SchemaComponents';
import type { SchemaElement, SchemaData } from './SchemaComponents';

// =============================================
// TYPES
// =============================================

interface ContactData {
    type?: string;
    Name?: string;
    Tel?: string;
    Adresse?: string;
}

interface ProjectData {
    Title: string;
    AddressChantier: string;
    PM: string;
    ProjectUniqID?: string;
    ProjectPath?: string;
    MonteurMail?: string;
    Contact?: ContactData[] | string | null;
    SchemaFolderPath?: string;
    ordreSchema?: string;
}

interface AppProps {
    projectJSON?: string;
    jsonSchema?: string;
    onOutputChange?: (key: string, value: string | boolean) => void;
}

type ViewType = 'menu' | 'schema';
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface SpeechRecognitionResult {
    readonly transcript: string;
}

interface SpeechRecognitionEvent {
    readonly results: ArrayLike<ArrayLike<SpeechRecognitionResult>>;
}

interface SpeechRecognitionInstance {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

// =============================================
// MAIN APP
// =============================================

const App: React.FC<AppProps> = ({ projectJSON, jsonSchema, onOutputChange }) => {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isRapportOpen, setIsRapportOpen] = useState(false);
    const [currentView, setCurrentView] = useState<ViewType>('menu');
    const [selectedElement, setSelectedElement] = useState<SchemaElement | null>(null);
    const [isPhotoOpen, setIsPhotoOpen] = useState(false);

    // Responsive breakpoint via ResizeObserver
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('mobile');
    const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!containerRef) return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0;
            if (width <= 480) setBreakpoint('mobile');
            else if (width <= 768) setBreakpoint('tablet');
            else setBreakpoint('desktop');
        });
        observer.observe(containerRef);
        return () => observer.disconnect();
    }, [containerRef]);

    const project = useMemo(() => {
        try {
            return projectJSON ? JSON.parse(projectJSON) as ProjectData : null;
        } catch (e) {
            console.error("Failed to parse ProjectJSON", e);
            return null;
        }
    }, [projectJSON]);

    const contacts = useMemo((): ContactData[] => {
        if (!project?.Contact) return [];
        if (Array.isArray(project.Contact)) return project.Contact;
        if (typeof project.Contact === 'string') {
            try {
                const parsed: unknown = JSON.parse(project.Contact);
                if (Array.isArray(parsed)) return parsed as ContactData[];
                if (typeof parsed === 'object' && parsed !== null) return [parsed as ContactData];
                return [];
            } catch {
                return [];
            }
        }
        return [];
    }, [project]);

    const schemaData = useMemo((): SchemaData | null => {
        if (project?.ordreSchema) {
            return { ordreSchema: project.ordreSchema };
        }
        try {
            return jsonSchema ? JSON.parse(jsonSchema) as SchemaData : null;
        } catch (e) {
            console.error("Failed to parse JSONSchema", e);
            return null;
        }
    }, [project, jsonSchema]);

    const handleOpenGPS = () => {
        if (project?.AddressChantier) {
            const query = encodeURIComponent(project.AddressChantier);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    };

    const handlePhotoTrigger = () => {
        setIsPhotoOpen(true);
        if (onOutputChange) {
            onOutputChange('PhotoTrigger', true);
        }
    };

    if (!project) {
        return (
            <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex items-center justify-center h-full w-full bg-slate-50 text-gray-400 text-sm">
                Aucun projet sélectionné.
            </div>
        );
    }

    if (currentView === 'schema') {
        return (
            <SchemaView
                schemaData={schemaData}
                onBack={() => setCurrentView('menu')}
                onElementClick={(element) => setSelectedElement(element)}
                selectedElement={selectedElement}
                onCloseModal={() => setSelectedElement(null)}
                onPhotoTrigger={handlePhotoTrigger}
            />
        );
    }

    const isMobile = breakpoint === 'mobile';
    const hasSchema = !!schemaData?.ordreSchema?.trim();

    return (
        <div
            ref={(el: HTMLDivElement | null) => setContainerRef(el)}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`w-full h-full overflow-hidden bg-slate-50 flex flex-col ${isMobile ? 'pb-[100px]' : ''}`}
        >

            {/* ── Subtle top accent bar ── */}
            <div className="h-1 w-full bg-gradient-to-r from-nexans to-nexans-light flex-shrink-0" />

            {/* ── Main content ── */}
            <div className="flex flex-col flex-1 p-2 gap-2 overflow-hidden">

                {/* ── HEADER ── */}
                <header className="flex flex-col bg-white rounded-2xl shadow-sm px-4 py-4 gap-2 flex-[20] min-h-0 justify-center">
                    {/* Top row: label + title */}
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex-shrink-0 whitespace-nowrap">
                            Chantier en cours
                        </span>
                        <span className="text-gray-300 flex-shrink-0">·</span>
                        <h1 className="text-base font-bold text-nexans truncate leading-tight">
                            {project.Title}
                        </h1>
                    </div>

                    {/* Info row: PM + Address */}
                    {(project.PM || project.AddressChantier) && (
                        <div className="flex flex-col gap-1 text-xs text-gray-500">
                            {project.PM && (
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{project.PM}</span>
                                </div>
                            )}
                            {project.AddressChantier && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{project.AddressChantier}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Buttons row */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsContactModalOpen(true)}
                            title="Contacts chantier"
                            className="flex items-center gap-1.5 bg-nexans hover:bg-nexans-dark text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Contacts</span>
                        </button>
                        <button
                            onClick={handleOpenGPS}
                            title="Itinéraire GPS"
                            className="flex items-center gap-1.5 bg-nexans-dark hover:bg-nexans text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                        >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Itinéraire</span>
                        </button>
                    </div>
                </header>

                {/* ── SCHÉMA UNIFILAIRE ── */}
                {hasSchema ? (
                    /* Full featured card when schema exists */
                    <button
                        onClick={() => setCurrentView('schema')}
                        className="w-full flex flex-row items-center gap-4 bg-white rounded-2xl shadow-sm px-4 py-4 hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden flex-[35] min-h-0"
                    >
                        <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-nexans to-nexans-light flex-shrink-0" />
                        <div className="p-3 rounded-xl bg-nexans-light/10 flex-shrink-0 group-hover:bg-nexans-light/20 transition-colors">
                            <Activity className="w-7 h-7 text-nexans" />
                        </div>
                        <div className="flex flex-col items-start text-left flex-1">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Vue principale</span>
                            <h2 className="text-sm font-bold text-gray-900 group-hover:text-nexans transition-colors leading-tight">
                                Schéma Unifilaire
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">Visualiser le schéma du Chantier</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-nexans transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                ) : (
                    /* Compact card when no schema — capped at 35% height */
                    <button
                        onClick={() => setCurrentView('schema')}
                        style={{ maxHeight: '35%' }}
                        className="w-full flex flex-row items-center gap-3 bg-white/70 border border-dashed border-gray-200 rounded-xl px-3 py-2.5 hover:bg-white hover:border-nexans/30 hover:shadow-sm transition-all active:scale-[0.99] group overflow-hidden flex-[35] min-h-0"
                    >
                        <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-nexans-light/10 flex-shrink-0 transition-colors">
                            <Activity className="w-4 h-4 text-gray-400 group-hover:text-nexans transition-colors" />
                        </div>
                        <div className="flex flex-col items-start text-left flex-1 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Schéma Unifilaire</span>
                            <p className="text-[10px] text-gray-400 italic truncate">Aucun schéma disponible</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-nexans transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* ── ACTION CARDS ── */}
                <div className="grid grid-cols-3 gap-2 flex-[25] min-h-0">
                    <ActionCard
                        icon={<FileText className="w-5 h-5 text-nexans" />}
                        title="Documents"
                        onClick={() => console.log('Open Documents')}
                        color="primary"
                    />
                    <ActionCard
                        icon={<ClipboardEdit className="w-5 h-5 text-nexans" />}
                        title="Rapport"
                        onClick={() => setIsRapportOpen(true)}
                        color="secondary"
                    />
                    <ActionCard
                        icon={<Camera className="w-5 h-5 text-nexans" />}
                        title="Photo"
                        onClick={handlePhotoTrigger}
                        color="primary"
                    />
                </div>
            </div>

            {/* Contact Modal */}
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                contacts={contacts}
            />

            {/* Rapport Panel */}
            <RapportPanel
                isOpen={isRapportOpen}
                onClose={() => setIsRapportOpen(false)}
                onSubmit={(text) => {
                    if (onOutputChange) {
                        onOutputChange('RapportText', text);
                        onOutputChange('RapportTimestamp', new Date().toISOString());
                    }
                }}
            />

            {/* Photo Panel */}
            <PhotoPanel
                isOpen={isPhotoOpen}
                onClose={() => {
                    setIsPhotoOpen(false);
                    if (onOutputChange) onOutputChange('PhotoTrigger', false);
                }}
            />
        </div>
    );
};

// =============================================
// ACTION CARD
// =============================================

interface ActionCardProps {
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
    color: 'primary' | 'secondary';
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, onClick, color }) => {
    const bg = color === 'primary'
        ? 'bg-nexans/10 group-hover:bg-nexans/20'
        : 'bg-nexans-light/10 group-hover:bg-nexans-light/20';
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl shadow-sm p-4 text-center transition-all active:scale-95 hover:shadow-md group h-full"
        >
            <div className={`p-3 rounded-xl ${bg} transition-colors`}>
                {icon}
            </div>
            <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">
                {title}
            </span>
        </button>
    );
};

// =============================================
// CONTACT MODAL
// =============================================

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: ContactData[];
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, contacts }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Contacts Chantier</h2>
                        <p className="text-xs text-gray-400">Coordonnées des contacts</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-4" />

                {/* Content */}
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {contacts.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Aucune information de contact</p>
                    )}
                    {contacts.map((c, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 p-3 space-y-2">
                            {/* Type badge + Name */}
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-nexans/10 rounded-lg">
                                    <User className="w-4 h-4 text-nexans" />
                                </div>
                                {c.type && (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-nexans px-1.5 py-0.5 rounded">
                                        {c.type}
                                    </span>
                                )}
                                {c.Name && (
                                    <span className="text-sm font-bold text-gray-800">{c.Name}</span>
                                )}
                            </div>
                            {c.Tel && (
                                <a href={`tel:${c.Tel}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-sm font-medium">{c.Tel}</span>
                                </a>
                            )}
                            {c.Adresse && c.Adresse.trim() !== '' && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.Adresse)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-sm font-medium">{c.Adresse}</span>
                                </a>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================
// RAPPORT PANEL
// =============================================

interface RapportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
}

const RapportPanel: React.FC<RapportPanelProps> = ({ isOpen, onClose, onSubmit }) => {
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [speechAvailable] = useState(() =>
        typeof window !== 'undefined' && !!(
            (window as unknown as Record<string, unknown>).SpeechRecognition ??
            (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        )
    );
    const recognitionRef = useRef<unknown>(null);

    const toggleRecording = () => {
        if (!speechAvailable) return;

        if (isRecording) {
            const rec = recognitionRef.current as { stop: () => void } | null;
            rec?.stop();
            setIsRecording(false);
            return;
        }

        const win = window as unknown as Record<string, unknown>;
        const SpeechRecognitionCtor = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as
            new () => SpeechRecognitionInstance;

        const recognition = new SpeechRecognitionCtor();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            for (const result of Array.from(event.results)) {
                transcript += result[0].transcript;
            }
            setText((prev) => prev + ' ' + transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const handleSubmit = () => {
        if (text.trim()) {
            onSubmit(text.trim());
            setText('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Rapport de chantier</h2>
                        <p className="text-xs text-gray-400">Saisie texte ou dictée vocale</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-4" />

                {/* Content */}
                <div className="p-4 space-y-3">
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Décrivez l'avancement du chantier..."
                            className="w-full min-h-[120px] border border-gray-200 rounded-xl p-3 pr-12 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-nexans/30 focus:border-nexans"
                        />
                        {/* Mic button */}
                        <button
                            onClick={toggleRecording}
                            disabled={!speechAvailable}
                            title={speechAvailable ? (isRecording ? 'Arrêter la dictée' : 'Dicter') : 'Non disponible sur cet appareil'}
                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${!speechAvailable ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''
                                }${speechAvailable && !isRecording ? ' bg-nexans/10 text-nexans hover:bg-nexans/20' : ''
                                }${isRecording ? ' bg-nexans text-white animate-pulse-ring' : ''}`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim()}
                        className="w-full bg-nexans hover:bg-nexans-dark disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                        Envoyer
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================
// PHOTO PANEL
// =============================================

interface PhotoPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const PhotoPanel: React.FC<PhotoPanelProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                style={{ height: '70%' }}
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 flex-shrink-0">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Photo Chantier</h2>
                        <p className="text-xs text-gray-400">Capture photo du chantier</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-4 flex-shrink-0" />

                {/* Camera zone */}
                <div className="flex-1 p-4">
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                        <Camera className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-400">Zone caméra</p>
                        <p className="text-xs text-gray-300 mt-1">En attente du flux vidéo</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
