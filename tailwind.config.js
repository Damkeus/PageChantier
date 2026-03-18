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
            },
        },
    },
    plugins: [],
}
