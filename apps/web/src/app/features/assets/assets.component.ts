import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({ selector: 'app-assets', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="p-8"><h1 class="text-2xl font-semibold font-serif">Assets</h1><p class="text-muted-foreground text-sm mt-2">Full implementation in Task Group 27.</p></div>` })
export class AssetsComponent {}
