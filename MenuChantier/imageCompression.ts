/**
 * Réduit une photo avant l'envoi au flux : une photo d'appareil fait 3 à 8 Mo,
 * et un lot en base64 passé par Power Apps atteint vite les limites de taille
 * ou de délai de l'appel au flux.
 */

export const MAX_PHOTO_DIMENSION = 2048;
export const JPEG_QUALITY = 0.85;

export interface CompressedPhoto {
    /** Data URI (préfixe `data:<mime>;base64,` inclus). */
    dataUrl: string;
    /** Extension sans point, cohérente avec le contenu réel. */
    ext: string;
}

const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

/** Extension déduite du MIME d'une data URI ; `jpg` si inconnu. */
export function extensionFromDataUrl(dataUrl: string): string {
    const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
    const mime = match?.[1]?.toLowerCase() ?? '';
    return MIME_TO_EXT[mime] ?? 'jpg';
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image illisible par le navigateur'));
        img.src = src;
    });

/**
 * Redimensionne (plus grand côté ≤ maxDim) et réencode en JPEG.
 * Rejette si l'image ne peut pas être décodée (HEIC dans certaines WebView) :
 * l'appelant décide alors d'envoyer l'original.
 */
export async function compressImage(
    dataUrl: string,
    maxDim: number = MAX_PHOTO_DIMENSION,
    quality: number = JPEG_QUALITY,
): Promise<CompressedPhoto> {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');

    // Fond blanc : un PNG transparent réencodé en JPEG virerait au noir.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return { dataUrl: canvas.toDataURL('image/jpeg', quality), ext: 'jpg' };
}

/** Compresse si possible, sinon garde l'original (erreur journalisée). */
export async function compressOrKeep(dataUrl: string): Promise<CompressedPhoto> {
    try {
        return await compressImage(dataUrl);
    } catch (error: unknown) {
        console.error('[MenuChantier] Compression photo impossible — envoi de l\'original.', error);
        return { dataUrl, ext: extensionFromDataUrl(dataUrl) };
    }
}
