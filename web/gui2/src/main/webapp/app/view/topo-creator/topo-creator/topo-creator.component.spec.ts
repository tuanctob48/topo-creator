import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TopoCreatorComponent } from './topo-creator.component';
import { TopMenuComponent } from '../topmenu/topmenu.component';

describe('TopoCreatorComponent', () => {
  let component: TopoCreatorComponent;
  let fixture: ComponentFixture<TopoCreatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TopoCreatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TopoCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
