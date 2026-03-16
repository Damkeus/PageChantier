import React from 'react';
import { ArrowLeft, X, FileCheck, Image as ImageIcon, ClipboardEdit } from './Icons';
import * as assets from './assets/assets';

// =============================================
// TYPES & INTERFACES
// =============================================

export interface SchemaElement {
    id: number;
    type: string;
    label: string;
    assetImg: string;
}

export interface SchemaData {
    ordreSchema: string;
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

const parseOrdreSchema = (ordreSchemaString: string): SchemaElement[] => {
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

        elements.push({
            id: numericId * 100 + index,
            type: mapping.name,
            label: `${labelPrefix}${index + 1}`,
            assetImg: mapping.asset
        });
    });

    return elements;
};

// =============================================
// SCHEMA VIEW
// =============================================

interface SchemaViewProps {
    schemaData: SchemaData | null;
    onBack: () => void;
    onElementClick: (element: SchemaElement) => void;
    selectedElement: SchemaElement | null;
    onCloseModal: () => void;
}

export const SchemaView: React.FC<SchemaViewProps> = ({
    schemaData,
    onBack,
    onElementClick,
    selectedElement,
    onCloseModal
}) => {
    const elements = schemaData?.ordreSchema?.trim()
        ? parseOrdreSchema(schemaData.ordreSchema)
        : [];

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }} className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">

            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-red-700 to-orange-500 flex-shrink-0" />

            {/* Content */}
            <div className="flex flex-col flex-1 p-2 gap-2 overflow-hidden">

                {/* ── Header ── */}
                <header className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-2 flex-shrink-0">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 flex-shrink-0"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Retour</span>
                    </button>
                    <div className="w-px h-full bg-gray-200 self-stretch" />
                    <h1 className="text-sm font-bold text-gray-900 truncate">Schéma Unifilaire</h1>
                </header>

                {/* ── Elements or empty state ── */}
                {elements.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">Aucun schéma disponible</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Horizontal scrollable area */}
                        <main className="flex-1 overflow-x-auto overflow-y-hidden">
                            <div className="flex items-center gap-3 h-full px-1 min-w-max">
                                {elements.map((element, index) => {
                                    if (element.type === 'empty') {
                                        return <div key={`empty-${index}`} className="w-10 flex-shrink-0" aria-hidden="true" />;
                                    }

                                    return (
                                        <button
                                            key={element.id}
                                            onClick={() => onElementClick(element)}
                                            className="flex-shrink-0 bg-white rounded-xl shadow-sm p-2.5 transition-all hover:shadow-md active:scale-95 group w-32"
                                        >
                                            {/* Image */}
                                            <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-50 mb-2 group-hover:bg-orange-50 transition-colors">
                                                <img
                                                    src={element.assetImg}
                                                    alt={element.label}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            </div>
                                            {/* Info */}
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                                                    {element.label}
                                                </p>
                                                <p className="text-[9px] text-gray-400 mt-0.5 truncate">
                                                    {element.type}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </main>

                        {/* Scroll hint */}
                        <div className="text-center flex-shrink-0 pb-1">
                            <p className="text-[10px] text-gray-400">← Glissez pour voir tous les éléments →</p>
                        </div>
                    </>
                )}
            </div>

            {/* Element modal */}
            {selectedElement && selectedElement.type !== 'empty' && (
                <SchemaElementModal element={selectedElement} onClose={onCloseModal} />
            )}
        </div>
    );
};

// =============================================
// ELEMENT MODAL
// =============================================

interface SchemaElementModalProps {
    element: SchemaElement;
    onClose: () => void;
}

export const SchemaElementModal: React.FC<SchemaElementModalProps> = ({ element, onClose }) => {
    const handleAction = (action: string) => {
        console.log(`Action: ${action} for element:`, element);
    };

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3">
                    <div className="w-8 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{element.label}</h2>
                        <p className="text-xs text-gray-400">{element.type}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="h-px bg-gray-100 mx-4" />

                <div className="p-4 space-y-3">
                    {/* Image */}
                    <div className="w-full aspect-square max-h-40 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                            src={element.assetImg}
                            alt={element.label}
                            className="h-full object-contain p-4"
                        />
                    </div>

                    {/* Action buttons — 3 columns */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Notice', Icon: FileCheck },
                            { label: 'Photo', Icon: ImageIcon },
                            { label: 'Livrable', Icon: ClipboardEdit },
                        ].map(({ label, Icon }) => (
                            <button
                                key={label}
                                onClick={() => handleAction(label)}
                                className="flex flex-col items-center gap-2 bg-gray-50 hover:bg-orange-50 rounded-xl p-3 transition-all active:scale-95 group"
                            >
                                <Icon className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-gray-700">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Close */}
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
