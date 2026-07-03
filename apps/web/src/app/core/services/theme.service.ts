import { Injectable, OnDestroy, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private readonly _isDark = signal(this.resolveInitialTheme());
  private readonly _mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly _mediaListener: ((e: MediaQueryListEvent) => void) | null;

  readonly isDark = this._isDark.asReadonly();

  constructor() {
    effect(() => {
      localStorage.setItem('bookos-theme', this._isDark() ? 'dark' : 'light');
      this.applyToDocument();
    });

    this._mediaListener = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('bookos-theme');
      if (!saved) {
        this._isDark.set(e.matches);
      }
    };

    this._mediaQuery?.addEventListener('change', this._mediaListener);
  }

  toggle(): void {
    this._isDark.update((v) => !v);
  }

  setDark(dark: boolean): void {
    this._isDark.set(dark);
  }

  applyToDocument(): void {
    const html = document.documentElement;
    if (this._isDark()) {
      html.classList.add('dark');
      html.classList.remove('light');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }

  ngOnDestroy(): void {
    if (this._mediaListener) {
      this._mediaQuery?.removeEventListener('change', this._mediaListener);
    }
  }

  private resolveInitialTheme(): boolean {
    const saved = localStorage.getItem('bookos-theme');
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  }
}
