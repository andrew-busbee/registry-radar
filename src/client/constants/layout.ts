/**
 * Layout constants for consistent spacing and sizing across the application
 */
export const LAYOUT = {
  // Sidebar dimensions
  SIDEBAR_WIDTH: 'w-64', // 256px
  SIDEBAR_WIDTH_PX: 256,
  
  // Header dimensions
  HEADER_HEIGHT: 'h-16', // 64px
  HEADER_HEIGHT_PX: 64,
  
  // Content spacing
  CONTENT_PADDING: 'p-6',
  CONTENT_MARGIN: 'ml-64',
  CONTENT_TOP_PADDING: 'pt-32', // 128px to account for fixed header
  
  // Z-index layers
  Z_INDEX: {
    SIDEBAR: 10,
    HEADER: 20,
    MODAL: 50,
    PROGRESS_BAR: 50,
    TOAST: 60,
  },
  
  // Breakpoints (matching Tailwind defaults)
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
} as const;

/**
 * CSS custom properties for dynamic layout values
 */
export const CSS_VARS = {
  '--sidebar-width': `${LAYOUT.SIDEBAR_WIDTH_PX}px`,
  '--header-height': `${LAYOUT.HEADER_HEIGHT_PX}px`,
  '--content-padding': '1.5rem',
} as const;
