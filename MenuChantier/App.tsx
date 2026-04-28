import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, FileText, Activity, ClipboardEdit, Navigation, Camera, Phone, X, User, Mic } from './Icons';
import { SchemaView } from './SchemaComponents';
import type { SchemaElement, SchemaData } from './SchemaComponents';
import { Point5MinNotification, Point5MinPanel } from './Point5MinPanel';
import { PMNotificationBanner, PMNotificationPanel } from './PMNotificationPanel';
import type { PMNotification } from './PMNotificationPanel';
import type { Point5MinData } from './Point5MinPanel';
import { type Lang, type TranslationKey, t, photosTakenLabel, getLangFromProp, LANG_CYCLE } from './i18n';

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
    PMPhone?: string;
    ProjectUniqID?: string;
    ProjectPath?: string;
    folderpath?: string;
    FolderPath?: string;
    MonteurMail?: string;
    Contact?: ContactData[] | string | null;
    SchemaFolderPath?: string;
    ordreSchema?: string;
    Monteurs?: { Name: string }[];
    PMNotification?: PMNotification;
}

interface AppProps {
    projectJSON?: string;
    jsonSchema?: string;
    language?: string;
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

const App: React.FC<AppProps> = ({ projectJSON, jsonSchema, language, onOutputChange }) => {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isRapportOpen, setIsRapportOpen] = useState(false);
    const [currentView, setCurrentView] = useState<ViewType>('menu');
    const [selectedElement, setSelectedElement] = useState<SchemaElement | null>(null);
    const [isPhotoOpen, setIsPhotoOpen] = useState(false);
    const [isPoint5MinOpen, setIsPoint5MinOpen] = useState(false);
    const [isPMNotifOpen, setIsPMNotifOpen] = useState(false);

    const [lang, setLang] = useState<Lang>(() => getLangFromProp(language));

    useEffect(() => {
        setLang(getLangFromProp(language));
    }, [language]);

    const toggleLang = () => {
        setLang(prev => {
            const idx = LANG_CYCLE.indexOf(prev);
            return LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
        });
    };

    const tr = (key: TranslationKey) => t(key, lang);

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

    const projectTitle = project?.Title ?? '';

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

    const monteurs = useMemo((): string[] => {
        if (!project?.Monteurs) return [];
        return project.Monteurs
            .map((m) => m.Name?.trim())
            .filter((name): name is string => !!name);
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

    const handlePoint5MinSubmit = (data: Point5MinData) => {
        const today = new Date().toISOString().split('T')[0];
        const key = `p5m_done_${encodeURIComponent(projectTitle)}_${today}`;
        localStorage.setItem(key, '1');
        setIsPoint5MinOpen(false);
        if (onOutputChange) {
            onOutputChange('Point5MinJSON', JSON.stringify(data));
            onOutputChange('Point5MinTimestamp', new Date().toISOString());
        }
    };

    const point5MinDoneToday = !!projectTitle && !!localStorage.getItem(
        `p5m_done_${encodeURIComponent(projectTitle)}_${new Date().toISOString().split('T')[0]}`
    );

    if (!project) {
        return (
            <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="flex items-center justify-center h-full w-full bg-[#F4F4F6] text-gray-400 text-sm">
                {tr('no_project')}
            </div>
        );
    }

    const isMobile = breakpoint === 'mobile';
    const hasSchema = !!schemaData?.ordreSchema?.trim();
    const pmInitials = project.PM
        ? project.PM.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <>
            {currentView === 'schema' ? (
                <SchemaView
                    schemaData={schemaData}
                    onBack={() => setCurrentView('menu')}
                    onElementClick={(element) => setSelectedElement(element)}
                    selectedElement={selectedElement}
                    onCloseModal={() => setSelectedElement(null)}
                    onPhotoTrigger={handlePhotoTrigger}
                />
            ) : (
                <div
                    ref={(el: HTMLDivElement | null) => setContainerRef(el)}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    className={`w-full h-full overflow-y-auto bg-[#F4F4F6] flex flex-col ${isMobile ? 'pb-[100px]' : ''}`}
                >
                    {/* ── Red Header ── */}
                    <div className="bg-[#C41230] px-6 pt-5 pb-6 text-white flex-shrink-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-[11px] font-semibold uppercase tracking-[1.5px] opacity-70">
                                {tr('site_in_progress')}
                            </div>
                            <button
                                onClick={toggleLang}
                                className="text-[11px] font-bold uppercase tracking-[1px] bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-full px-[10px] py-[3px] transition-all border border-white/30"
                                aria-label="Switch language"
                            >
                                {lang.toUpperCase()}
                            </button>
                        </div>
                        <div className="text-[28px] font-bold tracking-[-0.5px] mb-4 leading-tight">
                            {project.Title}
                        </div>

                        {project.PM && (
                            <div className="flex items-center gap-[10px] bg-white/[0.12] rounded-[14px] px-[14px] py-[10px] mb-[14px]">
                                <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-[15px] font-bold flex-shrink-0">
                                    {pmInitials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[14px] font-semibold truncate">{project.PM}</div>
                                    <div className="text-[12px] opacity-70 mt-[1px]">{tr('project_manager')}</div>
                                </div>
                                {project.PMPhone && (
                                    <a
                                        href={`tel:${project.PMPhone}`}
                                        className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center active:bg-white/40 transition-all flex-shrink-0"
                                        aria-label={tr('call_pm')}
                                    >
                                        <Phone className="w-4 h-4 text-white" />
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="flex gap-[10px]">
                            <button
                                onClick={() => setIsContactModalOpen(true)}
                                className="flex-1 h-12 rounded-[14px] border-2 border-white/35 bg-white/10 text-white text-[14px] font-semibold flex items-center justify-center gap-[6px] active:bg-white/25 transition-all"
                            >
                                <Phone className="w-4 h-4" />
                                {tr('contacts')}
                            </button>
                            <button
                                onClick={handleOpenGPS}
                                className="flex-1 h-12 rounded-[14px] border-2 border-white/35 bg-white/10 text-white text-[14px] font-semibold flex items-center justify-center gap-[6px] active:bg-white/25 transition-all"
                            >
                                <Navigation className="w-4 h-4" />
                                {tr('directions')}
                            </button>
                        </div>
                    </div>

                    {/* ── Location bar ── */}
                    {project.AddressChantier && (
                        <div className="bg-white px-6 py-3 flex items-center gap-2 border-b border-[#F0F0F0] flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#C41230] flex-shrink-0" />
                            <span className="text-[13px] text-[#666] truncate">{project.AddressChantier}</span>
                        </div>
                    )}

                    {/* ── Vue principale ── */}
                    <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#999] px-6 pt-5 pb-[10px] flex-shrink-0">
                        {tr('main_view')}
                    </div>

                    <div className="mx-4 bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex-shrink-0">
                        <button
                            onClick={() => setCurrentView('schema')}
                            className="w-full flex items-center gap-4 px-5 py-[18px] active:bg-gray-50 transition-all text-left"
                        >
                            <div className="w-[52px] h-[52px] rounded-[14px] bg-[#FEE8EC] flex items-center justify-center flex-shrink-0">
                                <Activity className="w-6 h-6 text-[#C41230]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[#999] mb-[3px]">
                                    {tr('diagram_label')}
                                </div>
                                <div className="text-[17px] font-bold text-[#111] leading-tight">
                                    {tr('single_line_diagram')}
                                </div>
                                <div className="text-[13px] text-[#888] mt-[2px]">
                                    {hasSchema ? tr('view_diagram') : tr('no_diagram')}
                                </div>
                            </div>
                            <svg className="w-[18px] h-[18px] text-[#C41230] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    {/* ── Actions rapides ── */}
                    <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#999] px-6 pt-5 pb-[10px] flex-shrink-0">
                        {tr('quick_actions')}
                    </div>

                    <div className="grid grid-cols-3 gap-3 px-4 pb-6 flex-shrink-0">
                        <button
                            onClick={() => {
                                const url = project.folderpath ?? project.FolderPath ?? project.ProjectPath;
                                if (url) {
                                    window.open(url, '_blank');
                                } else {
                                    console.warn('No folderpath found in project JSON');
                                }
                            }}
                            className="bg-white rounded-[20px] px-3 py-5 flex flex-col items-center gap-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.96] transition-all border-none"
                        >
                            <div className="w-[52px] h-[52px] rounded-[16px] bg-[#FEE8EC] flex items-center justify-center">
                                <FileText className="w-6 h-6 text-[#C41230]" />
                            </div>
                            <span className="text-[13px] font-semibold text-[#222] text-center leading-tight">{tr('documents')}</span>
                        </button>

                        <button
                            onClick={() => setIsRapportOpen(true)}
                            className="bg-white rounded-[20px] px-3 py-5 flex flex-col items-center gap-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.96] transition-all border-none"
                        >
                            <div className="w-[52px] h-[52px] rounded-[16px] bg-[#FEE8EC] flex items-center justify-center">
                                <ClipboardEdit className="w-6 h-6 text-[#C41230]" />
                            </div>
                            <span className="text-[13px] font-semibold text-[#222] text-center leading-tight">{tr('report_btn')}</span>
                        </button>

                        <button
                            onClick={handlePhotoTrigger}
                            className="bg-white rounded-[20px] px-3 py-5 flex flex-col items-center gap-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.96] transition-all border-none"
                        >
                            <div className="w-[52px] h-[52px] rounded-[16px] bg-[#FEE8EC] flex items-center justify-center">
                                <Camera className="w-6 h-6 text-[#C41230]" />
                            </div>
                            <span className="text-[13px] font-semibold text-[#222] text-center leading-tight">{tr('photo_btn')}</span>
                        </button>
                    </div>

                    {/* ── PM Notification ── */}
                    {project.PMNotification && !isPMNotifOpen && (
                        <div className="px-4">
                            <PMNotificationBanner
                                notification={project.PMNotification}
                                lang={lang}
                                onOpen={() => setIsPMNotifOpen(true)}
                            />
                        </div>
                    )}

                    {/* ── Point 5 min daily notification ── */}
                    {!point5MinDoneToday && !isPoint5MinOpen && (
                        <Point5MinNotification
                            projectTitle={projectTitle}
                            onOpen={() => setIsPoint5MinOpen(true)}
                            t={tr}
                        />
                    )}
                </div>
            )}

            {/* Contact Modal */}
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                contacts={contacts}
                t={tr}
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
                t={tr}
            />

            {/* Photo Panel */}
            <PhotoPanel
                isOpen={isPhotoOpen}
                onClose={() => {
                    setIsPhotoOpen(false);
                }}
                onPhotoCapture={(base64) => {
                    if (onOutputChange) {
                        onOutputChange('PhotoBase64', base64);
                        onOutputChange('PhotoTrigger', true);
                    }
                }}
                t={tr}
            />

            {/* Point 5 min Panel */}
            <Point5MinPanel
                isOpen={isPoint5MinOpen}
                projectTitle={projectTitle}
                monteurs={monteurs}
                onClose={() => setIsPoint5MinOpen(false)}
                onSubmit={handlePoint5MinSubmit}
                t={tr}
            />

            {/* PM Notification Panel */}
            {project.PMNotification && (
                <PMNotificationPanel
                    notification={project.PMNotification}
                    lang={lang}
                    isOpen={isPMNotifOpen}
                    onClose={() => setIsPMNotifOpen(false)}
                />
            )}
        </>
    );
};

// =============================================
// CONTACT MODAL
// =============================================

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: ContactData[];
    t: (key: TranslationKey) => string;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, contacts, t }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{t('site_contacts')}</h2>
                        <p className="text-xs text-gray-400">{t('contact_details')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="h-px bg-gray-100 mx-4" />

                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {contacts.length === 0 && (
                        <p className="text-xs text-gray-400 italic">{t('no_contact_info')}</p>
                    )}
                    {contacts.map((c, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 p-3 space-y-2">
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

                <div className="px-4 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                        {t('close')}
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
    t: (key: TranslationKey) => string;
}

const RapportPanel: React.FC<RapportPanelProps> = ({ isOpen, onClose, onSubmit, t }) => {
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
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{t('site_report_title')}</h2>
                        <p className="text-xs text-gray-400">{t('text_or_voice')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="h-px bg-gray-100 mx-4" />

                <div className="p-4 space-y-3">
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t('report_placeholder')}
                            className="w-full min-h-[120px] border border-gray-200 rounded-xl p-3 pr-12 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-nexans/30 focus:border-nexans"
                        />
                        <button
                            onClick={toggleRecording}
                            disabled={!speechAvailable}
                            title={speechAvailable ? (isRecording ? t('stop_dictation') : t('dictate')) : t('not_available')}
                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${!speechAvailable ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''
                                }${speechAvailable && !isRecording ? ' bg-nexans/10 text-nexans hover:bg-nexans/20' : ''
                                }${isRecording ? ' bg-nexans text-white animate-pulse-ring' : ''}`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim()}
                        className="w-full bg-nexans hover:bg-nexans-dark disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                    >
                        {t('send')}
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
    onPhotoCapture: (base64: string) => void;
    t: (key: TranslationKey) => string;
}

const PhotoPanel: React.FC<PhotoPanelProps> = ({ isOpen, onClose, onPhotoCapture, t }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startStream = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            if (message.includes('Permission') || message.includes('NotAllowed')) {
                setError(t('camera_denied'));
            } else {
                setError(t('camera_error') + message);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCapturedPhotos([]);
            setSelectedIndex(null);
            setError(null);
            void startStream();
        } else {
            stopStream();
        }
        return () => stopStream();
    }, [isOpen, startStream, stopStream]);

    const handleCapture = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhotos(prev => [...prev, base64]);
    }, []);

    const handleDelete = useCallback((index: number) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
        setSelectedIndex(null);
    }, []);

    const handleValidate = useCallback(() => {
        if (capturedPhotos.length === 0) return;
        onPhotoCapture(JSON.stringify(capturedPhotos));
        onClose();
    }, [capturedPhotos, onPhotoCapture, onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                style={{ height: '75%' }}
                className="w-full max-w-md mx-4 bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Red header */}
                <div className="bg-[#C41230] px-5 py-4 flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-[12px] bg-white/15 flex items-center justify-center flex-shrink-0 active:bg-white/25 transition-all"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-[18px] font-bold text-white leading-tight">{t('site_photos_title')}</h2>
                        <p className="text-[12px] text-white/70">
                            {capturedPhotos.length > 0
                                ? (capturedPhotos.length === 1 ? t('photos_taken_one') : t('photos_taken_many').replace('{n}', String(capturedPhotos.length)))
                                : t('photo_capture_subtitle')}
                        </p>
                    </div>
                </div>

                {/* Camera zone + thumbnail strip */}
                <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3">
                    {error ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-red-50 border-2 border-dashed border-red-200 rounded-[20px]">
                            <Camera className="w-12 h-12 text-red-300 mb-3" />
                            <p className="text-sm font-medium text-red-500 text-center px-4">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Viewfinder — always streaming */}
                            <div className="relative rounded-[20px] overflow-hidden bg-[#1a1a1a] flex-1">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {/* Camera grid overlay */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                                        backgroundSize: '33.33% 33.33%',
                                    }}
                                />

                                {/* Lightbox overlay — shown when a thumbnail is tapped */}
                                {selectedIndex !== null && (
                                    <div className="absolute inset-0 bg-black/92 flex flex-col z-10">
                                        <button
                                            onClick={() => setSelectedIndex(null)}
                                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/35 transition-all z-20"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                        <img
                                            src={capturedPhotos[selectedIndex]}
                                            alt={`Photo ${selectedIndex + 1}`}
                                            className="flex-1 object-contain w-full"
                                        />
                                        <div className="flex justify-center pb-4 pt-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleDelete(selectedIndex)}
                                                className="h-[44px] px-6 bg-[#C41230] text-white rounded-[14px] font-semibold text-sm flex items-center gap-2 active:bg-[#a00f28] transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                                </svg>
                                                {t('delete')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail strip — visible once at least 1 photo captured */}
                            {capturedPhotos.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto flex-shrink-0 pb-1" style={{ scrollbarWidth: 'none' }}>
                                    {capturedPhotos.map((src, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedIndex(idx)}
                                            className="relative flex-shrink-0 w-[64px] h-[64px] rounded-[10px] overflow-hidden border-2 transition-all"
                                            style={{ borderColor: selectedIndex === idx ? '#C41230' : 'transparent' }}
                                        >
                                            <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                            <span className="absolute bottom-0 right-0 bg-black/60 text-white font-bold px-1 rounded-tl-[6px]" style={{ fontSize: '9px' }}>
                                                {idx + 1}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Footer buttons */}
                <div className="px-4 pb-5 flex-shrink-0 flex gap-[10px]">
                    {!error && (
                        <button
                            onClick={handleCapture}
                            className="flex-[2] h-[60px] bg-[#C41230] text-white rounded-[16px] font-bold text-[16px] flex items-center justify-center gap-2 active:bg-[#a00f28] transition-all"
                        >
                            <Camera className="w-5 h-5" />
                            {t('capture')}
                        </button>
                    )}
                    <button
                        onClick={handleValidate}
                        disabled={capturedPhotos.length === 0}
                        className={`flex-1 h-[60px] rounded-[16px] font-bold text-[16px] transition-all ${
                            capturedPhotos.length > 0
                                ? 'bg-[#2E7D32] text-white active:bg-[#1B5E20]'
                                : 'bg-[#E0E0E0] text-[#999] cursor-not-allowed'
                        }`}
                    >
                        {t('validate')}{capturedPhotos.length > 0 ? ` (${capturedPhotos.length})` : ''}
                    </button>
                    <button
                        onClick={onClose}
                        className={`${error ? 'flex-1' : ''} h-[60px] bg-white text-[#111] border border-[#E0E0E0] rounded-[16px] font-semibold text-[16px] px-5 active:bg-gray-50 transition-all`}
                    >
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
