<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    />
    
    <!-- FIXED: Mobile Viewport & PWA Tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="EviroSafe" />

    <!-- Clean Title -->
    <title>EviroSafe | Next-Gen HSE Command Center</title>

    <meta
      name="description"
      content="EviroSafe 3.0 - The intelligent HSE management platform for modern construction and industrial sites."
    />
    <meta name="theme-color" content="#020617" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg-color: #f8fafc;
        --text-color: #0f172a;
      }
      .dark {
        --bg-color: #020617;
        --text-color: #f8fafc;
      }

      body {
        background-color: var(--bg-color);
        color: var(--text-color);
        transition: background-color 0.3s ease, color 0.3s ease;
        overscroll-behavior-y: none; /* Prevents pull-to-refresh on mobile */
      }

      /* Glassmorphism utilities */
      .dark .glass {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .glass {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .glass-panel {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      .dark .glass-panel {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* Custom Scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .dark ::-webkit-scrollbar-thumb {
        background: #334155;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .dark ::-webkit-scrollbar-thumb:hover {
        background: #475569;
      }
    </style>
    <script type="importmap">
      {
        "imports": {
          "react": "https://aistudiocdn.com/react@^19.2.0",
          "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
          "react/": "https://aistudiocdn.com/react@^19.2.0/",
          "@google/genai": "https://aistudiocdn.com/@google/genai@^1.30.0",
          "react-markdown": "https://aistudiocdn.com/react-markdown@^10.1.0",
          "recharts": "https://aistudiocdn.com/recharts@^3.5.0",
          "vite": "https://aistudiocdn.com/vite@^7.2.4",
          "@vitejs/plugin-react": "https://aistudiocdn.com/@vitejs/plugin-react@^5.1.1"
        }
      }
    </script>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body class="font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>