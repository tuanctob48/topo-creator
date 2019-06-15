import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkConfigurationComponent } from './link-configuration.component';

describe('LinkConfigurationComponent', () => {
  let component: LinkConfigurationComponent;
  let fixture: ComponentFixture<LinkConfigurationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LinkConfigurationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LinkConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
