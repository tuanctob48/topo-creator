import { TestBed } from '@angular/core/testing';

import { OvsMeshService} from './ovs-mesh-service.service';

describe('OvsMeshServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OvsMeshService= TestBed.get(OvsMeshService);
    expect(service).toBeTruthy();
  });
});
