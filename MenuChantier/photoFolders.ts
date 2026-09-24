/**
 * Noms des dossiers photo sous `<ProjectFolderPath>/6. Tablette/`.
 *
 * Doit rester identique au nommage du flux VerifierDossiersSchema, qui crée
 * ces dossiers : sinon les photos atterrissent dans un dossier voisin.
 * L'assainissement des caractères interdits (" * : < > ? / \ |) est fait
 * par le flux EnvoiPhotosChantier, avec la même chaîne de replace.
 */

/** Sous-dossier des photos non rattachées à un repère. */
export const GENERAL_FOLDER = 'Général';

/** Nom du dossier de liaison : `comment`, sinon « Liaison N » (N 1-indexé). */
export function liaisonFolderName(comment: string | undefined, index: number): string {
    const trimmed = (comment ?? '').trim();
    return trimmed || `Liaison ${index + 1}`;
}

/**
 * Nom du dossier d'élément : `label`, sinon « Extrémité N » / « Jonction N ».
 * N = position dans le tableau brut `elements` (avant tout tri), 1-indexée.
 */
export function elementFolderName(type: string | undefined, index: number, label: string | undefined): string {
    const trimmed = (label ?? '').trim();
    if (trimmed) return trimmed;
    const prefix = type === 'termination' ? 'Extrémité' : 'Jonction';
    return `${prefix} ${index + 1}`;
}

/** Où ranger un lot de photos. */
export interface PhotoDestination {
    /** Repère choisi ('general' si aucun) — pour l'affichage et le nom de fichier. */
    zoneLabel: string;
    /** Nom affiché de la liaison ('' hors schéma). */
    liaisonName: string;
    /** Dossier de liaison ('' depuis le menu principal). */
    liaisonFolder: string;
    /** Dossier d'élément, ou GENERAL_FOLDER. */
    elementFolder: string;
}
