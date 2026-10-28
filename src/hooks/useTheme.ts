import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wist-atlas-theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const current = document.documentElement.dataset.theme;
  if (current === 'dark' || current === 'light') return current;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // 隐私模式下 localStorage 可能直接抛错；退回系统偏好。
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 主题只做一件事：把 data-theme 写到 <html>。
 * 所有颜色都走 index.css 里的语义令牌，组件不需要写 dark: 变体。
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // 存不下就算了，不影响本次会话。
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
