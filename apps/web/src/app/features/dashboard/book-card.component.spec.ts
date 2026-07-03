import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookCardComponent } from './book-card.component';
import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import type { BookProject } from '@press/core';

const mockBookProject: BookProject = {
  id: 'book-1',
  meta: {
    title: 'Testing Book',
    subtitle: 'A subtitle here',
    author: 'John Doe',
    genre: 'Fiction',
    language: 'en'
  },
  config: {
    global: {},
    targets: {},
    activeTheme: 'default'
  },
  frontMatterSections: [],
  chapters: [
    { id: 'ch-1', title: 'Chapter 1', sortOrder: 1, contentMarkdown: 'Word1 Word2 Word3', lastModified: '' },
    { id: 'ch-2', title: 'Chapter 2', sortOrder: 2, contentMarkdown: 'Word4 Word5', lastModified: '' }
  ],
  backMatterSections: [],
  assets: [],
  exportHistory: [],
  createdAt: '',
  updatedAt: ''
};

@Component({
  standalone: true,
  imports: [BookCardComponent],
  template: `
    <app-book-card
      [project]="project"
      (cardClicked)="onCardClicked($event)"
      (openEditor)="onOpenEditor($event)"
    />
  `
})
class TestHostComponent {
  project = mockBookProject;
  onCardClicked = jest.fn();
  onOpenEditor = jest.fn();
}

describe('BookCardComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, DecimalPipe]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render book details correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Testing Book');
    expect(compiled.querySelector('p')?.textContent).toContain('A subtitle here');
    expect(compiled.querySelector('span')?.textContent).toContain('Fiction');
    
    const statsText = compiled.textContent || '';
    expect(statsText).toContain('2 ch');
    expect(statsText).toContain('5 words');
    expect(statsText).toContain('John Doe');
  });

  it('should emit cardClicked on card container click', () => {
    const cardElement = fixture.nativeElement.querySelector('.group') as HTMLElement;
    cardElement.click();

    expect(hostComponent.onCardClicked).toHaveBeenCalledWith(mockBookProject);
  });

  it('should emit openEditor when open button is clicked', () => {
    const openButton = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    openButton.click();

    expect(hostComponent.onOpenEditor).toHaveBeenCalledWith(mockBookProject);
  });
});
