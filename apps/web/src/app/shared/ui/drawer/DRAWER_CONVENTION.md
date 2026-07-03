# Drawer Component Convention

Any component loaded dynamically inside the full-screen left drawer via `DrawerService.open()` should follow these guidelines:

## Width Configuration
Drawers support three responsive widths:
- `full` (100vw): For large forms or complex view panels.
- `two-thirds` (67vw): For tables, structured lists, and splits.
- `half` (50vw): For simpler edit forms, metadata updates, and detail panels.

## Communication
- **Inputs**: Pass initial data using Angular signal inputs `input()` and map them using the `inputs` configuration property in `DrawerConfig`.
- **Close Action**: Inject `DrawerService` and trigger `drawerService.close()` to slide the panel away.

## Change Detection
Always use `ChangeDetectionStrategy.OnPush` for optimal performance with zoneless Angular.

---

## Example/Stub Template

```typescript
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DrawerService } from '../../services/drawer.service';

@Component({
  selector: 'app-drawer-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 space-y-4">
      <h3 class="text-lg font-medium">Stub Drawer</h3>
      <p>Loaded component inputs: {{ data() }}</p>
      <button (click)="drawer.close()" class="px-4 py-2 bg-primary text-white rounded">Close</button>
    </div>
  `
})
export class DrawerStubComponent {
  readonly drawer = inject(DrawerService);
  readonly data = input<string>('');
}
```
