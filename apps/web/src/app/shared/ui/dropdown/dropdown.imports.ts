import { ZardDropdownMenuItemComponent } from '@/shared/ui/dropdown/dropdown-item.component';
import { ZardDropdownMenuContentComponent } from '@/shared/ui/dropdown/dropdown-menu-content.component';
import { ZardDropdownDirective } from '@/shared/ui/dropdown/dropdown-trigger.directive';
import { ZardDropdownMenuComponent } from '@/shared/ui/dropdown/dropdown.component';
import { ZardMenuLabelComponent } from '@/shared/ui/menu/menu-label.component';

export const ZardDropdownImports = [
  ZardDropdownMenuComponent,
  ZardDropdownMenuItemComponent,
  ZardMenuLabelComponent,
  ZardDropdownMenuContentComponent,
  ZardDropdownDirective,
] as const;
