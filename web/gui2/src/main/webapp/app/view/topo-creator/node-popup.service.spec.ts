import { TestBed } from '@angular/core/testing';

import { NodePopupService } from './node-popup.service';

describe('NodePopupService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NodePopupService = TestBed.get(NodePopupService);
    expect(service).toBeTruthy();
  });
});
