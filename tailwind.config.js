/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./MenuChantier/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        screens: {
            'tablet': '481px',
            'desktop': '769px',
        },
        extend: {
            colors: {
                nexans: {
                    DEFAULT: '#FF1910',
                    dark: '#E0150E',
                    light: '#FF1910',
                },
                // Palette du redesign « schéma connecté » (handoff Claude Design)
                ink: '#16181c',
                surface: {
                    plate: '#f8f9fa',
                    tile: '#f1f3f4',
                    tilePressed: '#e5e7eb',
                },
                line: {
                    DEFAULT: '#e8eaed',
                    muted: '#dadce0',
                },
                slate2: {
                    strong: '#5f6368',
                    DEFAULT: '#80868b',
                    soft: '#9aa0a6',
                },
            },
        },
    },
    plugins: [],
}
