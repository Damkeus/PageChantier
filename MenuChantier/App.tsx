import React, { useMemo, useState } from 'react';
import { MapPin, FileText, Activity, ClipboardEdit, Navigation, Camera, Phone, X, User, FileCheck, Image as ImageIcon } from './Icons';
import { SchemaView } from './SchemaComponents';
import type { SchemaElement, SchemaData } from './SchemaComponents';

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
}

type ViewType = 'menu' | 'schema';

const App: React.FC<AppProps> = ({ projectJSON, jsonSchema }) => {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [currentView, setCurrentView] = useState<ViewType>('menu');
    const [selectedElement, setSelectedElement] = useState<SchemaElement | null>(null);

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
        // Prefer ordreSchema from ProjectJSON, fall back to separate jsonSchema prop
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
            />
        );
    }

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }} className="w-full h-full overflow-hidden bg-slate-50 flex flex-col">

            {/* ── Subtle top accent bar ── */}
            <div className="h-1 w-full bg-gradient-to-r from-red-700 to-orange-500 flex-shrink-0" />

            {/* ── Main content ── */}
            <div className="flex flex-col flex-1 p-2 gap-2 overflow-hidden">

                {/* ── HEADER ── */}
                <header className="flex items-center justify-between bg-white rounded-xl shadow-sm px-3 py-2 flex-shrink-0">

                    {/* Left: label + title */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex-shrink-0 whitespace-nowrap hidden sm:inline">
                            Chantier en cours
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 flex-shrink-0 whitespace-nowrap sm:hidden">
                            Chantier
                        </span>
                        <span className="text-gray-300 flex-shrink-0">·</span>
                        <h1 className="text-sm font-bold text-red-700 truncate leading-tight">
                            {project.Title}
                        </h1>
                    </div>

                    {/* Right: stacked icon buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                            onClick={() => setIsContactModalOpen(true)}
                            title="Contacts chantier"
                            className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 shadow-sm"
                        >
                            <Phone className="w-3 h-3" />
                            <span>Contacts</span>
                        </button>
                        <button
                            onClick={handleOpenGPS}
                            title="Itinéraire GPS"
                            className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 shadow-sm"
                        >
                            <Navigation className="w-3 h-3" />
                            <span>Itinéraire</span>
                        </button>
                    </div>
                </header>

                {/* ── FEATURED CARD: Schéma Unifilaire ── */}
                <button
                    onClick={() => setCurrentView('schema')}
                    className="flex-1 w-full flex flex-row items-center gap-4 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden"
                >
                    {/* Accent bar on left */}
                    <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-red-700 to-orange-500 flex-shrink-0" />

                    {/* Icon */}
                    <div className="p-3 rounded-xl bg-orange-50 flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <Activity className="w-8 h-8 text-orange-600" />
                    </div>

                    {/* Text */}
                    <div className="flex flex-col items-start text-left flex-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Vue principale</span>
                        <h2 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                            Schéma Unifilaire
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Visualiser le schéma du Chantier</p>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* ── ACTION CARDS ── */}
                <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                    <ActionCard
                        icon={<FileText className="w-5 h-5 text-red-600" />}
                        title="Documents"
                        onClick={() => console.log('Open Documents')}
                        color="red"
                    />
                    <ActionCard
                        icon={<ClipboardEdit className="w-5 h-5 text-orange-600" />}
                        title="Rapport"
                        onClick={() => console.log('Open Form')}
                        color="orange"
                    />
                    <ActionCard
                        icon={<Camera className="w-5 h-5 text-red-700" />}
                        title="Photo"
                        onClick={() => console.log('Open Camera')}
                        color="red"
                    />
                </div>
            </div>

            {/* Contact Modal */}
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                contacts={contacts}
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
    color: 'red' | 'orange';
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, onClick, color }) => {
    const bg = color === 'red' ? 'bg-red-50 group-hover:bg-red-100' : 'bg-orange-50 group-hover:bg-orange-100';
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 bg-white rounded-xl shadow-sm py-3 px-2 text-center transition-all active:scale-95 hover:shadow-md group"
        >
            <div className={`p-2 rounded-lg ${bg} transition-colors`}>
                {icon}
            </div>
            <span className="text-[11px] font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">
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
                                <div className="p-1.5 bg-red-50 rounded-lg">
                                    <User className="w-4 h-4 text-red-600" />
                                </div>
                                {c.type && (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-red-700 px-1.5 py-0.5 rounded">
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

export default App;
