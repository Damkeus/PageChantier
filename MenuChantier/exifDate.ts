/**
 * Heure de prise de vue lue dans l'EXIF d'un JPEG (DateTimeOriginal).
 *
 * Pour une photo choisie dans la galerie, `File.lastModified` vaut souvent
 * l'heure de la sélection (iOS copie le fichier) : seul l'EXIF donne l'heure
 * réelle du cliché. La compression canvas efface l'EXIF, d'où une lecture
 * sur l'original, au moment de la capture.
 */

/** Le bloc EXIF (APP1) est en tête de fichier et ne dépasse pas 64 Ko. */
const EXIF_SCAN_BYTES = 128 * 1024;

const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;
const TAG_DATE_TIME = 0x0132;
const TYPE_ASCII = 2;
const IFD_ENTRY_SIZE = 12;

/** Début de fichier d'une data URI base64, en octets. */
function decodeDataUrlHead(dataUrl: string): Uint8Array | null {
    const comma = dataUrl.indexOf(',');
    if (comma < 0 || !/;base64$/i.test(dataUrl.slice(0, comma))) return null;
    // Multiple de 4 : atob refuse un bloc base64 tronqué.
    const chars = Math.floor(Math.min(dataUrl.length - comma - 1, (EXIF_SCAN_BYTES / 3) * 4) / 4) * 4;
    try {
        const binary = atob(dataUrl.slice(comma + 1, comma + 1 + chars));
        return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
        return null;
    }
}

/** Position du TIFF de l'EXIF dans un JPEG, ou -1. */
function findTiffStart(bytes: Uint8Array): number {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return -1;
    let pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xff) {
        const marker = bytes[pos + 1];
        const length = (bytes[pos + 2] << 8) | bytes[pos + 3];
        const isExif = marker === 0xe1
            && String.fromCharCode(...bytes.subarray(pos + 4, pos + 10)) === 'Exif\0\0';
        if (isExif) return pos + 10;
        // SOS : les données image commencent, plus d'en-tête après.
        if (marker === 0xda) return -1;
        pos += 2 + length;
    }
    return -1;
}

interface TiffReader {
    u16: (offset: number) => number;
    u32: (offset: number) => number;
    size: number;
}

function tiffReader(bytes: Uint8Array, start: number): TiffReader | null {
    const view = new DataView(bytes.buffer, bytes.byteOffset + start, bytes.length - start);
    if (view.byteLength < 8) return null;
    const order = view.getUint16(0);
    if (order !== 0x4949 && order !== 0x4d4d) return null;
    const little = order === 0x4949;
    return {
        u16: (offset) => view.getUint16(offset, little),
        u32: (offset) => view.getUint32(offset, little),
        size: view.byteLength,
    };
}

/** Offset (dans le TIFF) de l'entrée `tag` de l'IFD situé à `ifd`, ou -1. */
function findEntry(tiff: TiffReader, ifd: number, tag: number): number {
    if (ifd + 2 > tiff.size) return -1;
    const count = tiff.u16(ifd);
    for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * IFD_ENTRY_SIZE;
        if (entry + IFD_ENTRY_SIZE > tiff.size) return -1;
        if (tiff.u16(entry) === tag) return entry;
    }
    return -1;
}

/** Valeur ASCII d'une entrée, lue à son offset (une date EXIF fait 20 octets). */
function readAscii(bytes: Uint8Array, tiffStart: number, tiff: TiffReader, entry: number): string | null {
    if (entry < 0 || tiff.u16(entry + 2) !== TYPE_ASCII) return null;
    const length = tiff.u32(entry + 4);
    const offset = length > 4 ? tiff.u32(entry + 8) : entry + 8;
    if (offset + length > tiff.size) return null;
    const raw = bytes.subarray(tiffStart + offset, tiffStart + offset + length);
    return String.fromCharCode(...raw).replace(/\0+$/, '');
}

/** "2026:09:25 14:32:05" → timestamp (heure locale de l'appareil), ou null. */
export function parseExifDateTime(value: string | null): number | null {
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(value ?? '');
    if (!match) return null;
    const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
    if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/** Heure de prise de vue EXIF d'une data URI JPEG ; null si absente ou illisible. */
export function readExifTakenAt(dataUrl: string): number | null {
    const bytes = decodeDataUrlHead(dataUrl);
    if (!bytes) return null;
    const tiffStart = findTiffStart(bytes);
    if (tiffStart < 0) return null;
    const tiff = tiffReader(bytes, tiffStart);
    if (!tiff) return null;

    const ifd0 = tiff.u32(4);
    const exifPointer = findEntry(tiff, ifd0, TAG_EXIF_IFD_POINTER);
    const exifIfd = exifPointer >= 0 ? tiff.u32(exifPointer + 8) : -1;
    const candidates = [
        exifIfd >= 0 ? findEntry(tiff, exifIfd, TAG_DATE_TIME_ORIGINAL) : -1,
        exifIfd >= 0 ? findEntry(tiff, exifIfd, TAG_DATE_TIME_DIGITIZED) : -1,
        findEntry(tiff, ifd0, TAG_DATE_TIME),
    ];
    for (const entry of candidates) {
        const takenAt = parseExifDateTime(readAscii(bytes, tiffStart, tiff, entry));
        if (takenAt !== null) return takenAt;
    }
    return null;
}
