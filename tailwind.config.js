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
                    dark: '#D01510',
                    light: '#FF4D3A',
                },
            },
        },
    },
    plugins: [],
}
