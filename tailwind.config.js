module.exports = {
    content: ["./**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                'salon-primary': {
                    50: '#e6f0eb',
                    100: '#cce1d7',
                    200: '#99c3af',
                    300: '#66a587',
                    400: '#33875f',
                    500: '#00571f', // Main primary
                    600: '#004619',
                    700: '#003413',
                    800: '#00230c',
                    900: '#001106'
                },
                'salon-secondary': {
                    50: '#fcf9f0',
                    100: '#f9f3e1',
                    200: '#f3e7c3',
                    300: '#eeda9e',
                    400: '#e3c264', // Main secondary
                    500: '#dcb54a',
                    600: '#c6a342',
                    700: '#8f7630',
                    800: '#574821',
                    900: '#2c2411'
                },
                'apple-gray': '#E5E5E7',
                'apple-gray-light': '#F5F5F7',
                'apple-text': '#1D1D1F',
                'apple-secondary': '#86868B'
            }
        }
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            {
                light: {
                    "primary": "#00571f",
                    "primary-focus": "#004619",
                    "primary-content": "#ffffff",
                    
                    "secondary": "#e3c264",
                    "secondary-focus": "#dcb54a",
                    "secondary-content": "#000000",
                    
                    "accent": "#66a587",
                    "accent-focus": "#99c3af",
                    "accent-content": "#000000",
                    
                    "neutral": "#2c2411",
                    "neutral-focus": "#574821",
                    "neutral-content": "#ffffff",
                    
                    "base-100": "#fcf9f0",
                    "base-200": "#f9f3e1",
                    "base-300": "#f3e7c3",
                    "base-content": "#2c2411",
                    
                    "info": "#66a587",
                    "success": "#00571f",
                    "warning": "#e3c264",
                    "error": "#dc2626",
                    
                    "--rounded-box": "0.5rem",
                    "--rounded-btn": "0.3rem",
                    "--rounded-badge": "1.9rem",
                    "--animation-btn": "0.5s",
                    "--animation-input": "0.5s",
                    "--btn-focus-scale": "1.05",
                    "--border-btn": "2px",
                    "--tab-border": "2px",
                    "--tab-radius": "0.5rem",
                },
                dark: {
                    "primary": "#00571f",
                    "primary-focus": "#66a587",
                    "primary-content": "#ffffff",
                    
                    "secondary": "#e3c264",
                    "secondary-focus": "#eeda9e",
                    "secondary-content": "#000000",
                    
                    "accent": "#66a587",
                    "accent-focus": "#99c3af",
                    "accent-content": "#ffffff",
                    
                    "neutral": "#2c2411",
                    "neutral-focus": "#574821",
                    "neutral-content": "#ffffff",
                    
                    "base-100": "#1a1a1a",
                    "base-200": "#242424",
                    "base-300": "#2e2e2e",
                    "base-content": "#f3e7c3",
                    
                    "info": "#66a587",
                    "success": "#00571f",
                    "warning": "#e3c264",
                    "error": "#dc2626",
                    
                    "--rounded-box": "0.5rem",
                    "--rounded-btn": "0.3rem",
                    "--rounded-badge": "1.9rem",
                    "--animation-btn": "0.5s",
                    "--animation-input": "0.5s",
                    "--btn-focus-scale": "1.05",
                    "--border-btn": "2px",
                    "--tab-border": "2px",
                    "--tab-radius": "0.5rem",
                }
            }
        ]
    }
}
