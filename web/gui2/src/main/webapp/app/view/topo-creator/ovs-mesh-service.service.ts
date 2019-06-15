import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
// import { Globals } from './globals';

@Injectable({
  providedIn: 'root'
})
export class OvsMeshService{

  addSwitch   = new Subject<any> ();
  deleteNode  = new Subject<any> ();
  addHost     = new Subject<any> ();
  addS2SLink  = new Subject<any> ();
  addH2SLink  = new Subject<any> ();
  editLink    = new Subject<any> ();
  deleteLink  = new Subject<any> ();

  constructor() {

  }

  getAddSwitchEvent(): Observable<any> {
    return this.addSwitch.asObservable();
  }
  getDeleteNodeEvent(): Observable<any>  {
    return this.deleteNode.asObservable();
  }
  getAddHostEvent(): Observable<any> {
    return this.addHost.asObservable();
  }
  getAddS2SLinkEvent(): Observable<any> {
    return this.addS2SLink.asObservable();
  }
  getAddH2SLinkEvent(): Observable<any> {
    return this.addH2SLink.asObservable();
  }
  getEditLinkEvent(): Observable<any> {
    return this.editLink.asObservable();
  }
  getDeleteLinkEvent(): Observable<any> {
    return this.deleteLink.asObservable();
  }
  publishAddSwitchEvent(nodeData: any) {
    this.addSwitch.next(nodeData);
  }
  publishDeleteNodeEvent(deleteData: any){
    this.deleteNode.next(deleteData);
  }
  publishAddHostEvent(nodeData: any){
    this.addHost.next(nodeData); 
  }
  publishAddS2SLinkEvent(edgeData: any){
    this.addS2SLink.next(edgeData);
  }
  publishAddH2SLinkEvent(edgeData: any){
    this.addH2SLink.next(edgeData);
  }
  publishEditLinkEvent(edgeData: any){
    this.editLink.next(edgeData);
  }
  publishDeleteLinkEvent(deleteData: any){
    this.deleteLink.next(deleteData);
  }
}
