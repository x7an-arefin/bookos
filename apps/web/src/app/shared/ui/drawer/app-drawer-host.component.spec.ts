import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppDrawerHostComponent } from './app-drawer-host.component';
import { DrawerService } from '../../services/drawer.service';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';

@Component({
  standalone: true,
  template: '<div class="dummy-content">Dummy component with input: {{ val }}</div>'
})
class DummyComponent {
  @Input() val = '';
}

describe('AppDrawerHostComponent', () => {
  let component: AppDrawerHostComponent;
  let fixture: ComponentFixture<AppDrawerHostComponent>;
  let drawerService: DrawerService;

  beforeEach(async () => {
    AppDrawerHostComponent.isTesting = true;
    await TestBed.configureTestingModule({
      imports: [AppDrawerHostComponent],
      providers: [DrawerService]
    }).compileComponents();

    fixture = TestBed.createComponent(AppDrawerHostComponent);
    component = fixture.componentInstance;
    drawerService = TestBed.inject(DrawerService);
    fixture.detectChanges();
  });

  afterEach(() => {
    AppDrawerHostComponent.isTesting = false;
  });

  it('should not render backdrop or panel if closed', () => {
    const backdrop = fixture.debugElement.query(By.css('.bg-black\\/60'));
    expect(backdrop).toBeNull();
  });

  it('should render backdrop and panel when drawer opens', () => {
    drawerService.open({
      title: 'Drawer Title',
      component: DummyComponent,
      inputs: { val: 'Hello' }
    });
    fixture.detectChanges();

    const backdrop = fixture.debugElement.query(By.css('[aria-hidden="true"]'));
    expect(backdrop).not.toBeNull();

    const titleEl = fixture.debugElement.query(By.css('h2'));
    expect(titleEl.nativeElement.textContent.trim()).toBe('Drawer Title');

    const dummyEl = fixture.debugElement.query(By.css('.dummy-content'));
    expect(dummyEl).not.toBeNull();
    expect(dummyEl.nativeElement.textContent).toContain('Hello');
  });

  it('should call drawerService.close() when clicking backdrop', fakeAsync(() => {
    jest.spyOn(drawerService, 'close');
    drawerService.open({
      title: 'Drawer Title',
      component: DummyComponent
    });
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0.z-40') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(drawerService.close).toHaveBeenCalledTimes(1);
    tick(500);
  }));

  it('should call drawerService.close() when clicking close button', fakeAsync(() => {
    jest.spyOn(drawerService, 'close');
    drawerService.open({
      title: 'Drawer Title',
      component: DummyComponent
    });
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('button[aria-label="Close drawer"]') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();

    expect(drawerService.close).toHaveBeenCalledTimes(1);
    tick(500);
  }));

  it('should call drawerService.close() when pressing Escape key', fakeAsync(() => {
    jest.spyOn(drawerService, 'close');
    drawerService.open({
      title: 'Drawer Title',
      component: DummyComponent
    });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(drawerService.close).toHaveBeenCalledTimes(1);
    tick(500);
  }));

  it('should destroy component and clean up panel after close timeout', () => {
    drawerService.open({
      title: 'Drawer Title',
      component: DummyComponent
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.dummy-content'))).not.toBeNull();

    drawerService.close();
    fixture.detectChanges();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.dummy-content'))).toBeNull();
  });
});
