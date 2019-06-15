/*
 * Copyright 2018-present Open Networking Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges, Output,
    SimpleChanges,
} from '@angular/core';
import {Device, LabelToggle, UiElement} from '../../models';
import {IconService, LocMeta, LogService, MetaUi, ZoomUtils} from 'gui2-fw-lib';
import {NodeVisual} from '../nodevisual';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {LocationType} from '../../../backgroundsvg/backgroundsvg.component';

/**
 * The Device node in the force graph
 *
 * Note: here the selector is given square brackets [] so that it can be
 * inserted in SVG element like a directive
 */
@Component({
    selector: '[onos-devicenodesvg]',
    templateUrl: './devicenodesvg.component.html',
    styleUrls: ['./devicenodesvg.component.css'],
    changeDetection: ChangeDetectionStrategy.Default,
    animations: [
        trigger('deviceLabelToggle', [
            state('0', style({ // none
                width: '36px',
            })),
            state('1, 2', // id
                style({ width: '{{ txtWidth }}'}),
                { params: {'txtWidth': '36px'}}
            ), // default
            transition('0 => 1', animate('250ms ease-in')),
            transition('1 => 2', animate('250ms ease-in')),
            transition('* => 0', animate('250ms ease-out'))
        ]),
        trigger('deviceLabelToggleTxt', [
            state('0', style( {
                opacity: 0,
            })),
            state( '1,2', style({
                opacity: 1.0
            })),
            transition('0 => 1', animate('250ms ease-in')),
            transition('* => 0', animate('250ms ease-out'))
        ])
    ]
})
export class DeviceNodeSvgComponent extends NodeVisual implements OnChanges {
    @Input() device: Device;
    @Input() scale: number = 1.0;
    @Input() labelToggle: LabelToggle.Enum = LabelToggle.Enum.NONE;
    @Output() selectedEvent = new EventEmitter<UiElement>();
    textWidth: number = 36;
    constructor(
        protected log: LogService,
        private is: IconService,
        private ref: ChangeDetectorRef
    ) {
        super();
    }

    /**
     * Called by parent (forcesvg) when a change happens
     *
     * There is a difficulty in passing the SVG text object to the animation
     * directly, to get its width, so we capture it here and update textWidth
     * local variable here and use it in the animation
     */
    ngOnChanges(changes: SimpleChanges) {
        if (changes['device']) {
            if (!this.device.x) {
                this.device.x = 0;
                this.device.y = 0;
            }
        }
        this.ref.markForCheck();
    }

    /**
     * Calculate the text length in advance as well as possible
     *
     * The length of SVG text cannot be exactly estimated, because depending on
     * the letters kerning might mean that it is shorter or longer than expected
     *
     * This takes the approach of 8px width per letter of this size, that on average
     * evens out over words. A word like 'ilj' will be much shorter than 'wm0'
     * because of kerning
     *
     *
     * In addition in the template, the <svg:text> properties
     * textLength and lengthAdjust ensure that the text becomes long with extra
     * wide spacing created as necessary.
     *
     * Other approaches like getBBox() of the text
     */
    labelTextLen() {
        if (this.labelToggle === 1) {
            return this.device.id.length * 8;
        } else if (this.labelToggle === 2 && this.device &&
            this.device.props.name && this.device.props.name.trim().length > 0) {
            return this.device.props.name.length * 8;
        } else {
            return 0;
        }
    }

    deviceIcon(): string {
        if (this.device.props && this.device.props.uiType) {
            this.is.loadIconDef(this.device.props.uiType);
            return this.device.props.uiType;
        } else {
            return 'm_' + this.device.type;
        }
    }

    resetNodeLocation(): void {
        this.log.debug('Resetting device', this.device.id, this.device.type);
        let origLoc: MetaUi;

        if (!this.device.location || this.device.location.locType === LocationType.NONE) {
            // No location - nothing to do
            return;
        } else if (this.device.location.locType === LocationType.GEO) {
            origLoc = ZoomUtils.convertGeoToCanvas(<LocMeta>{
                lng: this.device.location.longOrX,
                lat: this.device.location.latOrY
            });
        } else if (this.device.location.locType === LocationType.GRID) {
            origLoc = ZoomUtils.convertXYtoGeo(
                this.device.location.longOrX, this.device.location.latOrY);
        }
        this.device.metaUi = origLoc;
        this.device['fx'] = origLoc.x;
        this.device['fy'] = origLoc.y;
    }
}
