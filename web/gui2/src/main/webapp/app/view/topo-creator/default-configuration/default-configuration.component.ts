import { Component, OnInit, OnDestroy, Output, EventEmitter, SimpleChange } from '@angular/core';
import { DefaultConfigurationService } from '../default-configuration.service';
import { TopoCreatorComponent } from '../topo-creator/topo-creator.component';

declare var $: any;

@Component({
  selector: 'onos-default-configuration',
  templateUrl: './default-configuration.component.html',
  styleUrls: ['./default-configuration.component.css']
})

export class DefaultConfigurationComponent implements OnInit, OnDestroy {

  default_controller: string = "tcp:127.0.0.1:6633";
  default_listen: string = "ptcp:6634";
  default_ofv: string = "OpenFlow13";

  constructor(private defaultConfigurationService: DefaultConfigurationService, private globals: TopoCreatorComponent) {
    // this.loadDefaults();
    const defaults = this.defaultConfigurationService.getDefaults();
    defaults.subscribe(
      () => this.loadDefaults(),
      err => console.log(err),
      () => { }
    )
  }

  ngOnInit() {
    // Apply Bootstrap Popovers to the input fields
    $(function () {
      $('[data-toggle="popover"]').popover()
    })
  }

  ngOnDestroy() {
  }
  // data() {
  //     return {
  //         default_controller: 'tcp:127.0.0.1:6633',
  //         default_listen: 'ptcp:6634',
  //         default_ofv: 'OpenFlow13'
  //     }
  // };

  // /**
  //  * Change the controller for all this.globals._nodes that have are using the default one.
  //  * The default controller is specified in the input, so when a user changes it - this method will apply the
  //  * newly entered value to all nodes that have the same controller as _defaultConfiguration.controller (see
  //  * main.js) - which means that it will apply the new default controller to only those nodes that already
  //  * use (have) the default controller.
  //  * After that, update _defaultConfiguration.controller to that new value, and finally emit the event in
  //  * order to update the controllers array in OvsMesh.vue.
  //  *
  //  * @param e
  //  */
  changeDefaultController(e) {
    var newDefaultController = e.target.value;
    this.globals._network.storePositions();
    var nodeIds = this.globals._nodes.getIds();
    var that = this;
    nodeIds.forEach(function (currentValue) {
      if (that.globals._nodes.get(currentValue).controller == that.globals._defaultConfiguration.controller) {
        var nodeToUpdate = that.globals._nodes.get(currentValue);
        nodeToUpdate.controller = newDefaultController;
        that.globals._nodes.update(nodeToUpdate);
      }
    });

    this.globals._defaultConfiguration.controller = newDefaultController;

    //     eventHub.$emit('change-default-controller', newDefaultController);
    this.defaultConfigurationService.changeDefaultController(newDefaultController);
  };

  // /**
  //  * See the comments (description) for the changeDefaultController(e) method. The same logic applies here.
  //  *
  //  * @param e
  //  */
  changeDefaultListen(e) {
    var newDefaultListen = e.target.value;

    this.globals._network.storePositions();
    var nodeIds = this.globals._nodes.getIds();
    var that = this;
    nodeIds.forEach(function (currentValue) {
      if (that.globals._nodes.get(currentValue).listen == that.globals._defaultConfiguration.listen) {
        var nodeToUpdate = that.globals._nodes.get(currentValue);
        nodeToUpdate.listen = newDefaultListen;
        that.globals._nodes.update(nodeToUpdate);
      }
    });

    this.globals._defaultConfiguration.listen = newDefaultListen;

    //     eventHub.$emit('change-default-listen', newDefaultListen);
    this.defaultConfigurationService.changeDefaultListen(newDefaultListen);
  };

  // /**
  //  * See the comments (description) for the changeDefaultController(e) method. The same logic applies here.
  //  *
  //  * @param e
  //  */
  changeDefaultOfv(e) {
    var newDefaultOfv = e.target.value;
    this.globals._network.storePositions();
    var nodeIds = this.globals._nodes.getIds();
    var that = this;
    nodeIds.forEach(function (currentValue) {
      if (that.globals._nodes.get(currentValue).ofv == that.globals._defaultConfiguration.ofv) {
        var nodeToUpdate = that.globals._nodes.get(currentValue);
        nodeToUpdate.ofv = newDefaultOfv;
        that.globals._nodes.update(nodeToUpdate);
      }
    });

    this.globals._defaultConfiguration.ofv = newDefaultOfv;

    // eventHub.$emit('change-default-ofv', newDefaultOfv);
    this.defaultConfigurationService.changeDefaultOfv(newDefaultOfv);
  };

  // /**
  //  * When a JSON project is imported, set the values of input fields for Default controller, Listen and OFv.
  //  * See loadProject(json_obj) method in OvsMesh.vue.
  //  *
  //  */
  loadDefaults() {
    this.default_controller = this.globals._defaultConfiguration.controller;
    this.default_listen = this.globals._defaultConfiguration.listen;
    this.default_ofv = this.globals._defaultConfiguration.ofv;
  }

  // mounted() {
  //     // Apply Bootstrap Popovers to the input fields
  //     $(function () {
  //         $('[data-toggle="popover"]').popover()
  //     })
  // };

}
