import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { AppDrawerHostComponent } from './shared/ui/drawer/app-drawer-host.component';
import { ZardToastComponent } from './shared/ui/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppDrawerHostComponent, ZardToastComponent],
  template: `
    <div [class]="hostClass()" style="height:100vh;overflow:hidden;">
      <router-outlet />
      <app-drawer-host />
      <z-toast
        position="bottom-right"
        [richColors]="true"
        [closeButton]="true"
        [duration]="4000"
      />
    </div>
  `,
  styles: [`:host { display: block; height: 100vh; overflow: hidden; }`],
})
export class AppComponent implements OnInit {
  private readonly theme = inject(ThemeService);

  hostClass = computed(() =>
    `${this.theme.isDark() ? 'dark' : 'light'} h-full bg-background text-foreground antialiased`
  );

  ngOnInit(): void {
    this.theme.applyToDocument();
  }
}
