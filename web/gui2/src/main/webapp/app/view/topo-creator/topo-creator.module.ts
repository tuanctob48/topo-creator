import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TopMenuComponent } from './topmenu/topmenu.component';
import { TopoCreatorRoutingModule } from './topo-creator-routing.module';
import { TopoCreatorComponent } from './topo-creator/topo-creator.component';
import { Gui2FwLibModule } from 'gui2-fw-lib';
import { DefaultConfigurationComponent } from './default-configuration/default-configuration.component';
import { NodePopupComponent } from './node-popup/node-popup.component';
import { LinkErrorPopupComponent } from './link-error-popup/link-error-popup.component';
import { OvsMeshComponent } from './ovs-mesh/ovs-mesh.component';
import { LinkConfigurationComponent } from './link-configuration/link-configuration.component';


@NgModule({
    imports: [
        CommonModule,
        Gui2FwLibModule,
        TopoCreatorRoutingModule,
        // VisModule
    ],
    declarations: [TopMenuComponent,TopoCreatorComponent, DefaultConfigurationComponent, NodePopupComponent, LinkErrorPopupComponent, OvsMeshComponent, LinkConfigurationComponent],
    exports: [TopoCreatorComponent]
})
export class TopoCreatorModule { }
