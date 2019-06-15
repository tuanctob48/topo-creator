import { TestBed } from '@angular/core/testing';

import { DefaultConfigurationService } from './default-configuration.service';

describe('DefaultConfigurationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DefaultConfigurationService = TestBed.get(DefaultConfigurationService);
    expect(service).toBeTruthy();
  });
});
