import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkErrorPopupComponent } from './link-error-popup.component';

describe('LinkErrorPopupComponent', () => {
  let component: LinkErrorPopupComponent;
  let fixture: ComponentFixture<LinkErrorPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LinkErrorPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LinkErrorPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
