import React, { SVGProps } from 'react';

const SvgIcon = ({ children, className, ...props }: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        {children}
    </svg>
);

export const MapPin = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </SvgIcon>
);

export const FileText = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
    </SvgIcon>
);

export const Activity = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </SvgIcon>
);

export const ClipboardEdit = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l.99-3.95 5.43-5.44Z" />
    </SvgIcon>
);

export const Navigation = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </SvgIcon>
);

export const Camera = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
    </SvgIcon>
);

export const Phone = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </SvgIcon>
);

export const X = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
    </SvgIcon>
);

export const User = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </SvgIcon>
);

export const FileCheck = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 11" />
    </SvgIcon>
);

export const Image = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </SvgIcon>
);

export const ArrowLeft = (props: SVGProps<SVGSVGElement>) => (
    <SvgIcon {...props}>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
    </SvgIcon>
);
