/**
 * Nom des fichiers photo déposés par le flux EnvoiPhotosChantier :
 * `<liaison>_<repère>_<initiales>_<AAAA-MM-JJ>_<HHhMMmSS>.<ext>`
 * ex. `LS1_Pylone_DP_2026-09-25_14h32m05.jpg`.
 *
 * Le flux reprend `fileName` tel quel : deux noms identiques dans un même
 * lot écraseraient une photo, d'où le suffixe `_2`, `_3`…
 */

/** Photo prête à l'envoi, avec son heure de prise de vue. */
export interface TimedPhoto {
    /** Data URI de la photo. */
    base64: string;
    /** Heure de prise de vue (ms epoch). */
    takenAt: number;
}

/** Nombre maximal de lettres gardées pour les initiales. */
const MAX_INITIALS = 3;

/** Nom de fichier compatible SharePoint (labels type "Transfo LSA" contiennent des espaces). */
function sanitizeFileNamePart(value: string): string {
    return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

/**
 * Initiales de l'utilisateur connecté (User().FullName) :
 * "Dylan Prochette" → "DP", "Jean-Pierre Martin" → "JPM", "Élodie Durand (Nexans)" → "ED".
 * Chaîne vide si le nom est inconnu.
 */
export function userInitials(fullName: string | undefined): string {
    const words = (fullName ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\([^)]*\)/g, ' ')
        .split(/[^A-Za-z]+/)
        .filter(Boolean);
    return words.map((word) => word[0]).join('').slice(0, MAX_INITIALS).toUpperCase();
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Date et heure locales de la prise de vue : "2026-09-25_14h32m05". */
export function formatTakenAt(takenAt: number): string {
    const date = new Date(takenAt);
    const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const time = `${pad2(date.getHours())}h${pad2(date.getMinutes())}m${pad2(date.getSeconds())}`;
    return `${day}_${time}`;
}

interface PhotoNameInput {
    takenAt: number;
    /** Extension sans point. */
    ext: string;
}

/**
 * Noms de fichier d'un lot, dans l'ordre du lot. `prefix` = liaison + repère
 * (non assaini), `initials` = initiales de l'utilisateur ('' → segment omis).
 */
export function buildPhotoFileNames(prefix: string, initials: string, photos: PhotoNameInput[]): string[] {
    const stem = [sanitizeFileNamePart(prefix), sanitizeFileNamePart(initials)].filter(Boolean).join('_');
    const bases = photos.map(({ takenAt }) => [stem, formatTakenAt(takenAt)].filter(Boolean).join('_'));
    return photos.map(({ ext }, index) => {
        const base = bases[index];
        const rank = bases.slice(0, index).filter((other) => other === base).length;
        return `${rank === 0 ? base : `${base}_${rank + 1}`}.${ext}`;
    });
}
