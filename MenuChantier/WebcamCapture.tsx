import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Gallery, X } from './Icons';
import { TranslationKey } from './i18n';
import type { NativeCameraCapture, UploadedPhoto } from './SchemaComponents';

const JPEG_QUALITY = 0.85;

const hasWebcamApi = (): boolean =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

interface WebcamCaptureProps {
    onCapture: (photo: UploadedPhoto) => void;
    onClose: () => void;
    /** Caméra inaccessible : bascule sur le sélecteur de fichiers. */
    onFallback: () => void;
    t: (key: TranslationKey) => string;
}

/** Viseur caméra en direct (getUserMedia) : sur navigateur desktop,
 *  capture="environment" est ignoré et ouvre le sélecteur de fichiers. */
const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose, onFallback, t }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    // t peut changer d'identité à chaque rendu : ne pas relancer le flux pour autant.
    const tRef = useRef(t);
    tRef.current = t;

    useEffect(() => {
        let cancelled = false;
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return undefined;
                }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                return undefined;
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const name = err instanceof DOMException ? err.name : '';
                const message = err instanceof Error ? err.message : String(err);
                console.warn('[MenuChantier] Caméra inaccessible.', err);
                setError(
                    name === 'NotAllowedError' || name === 'SecurityError'
                        ? tRef.current('camera_denied')
                        : tRef.current('camera_error') + message
                );
            });
        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    const handleShoot = useCallback(() => {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const takenAt = Date.now();
        onCapture({
            base64: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
            name: `photo_${takenAt}.jpg`,
            takenAt,
        });
    }, [onCapture]);

    return (
        <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="absolute inset-0 z-[60] flex flex-col bg-black animate-backdrop-in"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative flex-1 min-h-0">
                {error ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
                        <Camera className="w-12 h-12 text-white/40" />
                        <p className="m-0 text-[15px] font-medium text-white/80">{error}</p>
                        <button
                            onClick={onFallback}
                            className="h-12 px-5 flex items-center gap-2 rounded-2xl bg-white text-ink text-[15px] font-bold active:opacity-85"
                        >
                            <Gallery className="w-5 h-5" />
                            {t('source_gallery')}
                        </button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedData={() => setReady(true)}
                        className="w-full h-full object-cover"
                    />
                )}
                <button
                    onClick={onClose}
                    aria-label={t('close')}
                    className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white active:bg-black/70"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {!error && (
                <div className="flex-none flex items-center justify-center py-6">
                    <button
                        onClick={handleShoot}
                        disabled={!ready}
                        aria-label={t('capture')}
                        className="w-[76px] h-[76px] rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                    >
                        <span className="w-[60px] h-[60px] rounded-full bg-nexans" />
                    </button>
                </div>
            )}
        </div>
    );
};

/** Ouvre l'appareil photo : caméra native Power Apps (mobile), sinon viseur
 *  getUserMedia, sinon input capture="environment" en dernier recours. */
export const useCameraLauncher = (
    nativeCamera: NativeCameraCapture | undefined,
    fallbackInputRef: React.RefObject<HTMLInputElement>,
    onPhotos: (photos: UploadedPhoto[]) => void,
    t: (key: TranslationKey) => string,
): { openCamera: () => void; cameraOverlay: React.ReactNode } => {
    const [webcamOpen, setWebcamOpen] = useState(false);

    const openCamera = () => {
        if (nativeCamera) {
            nativeCamera()
                .then((photo) => (photo ? onPhotos([photo]) : undefined))
                .catch((error: unknown) => {
                    console.warn('[MenuChantier] Capture photo annulée ou impossible.', error);
                });
            return;
        }
        if (hasWebcamApi()) {
            setWebcamOpen(true);
            return;
        }
        fallbackInputRef.current?.click();
    };

    const cameraOverlay = webcamOpen ? (
        <WebcamCapture
            t={t}
            onClose={() => setWebcamOpen(false)}
            onFallback={() => {
                setWebcamOpen(false);
                fallbackInputRef.current?.click();
            }}
            onCapture={(photo) => {
                setWebcamOpen(false);
                onPhotos([photo]);
            }}
        />
    ) : null;

    return { openCamera, cameraOverlay };
};
