import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DrawerService, DrawerConfig } from './drawer.service';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: '<div>Dummy</div>'
})
class DummyComponent {}

describe('DrawerService', () => {
  let service: DrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DrawerService]
    });
    service = TestBed.inject(DrawerService);
  });

  it('should start closed with null config', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.config()).toBeNull();
  });

  it('should open the drawer with config', () => {
    const config: DrawerConfig = {
      title: 'Test Title',
      component: DummyComponent,
      width: 'half'
    };

    service.open(config);

    expect(service.isOpen()).toBe(true);
    expect(service.config()).toEqual(config);
  });

  it('should close the drawer and call onClose callback after timeout', fakeAsync(() => {
    const onCloseSpy = jest.fn();
    const config: DrawerConfig = {
      title: 'Test Title',
      component: DummyComponent,
      onClose: onCloseSpy
    };

    service.open(config);
    service.close();

    expect(service.isOpen()).toBe(false);
    expect(service.config()).not.toBeNull(); 

    tick(300);

    expect(service.config()).toBeNull();
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  }));
});
