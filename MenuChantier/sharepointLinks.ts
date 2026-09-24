/**
 * Liens navigateur vers les dossiers SharePoint du chantier.
 *
 * Même site et même arborescence que les flux EnvoiPhotosChantier et
 * VerifierDossiersSchema : le chemin projet est relatif au site
 * (`/Copie RTE ENEDIS/Projet 2026/…`), son premier segment est la bibliothèque.
 * Ouvert tel quel, ce chemin partait sur l'hôte Power Apps → 404.
 */

export const SHAREPOINT_SITE_URL = 'https://nexans.sharepoint.com/sites/t-nex';
export const TABLETTE_FOLDER = '6. Tablette';
export const NOTICE_FOLDER = 'Notice';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const encodeSegments = (segments: string[]): string =>
    segments
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');

/** Chemin relatif au site ou URL complète → URL absolue du dossier projet. */
export function projectFolderUrl(folderPath: string | undefined): string | null {
    const trimmed = (folderPath ?? '').trim();
    if (!trimmed) return null;
    if (ABSOLUTE_URL_PATTERN.test(trimmed)) return trimmed.replace(/\/+$/, '');
    const encoded = encodeSegments(trimmed.split('/'));
    return encoded ? `${SHAREPOINT_SITE_URL}/${encoded}` : null;
}

/** Ajoute des sous-dossiers (noms bruts, encodés ici) à une URL de dossier. */
export function subfolderUrl(baseUrl: string, ...segments: string[]): string {
    return `${baseUrl.replace(/\/+$/, '')}/${encodeSegments(segments)}`;
}

export interface ProjectFolderLinks {
    /** `<projet>/6. Tablette` — bouton Documents. */
    tablette: string | null;
    /** `<projet>/6. Tablette/Notice` — boutons Notice. */
    notice: string | null;
}

/**
 * Cibles des boutons Documents et Notice. Sans chemin projet, repli sur
 * `fallbackUrl` (propriété SharepointUrl) tel quel : on ne peut rien lui
 * ajouter sans risque, ce peut être un lien de partage.
 */
export function buildProjectFolderLinks(
    folderPath: string | undefined,
    fallbackUrl: string | undefined,
): ProjectFolderLinks {
    const projectUrl = projectFolderUrl(folderPath);
    if (projectUrl) {
        const tablette = subfolderUrl(projectUrl, TABLETTE_FOLDER);
        return { tablette, notice: subfolderUrl(tablette, NOTICE_FOLDER) };
    }
    const trimmedFallback = (fallbackUrl ?? '').trim();
    const fallback = trimmedFallback === '' ? null : trimmedFallback;
    return { tablette: fallback, notice: fallback };
}

/** Ouvre un dossier dans un nouvel onglet ; journalise l'absence de cible. */
export function openFolder(url: string | null, label: string): void {
    if (!url) {
        console.warn(`[MenuChantier] Aucun dossier SharePoint pour « ${label} » (ni chemin projet, ni SharepointUrl).`);
        return;
    }
    window.open(url, '_blank', 'noopener');
}
