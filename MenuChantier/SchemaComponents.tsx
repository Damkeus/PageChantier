import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, FileCheck, Camera, Mic, Clock, ChevronLeft, ChevronRight, Gallery } from './Icons';
import * as assets from './assets/assets';
import { TranslationKey } from './i18n';

// =============================================
// TYPES & INTERFACES
// =============================================

export interface SchemaElement {
    id: number;
    type: string;
    label: string;
    assetImg: string;
    mirrored?: boolean;
}

export interface SchemaData {
    ordreSchema: string;
}

/**
 * Élément d'une liaison dans l'enveloppe JSON produite par PageFicheChantier.
 * v1 portait des coordonnées x/y ; v2 n'en a plus — l'ordre du tableau
 * `elements` EST l'ordre gauche→droite.
 */
interface LiaisonElementJson {
    type?: string;
    subtype?: string;
    x?: number; // v1 uniquement — sert au tri de migration, jamais au layout
    y?: number; // v1 uniquement — ignoré
    orientation?: string; // 'left' | 'right' — image miroir si 'right'
    label?: string;
}

interface LiaisonJson {
    comment?: string;
    ordreSchema?: string;
    elements?: LiaisonElementJson[];
}

/** Modèle normalisé consommé par la vue schéma : éléments déjà résolus. */
export interface Liaison {
    name: string;
    elements: SchemaElement[];
}

/** D'où viennent les liaisons affichées — utile pour diagnostiquer un binding. */
export type SchemaSource = 'envelope' | 'legacy-envelope' | 'legacy-csv' | 'legacy-json' | 'none';

export interface SchemaResolution {
    liaisons: Liaison[];
    source: SchemaSource;
    /** Non nul quand JSONSchema est arrivé rempli mais impossible à parser. */
    jsonSchemaError: string | null;
}

// =============================================
// ID TO TYPE MAPPING
// =============================================

const ID_TO_TYPE_MAP: Record<number, { name: string; asset: string }> = {
    1: { name: 'Extrémité Simple', asset: assets.EXTRMITJPG_IMG },
    2: { name: 'Extrémité ZnO', asset: assets.EXTRMIT_NZOJPG_IMG },
    3: { name: 'Droite Directe', asset: assets.EXT_DROITE_DDIRECTEPNG_IMG },
    4: { name: 'Jonction Simple', asset: assets.JONCTIONJPG_IMG },
    5: { name: 'Jonction avec Malt', asset: assets.JONCTION_AVEC_MALTJPG_IMG },
    6: { name: "Jonction avec Arrêt d'Écran", asset: assets.JONCTION_AVEC_ARRT_DCRANJPG_IMG },
};

// =============================================
// PARSE ORDRE SCHEMA
// =============================================

/** Un CSV d'identifiants : des chiffres, des virgules, des trous éventuels. */
const CSV_IDS_PATTERN = /^\s*\d*\s*(,\s*\d*\s*)*$/;

const parseOrdreSchema = (ordreSchemaString: string): SchemaElement[] => {
    // Une liaison vide arrive avec ordreSchema:"" — `"".split(',')` rend [''],
    // soit un élément 'empty' fantôme qui fait passer la liaison pour remplie.
    if (!ordreSchemaString.trim()) return [];

    // Donner une enveloppe JSON à découper sur les virgules produisait un
    // schéma fantôme : seuls les chiffres des sous-chaînes `"ordreSchema":"1,5,4"`
    // survivaient à parseInt, avec des labels indexés sur le JSON entier.
    if (!CSV_IDS_PATTERN.test(ordreSchemaString)) {
        console.error(
            '[MenuChantier] ordreSchema n\'est pas un CSV d\'identifiants — ignoré. ' +
            `Reçu : ${ordreSchemaString.slice(0, 80)}…`,
        );
        return [];
    }

    const ids = ordreSchemaString.split(',');
    const elements: SchemaElement[] = [];

    ids.forEach((idStr, index) => {
        const trimmed = idStr.trim();

        if (trimmed === '') {
            elements.push({ id: -index, type: 'empty', label: '', assetImg: '' });
            return;
        }

        const numericId = parseInt(trimmed, 10);

        if (isNaN(numericId) || !ID_TO_TYPE_MAP[numericId]) {
            console.warn(`Unknown ID: ${trimmed}`);
            return;
        }

        const mapping = ID_TO_TYPE_MAP[numericId];
        const labelPrefix = numericId <= 3 ? 'E' : 'J';
        const isFirst = elements.filter(e => e.type !== 'empty').length === 0;

        elements.push({
            id: numericId * 100 + index,
            type: mapping.name,
            label: `${labelPrefix}${index + 1}`,
            assetImg: mapping.asset,
            mirrored: isFirst,
        });
    });

    return elements;
};

/** Retrouve le code numérique (clé de ID_TO_TYPE_MAP) depuis type/subtype. */
const numericIdForElement = (el: LiaisonElementJson): number => {
    if (el.type === 'termination') {
        if (el.subtype === 'nzo') return 2;
        if (el.subtype === 'droite_directe') return 3;
        return 1;
    }
    if (el.type === 'joint') {
        if (el.subtype === 'malt') return 5;
        if (el.subtype === 'arret_ecran') return 6;
        return 4;
    }
    return 0;
};

/**
 * Construit les éléments d'affichage depuis `elements[]` — la source riche
 * (subtype réel, orientation, labels), prioritaire sur le CSV `ordreSchema`.
 *
 * Migration v1 : si tous les éléments portent un x numérique, on trie dessus
 * une dernière fois (l'ordre v1 vivait dans la géométrie). En v2, l'ordre du
 * tableau fait foi et est préservé tel quel.
 */
const parseLiaisonElements = (rawElements: LiaisonElementJson[]): SchemaElement[] => {
    const isV1 = rawElements.length > 0 && rawElements.every((e) => typeof e.x === 'number');
    const ordered = isV1
        ? [...rawElements].sort((a, b) => a.x! - b.x!)
        : rawElements;

    const elements: SchemaElement[] = [];
    ordered.forEach((el, index) => {
        const numericId = numericIdForElement(el);
        const mapping = ID_TO_TYPE_MAP[numericId];
        if (!mapping) {
            console.warn(`Unknown element type: ${el.type ?? '?'}/${el.subtype ?? '?'}`);
            return;
        }

        const labelPrefix = numericId <= 3 ? 'E' : 'J';
        const trimmedLabel = el.label?.trim();
        const customLabel = trimmedLabel === '' ? undefined : trimmedLabel;
        // Orientation explicite quand le producteur l'a émise ; sinon on garde
        // l'heuristique historique (seul le premier élément est mirroré).
        const hasOrientation = el.orientation === 'left' || el.orientation === 'right';

        elements.push({
            id: numericId * 100 + index,
            type: mapping.name,
            label: customLabel ?? `${labelPrefix}${index + 1}`,
            assetImg: mapping.asset,
            mirrored: hasOrientation ? el.orientation === 'right' : elements.length === 0,
        });
    });

    return elements;
};

// =============================================
// NORMALIZE SCHEMA INPUT (legacy + v1)
// =============================================

const tryParseJson = (raw: string | undefined): { value: unknown; error: string | null } => {
    if (!raw?.trim()) return { value: null, error: null };
    try {
        return { value: JSON.parse(raw) as unknown, error: null };
    } catch (e) {
        // Un JSONSchema non vide mais illisible (souvent : tronqué par la
        // colonne/binding Power Apps) faisait retomber silencieusement sur le
        // CSV legacy — donc un schéma à plat, sans onglets, sans explication.
        return { value: null, error: e instanceof Error ? e.message : String(e) };
    }
};

/**
 * Détection par FORME, pas par version : tout objet portant un tableau
 * `liaisons` (ou `liaison`) est une enveloppe, v1 comme v2. L'ancien guard
 * `version === 1` rejetait silencieusement les payloads v2.
 */
const extractEnvelopeLiaisons = (parsed: unknown): LiaisonJson[] | null => {
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as { liaisons?: unknown; liaison?: unknown };
    const liaisons = obj.liaisons ?? obj.liaison;
    if (!Array.isArray(liaisons)) return null;
    return liaisons.filter(
        (l): l is LiaisonJson => typeof l === 'object' && l !== null,
    );
};

/**
 * Résout les liaisons à afficher depuis les différentes sources possibles :
 * 1. JSONSchema en enveloppe v1/v2 ({liaisons: [...]}) — prioritaire.
 *    Par liaison : `elements[]` s'il est rempli (subtype/orientation/labels),
 *    sinon reconstruction depuis le CSV `ordreSchema`.
 * 2. project.ordreSchema (legacy).
 * 3. JSONSchema au format legacy ({ordreSchema}).
 */
/** Enveloppe → liaisons d'affichage, quelle que soit la propriété source. */
const buildLiaisons = (envelopeLiaisons: LiaisonJson[]): Liaison[] =>
    envelopeLiaisons.map((l) => {
        const rawElements = Array.isArray(l.elements) ? l.elements : [];
        return {
            name: (l.comment ?? '').trim(),
            elements: rawElements.length > 0
                ? parseLiaisonElements(rawElements)
                : parseOrdreSchema(l.ordreSchema ?? ''),
        };
    });

export const normalizeSchemaInput = (
    jsonSchemaRaw: string | undefined,
    legacyOrdreSchema: string | undefined,
): SchemaResolution => {
    const { value: parsed, error } = tryParseJson(jsonSchemaRaw);

    if (error) {
        console.error(
            `[MenuChantier] JSONSchema illisible (${jsonSchemaRaw?.length ?? 0} caractères reçus) : ${error}. ` +
            `Repli sur ordreSchema legacy — les liaisons seront affichées à plat.`,
        );
    }

    const envelopeLiaisons = extractEnvelopeLiaisons(parsed);
    if (envelopeLiaisons) {
        return {
            liaisons: buildLiaisons(envelopeLiaisons),
            source: 'envelope',
            jsonSchemaError: null,
        };
    }

    // L'enveloppe v2 se retrouve parfois dans la colonne OrdreSchema plutôt que
    // dans SchemaData (selon le binding Power Apps). On la lit là aussi : c'est
    // une enveloppe, quelle que soit la propriété qui la transporte.
    const legacyParsed = tryParseJson(legacyOrdreSchema);
    const legacyEnvelope = extractEnvelopeLiaisons(legacyParsed.value);
    if (legacyEnvelope) {
        return {
            liaisons: buildLiaisons(legacyEnvelope),
            source: 'legacy-envelope',
            jsonSchemaError: null,
        };
    }

    if (legacyOrdreSchema?.trim()) {
        return {
            liaisons: [{ name: '', elements: parseOrdreSchema(legacyOrdreSchema) }],
            source: 'legacy-csv',
            jsonSchemaError: error,
        };
    }

    const legacy = parsed as SchemaData | null;
    if (legacy && typeof legacy.ordreSchema === 'string' && legacy.ordreSchema.trim()) {
        return {
            liaisons: [{ name: '', elements: parseOrdreSchema(legacy.ordreSchema) }],
            source: 'legacy-json',
            jsonSchemaError: error,
        };
    }

    return { liaisons: [], source: 'none', jsonSchemaError: error };
};

// =============================================
// PHOTOS — helpers partagés
// =============================================

export interface UploadedPhoto {
    base64: string;
    name: string;
}

/** Caméra native Power Apps (context.device.captureImage) ; null si annulée. */
export type NativeCameraCapture = () => Promise<UploadedPhoto | null>;

/** Ouvre l'appareil photo. La WebView Power Apps ignore capture="environment"
 *  et ouvre la galerie : on passe par l'API native quand elle est fournie. */
const openCamera = (
    nativeCamera: NativeCameraCapture | undefined,
    fallbackInput: HTMLInputElement | null,
    onPhotos: (photos: UploadedPhoto[]) => void,
): void => {
    if (!nativeCamera) {
        fallbackInput?.click();
        return;
    }
    nativeCamera()
        .then((photo) => (photo ? onPhotos([photo]) : undefined))
        .catch((error: unknown) => {
            console.warn('[MenuChantier] Capture photo annulée ou impossible.', error);
        });
};

/** Lit une sélection de fichiers en data URLs, dans l'ordre de la sélection. */
const readFilesAsDataUrls = (fileList: FileList, done: (photos: UploadedPhoto[]) => void): void => {
    const files = Array.from(fileList);
    const results: UploadedPhoto[] = [];
    let pending = files.length;

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                results[index] = { base64: result, name: file.name };
            }
            pending -= 1;
            if (pending === 0) done(results.filter(Boolean));
        };
        reader.readAsDataURL(file);
    });
};

// =============================================
// SCHEMA VIEW — vue « schéma connecté »
// =============================================

interface SchemaViewProps {
    liaisons: Liaison[];
    /** Barre optionnelle ancrée en bas du flux. Jamais en overlay. */
    banner?: React.ReactNode;
    /** Message d'alerte si JSONSchema est arrivé mais illisible. */
    jsonSchemaError?: string | null;
    /** Hauteur masquée par la barre de navigation d'un autre PCF (~70 px). */
    bottomSafeArea?: number;
    /** Titre du chantier, affiché sous le titre de la vue. */
    projectTitle?: string;
    /** Dossier SharePoint du chantier — cible du bouton Notice. */
    sharepointUrl?: string;
    /** Caméra native Power Apps ; à défaut, input capture="environment". */
    captureImage?: NativeCameraCapture;
    /** Point 5 min : état du briefing + ouverture depuis le bouton horloge. */
    point5MinDone?: boolean;
    onOpenPoint5Min?: () => void;
    onBack: () => void;
    onElementClick: (element: SchemaElement) => void;
    selectedElement: SchemaElement | null;
    onCloseModal: () => void;
    onPhotoTrigger?: (zoneLabel: string, liaisonName: string) => void;
    onPhotoUpload?: (base64List: string[], zoneLabel: string, liaisonName: string) => void;
    /** Note vocale validée : texte dicté rattaché à un repère. */
    onVoiceNote?: (text: string, zoneLabel: string, liaisonName: string) => void;
    t: (key: TranslationKey) => string;
}

/** Cible d'une prise de photo : le repère concerné, ou la liaison entière. */
interface PhotoTarget {
    zone: string;
    liaisonName: string;
    /** Clichés déjà choisis depuis la feuille du repère, à relire avant envoi. */
    initialPhotos: UploadedPhoto[];
}

/** Cible d'une note vocale. */
interface VoiceTarget {
    zone: string;
    liaisonName: string;
}

export const SchemaView: React.FC<SchemaViewProps> = ({
    liaisons,
    banner,
    jsonSchemaError,
    bottomSafeArea = 0,
    projectTitle,
    sharepointUrl,
    captureImage,
    point5MinDone,
    onOpenPoint5Min,
    onBack,
    onElementClick,
    selectedElement,
    onCloseModal,
    onPhotoTrigger,
    onPhotoUpload,
    onVoiceNote,
    t,
}) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const stripRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({ first: 1, last: 1 });
    const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
    const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);
    const [isOnline, setIsOnline] = useState(
        () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    );

    useEffect(() => {
        if (activeIdx >= liaisons.length) {
            setActiveIdx(0);
        }
    }, [liaisons.length, activeIdx]);

    useEffect(() => {
        const sync = () => setIsOnline(navigator.onLine !== false);
        window.addEventListener('online', sync);
        window.addEventListener('offline', sync);
        return () => {
            window.removeEventListener('online', sync);
            window.removeEventListener('offline', sync);
        };
    }, []);

    const activeLiaison = liaisons[activeIdx] ?? null;
    const elements = activeLiaison?.elements ?? [];
    const visibleElements = elements.filter((e) => e.type !== 'empty');
    const liaisonName = activeLiaison?.name ?? '';
    const showStepper = liaisons.length > 1 || Boolean(liaisons[0]?.name);

    /** Fenêtre visible de la bande — alimente les tirets de la vue d'ensemble. */
    const syncScroll = useCallback(() => {
        const el = stripRef.current;
        if (!el || visibleElements.length === 0) return;

        const ratio = el.scrollWidth > 0 ? el.scrollLeft / el.scrollWidth : 0;
        const perView = Math.max(1, Math.round((el.clientWidth / el.scrollWidth) * visibleElements.length));
        const first = Math.min(visibleElements.length, Math.floor(ratio * visibleElements.length) + 1);

        setScrollState({ first, last: Math.min(visibleElements.length, first + perView - 1) });
    }, [visibleElements.length]);

    useEffect(() => {
        stripRef.current?.scrollTo({ left: 0 });
        syncScroll();
        // Changer de liaison ferme toute feuille ouverte sur l'ancienne.
        onCloseModal();
    }, [activeIdx, onCloseModal, syncScroll]);

    const goToLiaison = (direction: -1 | 1) => {
        setActiveIdx((i) => Math.min(liaisons.length - 1, Math.max(0, i + direction)));
    };

    const openNotice = () => {
        if (!sharepointUrl) {
            console.warn('[MenuChantier] Aucune SharepointUrl fournie — Notice sans cible.');
            return;
        }
        window.open(sharepointUrl, '_blank', 'noopener');
    };

    /** Depuis une tuile du repère : les fichiers sont déjà choisis, on passe
     *  à la relecture avant envoi vers le flux SharePoint. */
    const handleSheetCapture = (zone: string, captured: UploadedPhoto[]) => {
        onCloseModal();
        setPhotoTarget({ zone, liaisonName, initialPhotos: captured });
        onPhotoTrigger?.(zone, liaisonName);
    };

    const handleSheetVoice = (zone: string) => {
        onCloseModal();
        setVoiceTarget({ zone, liaisonName });
    };

    const iconButton = (disabled?: boolean) =>
        `w-[46px] h-[46px] flex-none flex items-center justify-center rounded-[14px] bg-white/10 text-white transition-transform ${
            disabled ? 'opacity-35' : 'active:scale-[0.94]'
        }`;

    const stepButton = (disabled: boolean) =>
        `w-[52px] h-[52px] flex-none flex items-center justify-center rounded-[14px] bg-white/10 text-white transition-transform ${
            disabled ? 'opacity-35' : 'active:scale-[0.94]'
        }`;

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif", paddingBottom: bottomSafeArea }}
            className="relative w-full h-full flex flex-col bg-ink overflow-hidden"
        >
            {/* ── Chrome sombre ── */}
            <div className="flex-none px-4 pt-4 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} aria-label={t('back')} className={iconButton()}>
                        <ArrowLeft className="w-[22px] h-[22px]" strokeWidth={2.4} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="m-0 text-[19px] font-bold truncate">{t('single_line_diagram')}</h1>
                        <p className="mt-0.5 text-[12px] text-white/55 truncate">
                            {[projectTitle, isOnline ? t('online') : t('offline')].filter(Boolean).join(' · ')}
                        </p>
                    </div>

                    {onOpenPoint5Min && (
                        <button
                            onClick={onOpenPoint5Min}
                            aria-label={t('point5min_title')}
                            className={`${iconButton()} relative`}
                        >
                            <Clock className="w-5 h-5" strokeWidth={2} />
                            {!point5MinDone && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-nexans" />
                            )}
                        </button>
                    )}
                </div>

                {/* ── Stepper de liaison ── */}
                {showStepper && (
                    <>
                        <div className="flex items-center gap-2.5 mt-4">
                            <button
                                onClick={() => goToLiaison(-1)}
                                disabled={activeIdx === 0}
                                aria-label={t('previous_liaison')}
                                className={stepButton(activeIdx === 0)}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <div className="flex-1 min-w-0 h-[52px] flex items-center justify-center gap-2.5 rounded-[14px] bg-nexans px-3">
                                <span className="text-[17px] font-extrabold text-white whitespace-nowrap">
                                    {liaisonName || `${t('liaison_tab')} ${activeIdx + 1}`}
                                </span>
                                <span className="text-[13px] font-semibold text-white/75 truncate">
                                    {`${visibleElements.length} ${t('elements_count')}`}
                                </span>
                            </div>

                            <button
                                onClick={() => goToLiaison(1)}
                                disabled={activeIdx >= liaisons.length - 1}
                                aria-label={t('next_liaison')}
                                className={stepButton(activeIdx >= liaisons.length - 1)}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex justify-center gap-[5px] mt-2.5">
                            {liaisons.map((liaison, i) => (
                                <button
                                    key={`dot-${i}`}
                                    onClick={() => setActiveIdx(i)}
                                    aria-label={liaison.name || `${t('liaison_tab')} ${i + 1}`}
                                    className={`h-1.5 rounded-[3px] transition-all ${
                                        i === activeIdx ? 'w-[26px] bg-nexans' : 'w-1.5 bg-white/[0.28]'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {jsonSchemaError && (
                    <div
                        role="alert"
                        className="mt-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800"
                    >
                        {t('schema_json_unreadable')}
                    </div>
                )}
            </div>

            {/* ── Feuille blanche ── */}
            <div className="flex-1 min-h-0 mt-[18px] bg-white rounded-t-[26px] flex flex-col overflow-hidden tablet:max-w-[720px] tablet:w-full tablet:self-center">
                {visibleElements.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center px-6">
                        <div className="text-center">
                            <div className="w-14 h-14 bg-surface-plate rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-slate2-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                                </svg>
                            </div>
                            <p className="text-[15px] text-slate2-strong">
                                {liaisons.length > 0 ? t('schema_not_defined') : t('no_diagram')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div
                        ref={stripRef}
                        onScroll={syncScroll}
                        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden py-[26px] no-scrollbar snap-x snap-proximity"
                    >
                        <div className="relative min-w-max h-full flex items-center px-[22px]">
                            {/* Le câble, tracé derrière les repères */}
                            <div className="absolute left-[22px] right-[22px] top-1/2 h-1.5 bg-ink rounded-[3px]" aria-hidden="true" />

                            <div className="relative flex items-center gap-[22px]">
                                {elements.map((element, index) => {
                                    if (element.type === 'empty') {
                                        return <div key={`empty-${index}`} className="w-10 flex-none" aria-hidden="true" />;
                                    }

                                    return (
                                        <button
                                            key={element.id}
                                            onClick={() => onElementClick(element)}
                                            className="flex-none w-[126px] flex flex-col items-center bg-white pt-1 pb-1.5 transition-transform active:scale-[0.97] snap-center"
                                        >
                                            <div className="w-[118px] h-[118px] rounded-2xl bg-surface-plate border-2 border-line p-2">
                                                <img
                                                    src={element.assetImg}
                                                    alt={element.label}
                                                    className="w-full h-full object-contain"
                                                    style={element.mirrored ? { transform: 'scaleX(-1)' } : undefined}
                                                />
                                            </div>
                                            <p className="mt-[9px] text-[17px] font-extrabold text-ink text-center">
                                                {element.label}
                                            </p>
                                            <p className="mt-px text-[11px] text-slate2 text-center max-w-[126px]">
                                                {element.type}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Vue d'ensemble + actions ── */}
                <div className="flex-none px-4 pb-5 flex flex-col gap-2.5">
                    {visibleElements.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-plate">
                            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-slate2-soft whitespace-nowrap">
                                {t('overview')}
                            </p>
                            <div className="flex-1 flex items-center gap-1">
                                {visibleElements.map((element, i) => {
                                    const inView = i + 1 >= scrollState.first && i + 1 <= scrollState.last;
                                    return (
                                        <span
                                            key={`tick-${element.id}`}
                                            className={`flex-1 h-2 rounded-sm ${inView ? 'bg-ink' : 'bg-line-muted'}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2.5">
                        {onPhotoUpload && (
                            <button
                                onClick={() => setPhotoTarget({ zone: 'general', liaisonName, initialPhotos: [] })}
                                className="flex-1 h-[62px] flex items-center justify-center gap-2.5 rounded-2xl bg-nexans active:bg-nexans-dark text-white text-[17px] font-bold transition-colors"
                            >
                                <Camera className="w-6 h-6" />
                                <span>{t('photo_btn')}</span>
                            </button>
                        )}
                        <button
                            onClick={openNotice}
                            aria-label={t('notice')}
                            className="w-[62px] h-[62px] flex items-center justify-center rounded-2xl bg-ink text-white transition-transform active:scale-[0.96]"
                        >
                            <FileCheck className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bandeau optionnel, dernier enfant du flux */}
            {banner}

            {/* ── Feuille du repère ── */}
            {selectedElement && selectedElement.type !== 'empty' && (
                <ElementSheet
                    element={selectedElement}
                    liaisonName={liaisonName}
                    bottomSafeArea={bottomSafeArea}
                    captureImage={captureImage}
                    onClose={onCloseModal}
                    onCapture={(captured) => handleSheetCapture(selectedElement.label, captured)}
                    onNotice={openNotice}
                    onVoice={() => handleSheetVoice(selectedElement.label)}
                    t={t}
                />
            )}

            {/* ── Feuille photo ── */}
            {photoTarget && onPhotoUpload && (
                <SchemaPhotoUpload
                    elements={visibleElements}
                    liaisonName={photoTarget.liaisonName}
                    initialZone={photoTarget.zone}
                    initialPhotos={photoTarget.initialPhotos}
                    bottomSafeArea={bottomSafeArea}
                    captureImage={captureImage}
                    onUpload={onPhotoUpload}
                    onClose={() => setPhotoTarget(null)}
                    t={t}
                />
            )}

            {/* ── Feuille vocale ── */}
            {voiceTarget && (
                <VoiceNoteSheet
                    zoneLabel={voiceTarget.zone}
                    liaisonName={voiceTarget.liaisonName}
                    bottomSafeArea={bottomSafeArea}
                    onSubmit={(text) => {
                        onVoiceNote?.(text, voiceTarget.zone, voiceTarget.liaisonName);
                        setVoiceTarget(null);
                    }}
                    onClose={() => setVoiceTarget(null)}
                    t={t}
                />
            )}
        </div>
    );
};

// =============================================
// FEUILLE DU REPÈRE (ex SchemaElementModal)
// =============================================

interface ElementSheetProps {
    element: SchemaElement;
    liaisonName: string;
    /** Le panneau s'arrête au-dessus de la barre de nav de l'autre PCF. */
    bottomSafeArea: number;
    captureImage?: NativeCameraCapture;
    onClose: () => void;
    /** Fichiers choisis depuis la tuile Photo (caméra) ou Galerie. */
    onCapture: (photos: UploadedPhoto[]) => void;
    onNotice: () => void;
    onVoice: () => void;
    t: (key: TranslationKey) => string;
}

const ElementSheet: React.FC<ElementSheetProps> = ({
    element,
    liaisonName,
    bottomSafeArea,
    captureImage,
    onClose,
    onCapture,
    onNotice,
    onVoice,
    t,
}) => {
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const tile = 'h-24 flex flex-col items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-all';

    // Le clic sur l'input part du geste utilisateur lui-même : un .click()
    // différé dans un effet est refusé par Safari iOS.
    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        readFilesAsDataUrls(fileList, onCapture);
    };

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="absolute inset-0 z-50 flex items-end bg-black/50 animate-backdrop-in"
            onClick={onClose}
        >
            <div
                style={{ paddingBottom: 22 + bottomSafeArea }}
                className="w-full bg-white rounded-t-[24px] px-4 pt-2.5 flex flex-col gap-3.5 animate-sheet-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-10 h-1 rounded-sm bg-line-muted self-center" />

                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 flex-none rounded-2xl bg-surface-plate p-1.5">
                        <img
                            src={element.assetImg}
                            alt={element.label}
                            className="w-full h-full object-contain"
                            style={element.mirrored ? { transform: 'scaleX(-1)' } : undefined}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="m-0 text-[22px] font-extrabold text-ink truncate">{element.label}</p>
                        <p className="mt-px text-[13px] text-slate2-strong truncate">
                            {[element.type, liaisonName].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t('close')}
                        className="w-11 h-11 flex-none flex items-center justify-center rounded-full bg-surface-tile text-slate2-strong"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />

                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        onClick={() => openCamera(captureImage, cameraInputRef.current, onCapture)}
                        className={`${tile} bg-nexans active:bg-nexans-dark text-white`}
                    >
                        <Camera className="w-7 h-7" />
                        <span>{t('photo_btn')}</span>
                    </button>
                    <button
                        onClick={() => galleryInputRef.current?.click()}
                        className={`${tile} bg-surface-tile active:bg-surface-tilePressed text-ink`}
                    >
                        <Gallery className="w-7 h-7" />
                        <span>{t('source_gallery')}</span>
                    </button>
                    <button onClick={onVoice} className={`${tile} bg-surface-tile active:bg-surface-tilePressed text-ink`}>
                        <Mic className="w-7 h-7" />
                        <span>{t('voice_comment')}</span>
                    </button>
                    <button onClick={onNotice} className={`${tile} bg-ink text-white active:opacity-85`}>
                        <FileCheck className="w-7 h-7" />
                        <span>{t('notice')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// =============================================
// FEUILLE VOCALE
// =============================================

/** Reconnaissance vocale du navigateur — absente sur certains WebView. */
const speechAvailable = typeof window !== 'undefined' && !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
);

interface SpeechAlternative { transcript: string }
interface SpeechResult { 0: SpeechAlternative; isFinal: boolean }
interface SpeechEvent { results: ArrayLike<SpeechResult>; resultIndex: number }
interface SpeechRecognizer {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: (e: SpeechEvent) => void;
    onerror: () => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
}

interface VoiceNoteSheetProps {
    zoneLabel: string;
    liaisonName: string;
    bottomSafeArea: number;
    onSubmit: (text: string) => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}

const VoiceNoteSheet: React.FC<VoiceNoteSheetProps> = ({ zoneLabel, liaisonName, bottomSafeArea, onSubmit, onClose, t }) => {
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognizer | null>(null);

    // Le micro doit être relâché quand la feuille se ferme, sinon la
    // reconnaissance continue de tourner en arrière-plan.
    useEffect(() => () => recognitionRef.current?.stop(), []);

    const toggleRecording = () => {
        if (!speechAvailable) return;

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const win = window as unknown as Record<string, unknown>;
        const Ctor = (win.SpeechRecognition ?? win.webkitSpeechRecognition) as new () => SpeechRecognizer;
        const recognition = new Ctor();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            let chunk = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i];
                if (result.isFinal) chunk += result[0].transcript;
            }
            if (chunk) setText((prev) => (prev ? `${prev} ${chunk.trim()}` : chunk.trim()));
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        recognitionRef.current?.stop();
        onSubmit(trimmed);
    };

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="absolute inset-0 z-50 flex items-end bg-black/50 animate-backdrop-in"
            onClick={onClose}
        >
            <div
                style={{ paddingBottom: 22 + bottomSafeArea }}
                className="w-full bg-white rounded-t-[24px] px-4 pt-2.5 flex flex-col gap-3.5 animate-sheet-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-10 h-1 rounded-sm bg-line-muted self-center" />

                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="m-0 text-[22px] font-extrabold text-ink">{t('voice_comment')}</p>
                        <p className="mt-px text-[13px] text-slate2-strong truncate">
                            {[liaisonName, zoneLabel === 'general' ? t('general_label') : zoneLabel]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t('close')}
                        className="w-11 h-11 flex-none flex items-center justify-center rounded-full bg-surface-tile text-slate2-strong"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('voice_placeholder')}
                    rows={4}
                    className="w-full rounded-2xl border-2 border-line bg-surface-plate p-3.5 text-[15px] text-ink resize-none focus:outline-none focus:border-nexans/40"
                />

                <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!speechAvailable}
                    className={`w-full h-[62px] flex items-center justify-center gap-2.5 rounded-2xl text-[17px] font-bold transition-all ${
                        !speechAvailable
                            ? 'bg-surface-tile text-slate2-soft cursor-not-allowed'
                            : isRecording
                            ? 'bg-nexans text-white animate-pulse-ring'
                            : 'bg-surface-tile active:bg-surface-tilePressed text-ink'
                    }`}
                >
                    <Mic className="w-6 h-6" />
                    <span>
                        {!speechAvailable
                            ? t('not_available')
                            : isRecording
                            ? t('stop_dictation')
                            : t('dictate')}
                    </span>
                </button>

                <button
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                    className="w-full h-[60px] rounded-2xl bg-nexans active:bg-nexans-dark disabled:bg-surface-tile disabled:text-slate2-soft text-white text-[17px] font-bold transition-colors"
                >
                    {t('validate')}
                </button>
            </div>
        </div>
    );
};

// =============================================
// FEUILLE PHOTO (galerie / appareil photo → flux SharePoint)
// =============================================

interface SchemaPhotoUploadProps {
    elements: SchemaElement[];
    liaisonName: string;
    initialZone: string;
    /** Clichés déjà choisis en amont (tuile Photo / Galerie du repère). */
    initialPhotos: UploadedPhoto[];
    bottomSafeArea: number;
    captureImage?: NativeCameraCapture;
    onUpload: (base64List: string[], zoneLabel: string, liaisonName: string) => void;
    onClose: () => void;
    t: (key: TranslationKey) => string;
}

const SchemaPhotoUpload: React.FC<SchemaPhotoUploadProps> = ({
    elements,
    liaisonName,
    initialZone,
    initialPhotos,
    bottomSafeArea,
    captureImage,
    onUpload,
    onClose,
    t,
}) => {
    const [selectedZone, setSelectedZone] = useState(initialZone);
    const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        readFilesAsDataUrls(fileList, (added) => setPhotos((prev) => [...prev, ...added]));
    };

    const handleValidate = () => {
        if (photos.length === 0) return;
        onUpload(photos.map((p) => p.base64), selectedZone, liaisonName);
        onClose();
    };

    const zoneClass = (active: boolean) =>
        `h-[52px] px-3 rounded-[14px] text-[16px] font-bold transition-all truncate ${
            active ? 'bg-nexans text-white' : 'bg-surface-tile text-slate2-strong active:bg-surface-tilePressed'
        }`;

    const sourceClass =
        'h-[104px] flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-line-muted transition-transform active:scale-[0.98]';

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="absolute inset-0 z-50 flex items-end bg-black/50 animate-backdrop-in"
            onClick={onClose}
        >
            <div
                style={{ paddingBottom: 22 + bottomSafeArea }}
                className="w-full max-h-full overflow-y-auto bg-white rounded-t-[24px] px-4 pt-2.5 flex flex-col gap-3.5 animate-sheet-in no-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-10 h-1 rounded-sm bg-line-muted self-center" />

                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="m-0 text-[22px] font-extrabold text-ink">{t('upload_photo')}</p>
                        <p className="mt-px text-[13px] text-slate2-strong truncate">
                            {liaisonName || t('choose_location')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t('close')}
                        className="w-11 h-11 flex-none flex items-center justify-center rounded-full bg-surface-tile text-slate2-strong"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Emplacement */}
                <div className="flex flex-col gap-2">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-slate2-soft">
                        {t('choose_location')}
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                        <button onClick={() => setSelectedZone('general')} className={zoneClass(selectedZone === 'general')}>
                            {t('general_label')}
                        </button>
                        {elements.map((element) => (
                            <button
                                key={element.id}
                                onClick={() => setSelectedZone(element.label)}
                                className={zoneClass(selectedZone === element.label)}
                            >
                                {element.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sources */}
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = '';
                    }}
                />
                <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => galleryInputRef.current?.click()} className={sourceClass}>
                        <Gallery className="w-8 h-8 text-nexans" />
                        <span className="text-[15px] font-bold text-slate2-strong">{t('source_gallery')}</span>
                    </button>
                    <button
                        onClick={() =>
                            openCamera(captureImage, cameraInputRef.current, (added) =>
                                setPhotos((prev) => [...prev, ...added])
                            )
                        }
                        className={sourceClass}
                    >
                        <Camera className="w-8 h-8 text-nexans" />
                        <span className="text-[15px] font-bold text-slate2-strong">{t('source_camera')}</span>
                    </button>
                </div>

                {/* Miniatures */}
                {photos.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pt-1 pb-1">
                        {photos.map((photo, i) => (
                            <div key={`upload-${i}`} className="relative flex-none">
                                <img src={photo.base64} alt={photo.name} className="w-20 h-20 object-cover rounded-2xl" />
                                <button
                                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                                    aria-label={t('remove_photo')}
                                    className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-ink text-white rounded-full active:bg-nexans"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleValidate}
                    disabled={photos.length === 0}
                    className="w-full h-[60px] rounded-2xl bg-nexans active:bg-nexans-dark disabled:bg-surface-tile disabled:text-slate2-soft text-white text-[17px] font-bold transition-colors"
                >
                    {t('validate')}
                </button>
            </div>
        </div>
    );
};
