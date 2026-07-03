import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({ selector: 'app-import', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="p-8"><h1 class="text-2xl font-semibold font-serif">Import</h1><p class="text-muted-foreground text-sm mt-2">ZIP / DOCX / EPUB import — coming in Task Group 27.</p></div>` })
export class ImportComponent {}
