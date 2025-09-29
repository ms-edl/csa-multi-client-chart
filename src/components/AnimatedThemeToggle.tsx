import { useCallback } from 'react';
import { useTheme } from '../ThemeContext';

// Moon and Sun icons from Lucide React
const Moon = ({ className = "h-[1.2rem] w-[1.2rem]" }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const Sun = ({ className = "h-[1.2rem] w-[1.2rem]" }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export function AnimatedThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleClick = useCallback(() => {
    // Create unique style ID for this transition
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement('style');
    style.id = styleId;

    // Add polygon wipe animation styles
    const css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) {
          animation: none;
        }
        ::view-transition-new(root) {
          animation: ${theme === 'light' ? 'wipe-in-dark' : 'wipe-in-light'} 0.4s ease-out;
        }
        @keyframes wipe-in-dark {
          from {
            clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
          }
          to {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }
        @keyframes wipe-in-light {
          from {
            clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
          }
          to {
            clip-path: polygon(100% 0, 0 0, 0 100%, 100% 100%);
          }
        }
      }
    `;
    style.textContent = css;
    document.head.appendChild(style);

    // Start the view transition
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        toggleTheme();
      });
    } else {
      toggleTheme();
    }

    // Clean up styles after transition
    setTimeout(() => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    }, 1000);
  }, [theme, toggleTheme]);

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-surface-action hover:bg-surface-action--hover transition-colors text-content-primary"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
}
