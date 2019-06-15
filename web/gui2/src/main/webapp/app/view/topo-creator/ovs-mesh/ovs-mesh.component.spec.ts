import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OvsMeshComponent } from './ovs-mesh.component';

describe('OvsMeshComponent', () => {
  let component: OvsMeshComponent;
  let fixture: ComponentFixture<OvsMeshComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OvsMeshComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OvsMeshComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
