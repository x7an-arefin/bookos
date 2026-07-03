import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { WorkspaceStore } from '../../../store/workspace.store';
import { ElectronService } from '../../../core/services/electron.service';
import { SettingsStore } from '../../../features/settings/settings.store';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

/**
 * AppShellComponent — premium two-column layout shell.
 *
 * Layout:
 *   Left: collapsible sidebar (logo, nav, project status, theme/collapse toggles)
 *   Right: main content area with sticky top bar + router outlet
 *
 * UX Rules:
 *   - Inter-module navigation uses router links
 *   - Intra-module actions (form, list) open via DrawerService full-screen drawer
 *   - Sidebar collapses to icon-only mode, persisted to localStorage
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    :host { display: contents; }

    .sidebar {
      width: 240px;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar.collapsed {
      width: 56px;
    }

    .nav-label, .logo-text, .bottom-label, .status-block {
      transition: opacity 0.15s ease, width 0.25s ease;
      white-space: nowrap;
      overflow: hidden;
    }
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .logo-text,
    .sidebar.collapsed .bottom-label,
    .sidebar.collapsed .status-block {
      opacity: 0;
      width: 0;
      pointer-events: none;
    }
  `],
  template: `
    <div class="flex h-screen overflow-hidden bg-background">

      <!-- ── Sidebar ───────────────────────────────────────────────────────── -->
      <aside
        class="sidebar flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border relative"
        [class.collapsed]="collapsed()"
      >

        <!-- Logo -->
        <div class="flex items-center gap-3 px-3 h-14 border-b border-sidebar-border shrink-0 overflow-hidden">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          </div>
          <span class="logo-text font-semibold text-sm text-sidebar-foreground tracking-tight">
            BookOS
          </span>
        </div>

        <!-- Nav -->
        <nav class="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto overflow-x-hidden mt-1">
          @for (item of navItems; track item.label) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="group flex items-center gap-3 px-2.5 py-2 rounded-md text-sm
                     text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                     transition-all duration-150 cursor-pointer overflow-hidden"
              [title]="collapsed() ? item.label : ''"
            >
              <svg class="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="item.icon" />
              </svg>
              <span class="nav-label text-sm">{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Project status (when open) -->
        @if (workspaceStore.hasOpenProject()) {
          <div class="status-block mx-2 mb-2 px-3 py-2.5 rounded-md bg-sidebar-accent/50 border border-sidebar-border overflow-hidden">
            <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">
              Active Project
            </p>
            <p class="text-xs font-semibold text-sidebar-foreground truncate">
              {{ workspaceStore.projectTitle() }}
            </p>
            <p class="text-[10px] text-muted-foreground mt-0.5">
              {{ workspaceStore.chapterCount() }} chapters
            </p>
          </div>
        }

        <!-- Bottom Controls -->
        <div class="p-2 border-t border-sidebar-border space-y-0.5 shrink-0">

          <!-- Theme toggle -->
          <button
            (click)="toggleTheme()"
            class="group flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-sm
                   text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                   transition-all duration-150 overflow-hidden"
            [title]="collapsed() ? (theme.isDark() ? 'Switch to Light' : 'Switch to Dark') : ''"
          >
            <svg class="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @if (theme.isDark()) {
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              } @else {
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              }
            </svg>
            <span class="bottom-label text-sm">{{ theme.isDark() ? 'Dark mode' : 'Light mode' }}</span>
          </button>

          <!-- Collapse toggle -->
          <button
            (click)="toggleCollapse()"
            class="group flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-sm
                   text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                   transition-all duration-150 overflow-hidden"
            [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <svg class="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-transform duration-250"
                 [class.rotate-180]="collapsed()"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            <span class="bottom-label text-sm">Collapse</span>
          </button>
        </div>
      </aside>

      <!-- ── Main ──────────────────────────────────────────────────────────── -->
      <main class="flex-1 flex flex-col overflow-hidden min-w-0">

        <!-- Top bar -->
        <header class="flex items-center gap-4 px-5 h-14 border-b border-border shrink-0
                       bg-background/80 backdrop-blur-md sticky top-0 z-10">

          <!-- Page title (computed from workspace) -->
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-medium text-foreground truncate">{{ pageTitle() }}</h1>
            @if (workspaceStore.hasOpenProject()) {
              <p class="text-xs text-muted-foreground truncate">{{ workspaceStore.folderPath() }}</p>
            }
          </div>

          <!-- Save status indicator -->
          @if (workspaceStore.hasOpenProject()) {
            <div class="flex items-center gap-3 shrink-0">
              
              <!-- Cloud Sync Indicator (Browser only) -->
              @if (!electron.isElectron()) {
                <button
                  (click)="handleSyncClick()"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-muted/50 transition-colors"
                  [class]="getSyncClass()"
                  [title]="'Sync status: ' + settingsStore.syncStatus() + '. Click for actions.'"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.47 0-.89.09-1.32.27A7.5 7.5 0 0 0 4 11.5a4.5 4.5 0 0 0 4 7.5z"/>
                  </svg>
                  <span class="capitalize">{{ settingsStore.syncStatus() }}</span>
                </button>
              }

              @if (workspaceStore.isSaving()) {
                <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Saving…
                </span>
              } @else if (workspaceStore.isDirty()) {
                <span class="flex items-center gap-1.5 text-xs text-amber-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Unsaved changes
                </span>
              } @else {
                <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Saved
                </span>
              }
            </div>
          }
        </header>

        <!-- Feature router outlet -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  readonly theme = inject(ThemeService);
  readonly workspaceStore = inject(WorkspaceStore);
  readonly electron = inject(ElectronService);
  readonly settingsStore = inject(SettingsStore);

  /** Sidebar collapse state — persisted to localStorage */
  collapsed = signal<boolean>(
    localStorage.getItem('bookos-sidebar-collapsed') === 'true'
  );

  readonly pageTitle = computed(() => {
    const proj = this.workspaceStore.project();
    return proj?.meta?.title ?? 'BookOS';
  });

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      exact: true,
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    },
    {
      label: 'Editor',
      path: '/editor',
      icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    },
    {
      label: 'Export',
      path: '/export',
      icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
    },
    {
      label: 'Assets',
      path: '/assets',
      icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    },
    {
      label: 'Import',
      path: '/import',
      icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2',
    },
  ];

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => {
      const next = !v;
      localStorage.setItem('bookos-sidebar-collapsed', String(next));
      return next;
    });
  }

  getSyncClass(): string {
    switch (this.settingsStore.syncStatus()) {
      case 'synced':
        return 'text-emerald-500';
      case 'syncing':
        return 'text-amber-500 animate-pulse';
      case 'conflict':
        return 'text-destructive font-semibold';
      case 'offline':
        return 'text-muted-foreground';
      default:
        return 'text-foreground/80';
    }
  }

  handleSyncClick() {
    if (this.settingsStore.syncStatus() === 'conflict') {
      this.workspaceStore.saveProject();
    } else if (this.settingsStore.syncStatus() === 'offline') {
      this.settingsStore.syncNow();
    }
  }
}
