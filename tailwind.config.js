/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '375px',    // iPhone SE وأصغر
      'sm': '640px',    // أجهزة صغيرة
      'md': '768px',    // أجهزة متوسطة
      'lg': '1024px',   // أجهزة كبيرة
      'xl': '1280px',   // شاشات كبيرة
      '2xl': '1536px',  // شاشات كبيرة جداً
    },
    extend: {
      colors: {
        brand: {
          dark: "#14532d", // أخضر غامق
          DEFAULT: "#16a34a", // أخضر أساسي
          light: "#bbf7d0", // أخضر فاتح
          accent: "#f97316", // برتقالي دافئ
          gold: "#fbbf24", // ذهبي
        },
        hsa: {
          light: "#9FE7F5", // أزرق فاتح جداً - للخلفيات الفاتحة
          medium: "#429EBD", // أزرق متوسط - للعناصر الأساسية
          dark: "#053F5C", // أزرق داكن جداً - للنصوص والعناوين
          gold: "#F7AD19", // برتقالي ذهبي - للتمييز
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      fontSize: {
        'xs-mobile': ['0.75rem', { lineHeight: '1.5' }],
        'sm-mobile': ['0.875rem', { lineHeight: '1.5' }],
        'base-mobile': ['1rem', { lineHeight: '1.6' }],
      },
      boxShadow: {
        "soft-lg": "0 18px 45px rgba(15,23,42,0.12)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};


