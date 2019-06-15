import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NodePopupService {

  editSwitch   = new Subject<any> ();

  constructor() { }

  getAddSwitchEvent(): Observable<any> {
    console.log(123);
    return this.editSwitch.asObservable();
  }

  publishEditSwitchEvent(nodeData: any){
    console.log(1234);
    this.editSwitch.next(nodeData);
  }
}
