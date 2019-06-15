/*
 *  Copyright 2018-present Open Networking Foundation
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { TestBed, inject } from '@angular/core/testing';

import { LogService } from '../log.service';
import { ConsoleLoggerService } from '../consolelogger.service';
import { LoadingService } from './loading.service';
import { FnService } from '../util/fn.service';
import { ThemeService } from '../util/theme.service';
import { WebSocketService } from '../remote/websocket.service';

class MockFnService {
    debug() {
    }
}

class MockThemeService {}

/**
 * ONOS GUI -- Layer -- Loading Service - Unit Tests
 */
describe('LoadingService', () => {
    let log: LogService;
    let mockWindow: Window;

    beforeEach(() => {
        log = new ConsoleLoggerService();

        mockWindow = <any>{
            innerWidth: 400,
            innerHeight: 200,
            navigator: {
                userAgent: 'defaultUA'
            }
        };

        TestBed.configureTestingModule({
            providers: [LoadingService,
                { provide: LogService, useValue: log },
                { provide: FnService, useClass: MockFnService },
                { provide: ThemeService, useClass: MockThemeService },
                { provide: 'Window', useFactory: (() => mockWindow ) }
            ]
        });
    });

    it('should be created', inject([LoadingService], (service: LoadingService) => {
        expect(service).toBeTruthy();
    }));
});
