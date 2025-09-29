import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-secondary hover:bg-accent transition-colors duration-200 flex items-center justify-center group relative overflow-hidden"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Moon emoji - show when in light mode (to switch to dark) */}
        <span 
          className={`text-lg transition-all duration-300 absolute inset-0 flex items-center justify-center ${
            theme === 'light' 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-90 scale-0 opacity-0'
          }`}
        >
          🌙
        </span>
        {/* Sun emoji - show when in dark mode (to switch to light) */}
        <span 
          className={`text-lg transition-all duration-300 absolute inset-0 flex items-center justify-center ${
            theme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0'
          }`}
        >
          ☀️
        </span>
      </div>
    </button>
  );
}
