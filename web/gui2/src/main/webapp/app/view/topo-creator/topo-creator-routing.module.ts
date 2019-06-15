import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TopoCreatorComponent } from './topo-creator/topo-creator.component';
const topoCreatorRoutes: Routes = [
    {
        path: '',
        component: TopoCreatorComponent
    }
];

@NgModule({
    imports: [
        RouterModule.forChild(topoCreatorRoutes)
    ],
    exports: [RouterModule]
})
export class TopoCreatorRoutingModule { }
