import React, { useState, useRef, useCallback } from 'react';

// =============================================
// TYPES
// =============================================

export interface Point5MinData {
    userChantier: string;
    chantierEnCours: string;
    date: string;
    travauxPresent: string;
    monteursPresent: string;
    objectifJournalier: string;
    risquesAssocies: string;
    objectifRetarde: string;
    pointSupplementaire: string;
}

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

export interface Point5MinNotificationProps {
    projectTitle: string;
    onOpen: () => void;
    onDismiss: () => void;
}

export interface Point5MinPanelProps {
    isOpen: boolean;
    projectTitle: string;
    onClose: () => void;
    onSubmit: (data: Point5MinData) => void;
}

// =============================================
// VOICE FIELD
// =============================================

interface VoiceFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
}

const speechAvailableOnce = typeof window !== 'undefined' && !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
);

const VoiceField: React.FC<VoiceFieldProps> = ({ label, placeholder, value, onChange }) => {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<unknown>(null);

    const toggleRecording = useCallback(() => {
        if (!speechAvailableOnce) return;

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
            onChange(value + ' ' + transcript);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    }, [isRecording, value, onChange]);

    return (
        <div className="space-y-1">
            <label className="text-[13px] font-semibold text-[#333]">{label}</label>
            <div className="relative">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl p-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C41230]/30 focus:border-[#C41230]"
                />
                <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!speechAvailableOnce}
                    title={speechAvailableOnce ? (isRecording ? 'Arrêter la dictée' : 'Dicter') : 'Non disponible sur cet appareil'}
                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                        !speechAvailableOnce
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : isRecording
                            ? 'bg-[#C41230] text-white animate-pulse'
                            : 'bg-[#FEE8EC] text-[#C41230] hover:bg-[#fdd0d6]'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0014 0" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="9" y1="22" x2="15" y2="22" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// =============================================
// NOTIFICATION BANNER (swipe-to-dismiss)
// =============================================

export const Point5MinNotification: React.FC<Point5MinNotificationProps> = ({ onOpen, onDismiss }) => {
    const [swipeY, setSwipeY] = useState(0);
    const startYRef = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const delta = e.touches[0].clientY - startYRef.current;
        if (delta > 0) setSwipeY(delta);
    };

    const handleTouchEnd = () => {
        if (swipeY > 80) {
            onDismiss();
        }
        setSwipeY(0);
    };

    return (
        <div
            style={{
                fontFamily: "'DM Sans', sans-serif",
                transform: `translateY(${swipeY}px)`,
                transition: swipeY === 0 ? 'transform 0.3s ease' : 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="mx-4 mb-4 bg-white rounded-[20px] shadow-[0_2px_16px_rgba(196,18,48,0.15)] border border-[#FEE8EC] overflow-hidden flex-shrink-0"
        >
            <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center gap-3 px-4 pb-4">
                <div className="w-11 h-11 rounded-[14px] bg-[#FEE8EC] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#C41230]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-[#111]">Point 5 min</div>
                    <div className="text-[12px] text-[#888]">Briefing quotidien non effectué</div>
                </div>

                <button
                    onClick={onDismiss}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <button
                onClick={onOpen}
                className="w-full bg-[#C41230] hover:bg-[#a80f28] active:opacity-90 text-white text-[14px] font-semibold py-3 transition-all"
            >
                Commencer le Point 5 min →
            </button>
        </div>
    );
};

// =============================================
// WIZARD PANEL
// =============================================

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<number, string> = {
    0: 'Contexte du chantier',
    1: 'Objectif Journalier',
    2: 'Risques Associés',
    3: 'Objectif Retardé',
    4: 'Point Supplémentaire',
    5: 'Résumé',
};

const STEP_COLORS: Record<number, string> = {
    0: '#C41230',
    1: '#1565C0',
    2: '#E65100',
    3: '#7B1FA2',
    4: '#2E7D32',
    5: '#C41230',
};

const TOTAL_STEPS = 5;

export const Point5MinPanel: React.FC<Point5MinPanelProps> = ({
    isOpen,
    projectTitle,
    onClose,
    onSubmit,
}) => {
    const [step, setStep] = useState<WizardStep>(0);
    const today = new Date().toISOString().split('T')[0];

    const [userChantier, setUserChantier] = useState('');
    const [travauxPresent, setTravauxPresent] = useState('');
    const [monteursPresent, setMonteursPresent] = useState('');

    const [objectifJournalier, setObjectifJournalier] = useState('');
    const [risquesAssocies, setRisquesAssocies] = useState('');
    const [objectifRetarde, setObjectifRetarde] = useState('');
    const [pointSupplementaire, setPointSupplementaire] = useState('');

    const resetState = () => {
        setStep(0);
        setUserChantier('');
        setTravauxPresent('');
        setMonteursPresent('');
        setObjectifJournalier('');
        setRisquesAssocies('');
        setObjectifRetarde('');
        setPointSupplementaire('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleValidate = () => {
        const data: Point5MinData = {
            userChantier: userChantier.trim(),
            chantierEnCours: projectTitle,
            date: today,
            travauxPresent: travauxPresent.trim(),
            monteursPresent: monteursPresent.trim(),
            objectifJournalier: objectifJournalier.trim(),
            risquesAssocies: risquesAssocies.trim(),
            objectifRetarde: objectifRetarde.trim(),
            pointSupplementaire: pointSupplementaire.trim(),
        };
        onSubmit(data);
        resetState();
    };

    const canProceed = (): boolean => {
        if (step === 0) return userChantier.trim().length > 0;
        if (step === 1) return objectifJournalier.trim().length > 0;
        if (step === 2) return risquesAssocies.trim().length > 0;
        if (step === 3) return objectifRetarde.trim().length > 0;
        if (step === 4) return pointSupplementaire.trim().length > 0;
        return true;
    };

    const stepColor = STEP_COLORS[step] ?? '#C41230';

    if (!isOpen) return null;

    return (
        <div
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-md mx-auto mt-auto bg-white rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '92vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{ backgroundColor: stepColor, transition: 'background-color 0.3s ease' }}
                    className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
                >
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 rounded-[11px] bg-white/15 flex items-center justify-center flex-shrink-0 active:bg-white/25 transition-all"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/70">
                            {step < TOTAL_STEPS ? `Point 5 min — Étape ${step + 1} / ${TOTAL_STEPS}` : 'Point 5 min — Récapitulatif'}
                        </div>
                        <div className="text-[18px] font-bold text-white leading-tight truncate">
                            {STEP_TITLES[step]}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-gray-100 flex-shrink-0">
                    <div
                        className="h-full transition-all duration-500"
                        style={{ backgroundColor: stepColor, width: `${(step / TOTAL_STEPS) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {step === 0 && (
                        <>
                            <VoiceField
                                label="Qui fait le point ? *"
                                placeholder="Votre nom et prénom..."
                                value={userChantier}
                                onChange={setUserChantier}
                            />
                            <VoiceField
                                label="Travaux en cours"
                                placeholder="Décrire les travaux du jour..."
                                value={travauxPresent}
                                onChange={setTravauxPresent}
                            />
                            <VoiceField
                                label="Monteurs présents"
                                placeholder="Noms des monteurs présents..."
                                value={monteursPresent}
                                onChange={setMonteursPresent}
                            />
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-[#F4F4F6] rounded-xl px-3 py-2">
                                    <div className="text-[10px] text-[#999] font-semibold uppercase tracking-wider mb-0.5">Chantier</div>
                                    <div className="text-[13px] font-semibold text-[#333] truncate">{projectTitle}</div>
                                </div>
                                <div className="bg-[#F4F4F6] rounded-xl px-3 py-2">
                                    <div className="text-[10px] text-[#999] font-semibold uppercase tracking-wider mb-0.5">Date</div>
                                    <div className="text-[13px] font-semibold text-[#333]">{today}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <VoiceField
                            label="Objectif Journalier *"
                            placeholder="Quels sont les objectifs à atteindre aujourd'hui ?"
                            value={objectifJournalier}
                            onChange={setObjectifJournalier}
                        />
                    )}

                    {step === 2 && (
                        <VoiceField
                            label="Risques Associés *"
                            placeholder="Quels sont les risques liés aux travaux du jour ?"
                            value={risquesAssocies}
                            onChange={setRisquesAssocies}
                        />
                    )}

                    {step === 3 && (
                        <VoiceField
                            label="Objectif Retardé *"
                            placeholder="Y a-t-il des objectifs en retard ? Causes et actions correctives..."
                            value={objectifRetarde}
                            onChange={setObjectifRetarde}
                        />
                    )}

                    {step === 4 && (
                        <VoiceField
                            label="Point Supplémentaire *"
                            placeholder="Tout autre point à aborder avec l'équipe..."
                            value={pointSupplementaire}
                            onChange={setPointSupplementaire}
                        />
                    )}

                    {step === 5 && (
                        <div className="space-y-2">
                            {([
                                { label: 'Responsable', value: userChantier },
                                { label: 'Chantier', value: projectTitle },
                                { label: 'Date', value: today },
                                { label: 'Travaux', value: travauxPresent || '—' },
                                { label: 'Monteurs', value: monteursPresent || '—' },
                                { label: 'Objectif Journalier', value: objectifJournalier },
                                { label: 'Risques Associés', value: risquesAssocies },
                                { label: 'Objectif Retardé', value: objectifRetarde },
                                { label: 'Point Supplémentaire', value: pointSupplementaire },
                            ] as { label: string; value: string }[]).map(({ label, value }) => (
                                <div key={label} className="border border-gray-100 rounded-xl p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">{label}</div>
                                    <div className="text-[13px] text-[#222]">{value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom navigation */}
                <div className="flex gap-3 px-5 pb-6 pt-3 flex-shrink-0 border-t border-gray-100">
                    {step > 0 && (
                        <button
                            onClick={() => setStep((s) => (s - 1) as WizardStep)}
                            className="flex-1 h-12 rounded-[14px] bg-gray-100 text-[#333] text-[14px] font-semibold active:bg-gray-200 transition-all"
                        >
                            Précédent
                        </button>
                    )}
                    {step < TOTAL_STEPS ? (
                        <button
                            onClick={() => setStep((s) => (s + 1) as WizardStep)}
                            disabled={!canProceed()}
                            style={{ backgroundColor: canProceed() ? stepColor : undefined }}
                            className="flex-1 h-12 rounded-[14px] disabled:bg-gray-200 disabled:text-gray-400 text-white text-[14px] font-semibold active:opacity-90 transition-all"
                        >
                            {step === 4 ? 'Récapitulatif' : 'Suivant'}
                        </button>
                    ) : (
                        <button
                            onClick={handleValidate}
                            className="flex-1 h-12 rounded-[14px] bg-[#C41230] hover:bg-[#a80f28] text-white text-[14px] font-semibold active:opacity-90 transition-all"
                        >
                            Valider le Point 5 min
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Point5MinPanel;
