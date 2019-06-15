import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
// import { Globals } from './globals';

@Injectable({
  providedIn: 'root'
})
export class DefaultConfigurationService {
  
  default_controller_sub  = new Subject<string>();
  default_listen_sub      = new Subject<string>();
  default_ofv_sub         = new Subject<string>();
  defaults_sub            = new Subject<any>();

  constructor() { }

  getDefaults(): Observable<any>{
    return this.defaults_sub.asObservable();
  }
  loadDefaults(){
    this.defaults_sub.next();
  }
  getDefaultController(): Observable<any> {
    return this.default_controller_sub.asObservable();
  }
  changeDefaultController(new_default_controller: string) {
    this.default_controller_sub.next(new_default_controller);
  }
  getDefaultListen(): Observable<any> {
    return this.default_listen_sub.asObservable();
  }
  changeDefaultListen(new_default_listen: string) {
    this.default_listen_sub.next(new_default_listen);
  }
  getDefaultOfv(): Observable<any> {
    return this.default_ofv_sub.asObservable();
  }
  changeDefaultOfv(new_default_ofv: string) {
    this.default_ofv_sub.next(new_default_ofv);
  }
}
