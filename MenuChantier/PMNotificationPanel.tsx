import React from 'react';
import { FileText, Wrench, Info, X } from 'lucide-react';
import { t, Lang } from './i18n';

export type PMNotifType = 'Nouveau document' | 'Indication de montage' | 'Information général';

export interface PMNotification {
    type: PMNotifType;
    line1: string;
    line2: string;
}

interface BannerProps {
    notification: PMNotification;
    lang: Lang;
    onOpen: () => void;
}

interface PanelProps {
    notification: PMNotification;
    lang: Lang;
    isOpen: boolean;
    onClose: () => void;
}

const TYPE_CONFIG: Record<PMNotifType, {
    icon: React.ReactNode;
    bgColor: string;
    iconColor: string;
    borderColor: string;
    shadowColor: string;
}> = {
    'Nouveau document': {
        icon: <FileText size={22} />,
        bgColor: '#EFF6FF',
        iconColor: '#1D4ED8',
        borderColor: '#BFDBFE',
        shadowColor: 'rgba(29,78,216,0.12)',
    },
    'Indication de montage': {
        icon: <Wrench size={22} />,
        bgColor: '#FFF7ED',
        iconColor: '#C2410C',
        borderColor: '#FED7AA',
        shadowColor: 'rgba(194,65,12,0.12)',
    },
    'Information général': {
        icon: <Info size={22} />,
        bgColor: '#F0FDF4',
        iconColor: '#15803D',
        borderColor: '#BBF7D0',
        shadowColor: 'rgba(21,128,61,0.12)',
    },
};

function getTypeLabel(type: PMNotifType, lang: Lang): string {
    if (type === 'Nouveau document') return t('pm_notif_type_new_doc', lang);
    if (type === 'Indication de montage') return t('pm_notif_type_assembly', lang);
    return t('pm_notif_type_general', lang);
}

export function PMNotificationBanner({ notification, lang, onOpen }: BannerProps) {
    const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG['Information général'];
    const typeLabel = getTypeLabel(notification.type, lang);

    return (
        <button
            onClick={onOpen}
            style={{
                width: '100%',
                textAlign: 'left',
                background: '#fff',
                borderRadius: 20,
                border: `1px solid ${cfg.borderColor}`,
                boxShadow: `0 2px 16px ${cfg.shadowColor}`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 16,
                cursor: 'pointer',
            }}
        >
            <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: cfg.bgColor,
                color: cfg.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                {cfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: cfg.iconColor,
                    marginBottom: 2,
                }}>
                    {typeLabel}
                </div>
                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1a1a2e',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                }}>
                    {notification.line1}
                </div>
                <div style={{
                    fontSize: 13,
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                }}>
                    {notification.line2}
                </div>
            </div>
            <div style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                background: cfg.bgColor,
                color: cfg.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 18,
                fontWeight: 700,
            }}>
                ›
            </div>
        </button>
    );
}

export function PMNotificationPanel({ notification, lang, isOpen, onClose }: PanelProps) {
    if (!isOpen) return null;

    const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG['Information général'];
    const typeLabel = getTypeLabel(notification.type, lang);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '28px 28px 0 0',
                    maxHeight: 'calc(92dvh - 70px)',
                    marginBottom: 70,
                    overflowY: 'auto' as const,
                    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
                }}
            >
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px 16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: cfg.bgColor,
                            color: cfg.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {cfg.icon}
                        </div>
                        <div>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase' as const,
                                color: cfg.iconColor,
                            }}>
                                {typeLabel}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
                                {t('pm_notification_title', lang)}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: '#F4F4F6',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#555',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#F0F0F0', marginBottom: 24 }} />

                {/* Message body */}
                <div style={{ padding: '0 20px 32px' }}>
                    <div style={{
                        background: cfg.bgColor,
                        border: `1px solid ${cfg.borderColor}`,
                        borderRadius: 16,
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column' as const,
                        gap: 12,
                    }}>
                        <p style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#1a1a2e',
                            lineHeight: 1.5,
                        }}>
                            {notification.line1}
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: 15,
                            color: '#444',
                            lineHeight: 1.6,
                        }}>
                            {notification.line2}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
