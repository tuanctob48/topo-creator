import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { NodePopupService } from '../node-popup.service';

@Component({
  selector: 'onos-node-popup',
  templateUrl: './node-popup.component.html',
  styleUrls: ['./node-popup.component.css']
})
export class NodePopupComponent implements OnInit, OnDestroy {
  nodeTypeFlag : boolean;
  edit_switch_sub: Subscription;

  constructor(private nodePopupService: NodePopupService) { }

  ngOnInit() {
    this.nodeTypeFlag = false;
    // eventHub.$on('edit-switch', this.showSwitchProperties);
    this.edit_switch_sub = this.nodePopupService.getAddSwitchEvent().subscribe(
      () => this.showSwitchProperties(),
      err => console.log(err),
      () => { }
    )
  }

  selectNodeType(event) {
      this.nodeTypeFlag = (event.target.value == "switch")
  }

  showSwitchProperties() {
    console.log(1);
    this.nodeTypeFlag =  true;
  }
  
  ngOnDestroy() {
    // eventHub.$off('edit-switch', this.showSwitchProperties);
    this.edit_switch_sub.unsubscribe();
  }
}
