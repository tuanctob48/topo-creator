import { Component, OnInit, OnDestroy } from '@angular/core';
import { TopoCreatorComponent } from '../topo-creator/topo-creator.component'
import { DefaultConfigurationService } from '../default-configuration.service';
import { Observable, Subscription } from 'rxjs';
import { observable, computed } from 'mobx-angular';
import { saveAs } from 'file-saver';
declare var ClipboardJS: any;
import * as _ from 'lodash';
// declare var _ : any;
import { OvsMeshService } from '../ovs-mesh-service.service';
import { DataSet, Network, Node, Edge, DataView as VisDataView } from 'vis';
// import * as vis from 'vis';
// declare var vis: any;
declare var $: any;
@Component({
  selector: 'onos-ovs-mesh',
  templateUrl: './ovs-mesh.component.html',
  styleUrls: ['./ovs-mesh.component.css']
})
export class OvsMeshComponent implements OnInit, OnDestroy {

  defaults: Observable<Boolean>;
  default_controller_sub: Subscription;
  default_listen_sub: Subscription;
  default_ofv_sub: Subscription;
  add_switch_sub: Subscription;
  delete_node_sub: Subscription;
  add_host_sub: Subscription;
  add_s2s_link_sub: Subscription;
  add_h2s_link_sub: Subscription;
  edit_link_sub: Subscription;
  delete_link_sub: Subscription;
  /**
  * "Switch-to-Switch Matrix" - this multidimensional array contains information on the number of links
  * between switches, and it is used for generating the bash script and tabular display. The initial data
  * are consistent with the VIS INITIAL DATA/CONFIGURATION (see main.js).
  * For more details please check: http://laraget.com/blog/ovs-mesh
  *
  */
  @observable s2s_matrix: any;
  /**
   * The default controller, listen and ofv.
   * The initial data are consistent with the VIS INITIAL DATA/CONFIGURATION (see main.js), and when a user
   * changes some of these (from DefaultConfiguration.vue) - it will be immediately updated.
   */
  @observable default_controller: string;
  @observable default_listen: string;
  @observable default_ofv: string;
  /**
   * These arrays contain information on the controllers, listens and  Open Flow versions for each switch, respectively.
   * The initial data are consistent with the VIS INITIAL DATA/CONFIGURATION (see main.js).
   */
  @observable controllers: string[];
  @observable listens: string[];
  @observable ofvs: string[];

  /**
   * "Host-to-Switch Matrix" - this multidimensional array contains information on the number of links
   * between hosts and switches, and it is used for generating the bash script and tabular display. The
   * initial data are consistent with the VIS INITIAL DATA/CONFIGURATION (see main.js).
   * For more details please check: http://laraget.com/blog/ovs-mesh
   *
   */
  @observable h2s_matrix: any;
  @observable qdisc_matrix: any;

  constructor(
    private defaultConfigurationService: DefaultConfigurationService,
    private ovsMeshService: OvsMeshService, private globals: TopoCreatorComponent
  ) {

    // this.defaults = this.defaultConfigurationService.getDefaults();
  }
  initQdiscMatrix() {
    this.qdisc_matrix = {
    }
  }
  initS2SMatrix() {

    this.s2s_matrix = [
      [],
      [2],
      [1, 1],
      [1, 2, 1],
      [2, 0, 1, 1]
    ];
  }
  initDefault() {
    this.default_controller = 'tcp:192.168.11.217:6633';
    this.default_listen = 'ptcp:6634';
    this.default_ofv = 'OpenFlow13';
  }

  initDefaultArr() {
    this.controllers = ['tcp:192.168.11.217:6633', 'tcp:192.168.11.217:6633', 'tcp:192.168.11.217:6633', 'tcp:192.168.11.217:6633', 'tcp:192.168.11.217:6633'];
    this.listens = ['ptcp:6634', 'ptcp:6634', 'ptcp:6634', 'ptcp:6634', 'ptcp:6634'];
    this.ofvs = ['OpenFlow13', 'OpenFlow13', 'OpenFlow13', 'OpenFlow13', 'OpenFlow13'];
  }

  initH2SMatrix() {
    this.h2s_matrix = [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1]
    ];
  }
  subscribeEvents() {
    this.default_controller_sub = this.defaultConfigurationService.getDefaultController().subscribe(
      updated_controller => this.changeDefaultController(updated_controller),
      err => console.log(err),
      () => { }
    )
    this.default_listen_sub = this.defaultConfigurationService.getDefaultListen().subscribe(
      updated_listen => this.changeDefaultListen(updated_listen),
      err => console.log(err),
      () => { }
    );
    this.default_ofv_sub = this.defaultConfigurationService.getDefaultOfv().subscribe(
      updated_ofv => this.changeDefaultOfv(updated_ofv),
      err => console.log(err),
      () => { }
    );
    this.add_switch_sub = this.ovsMeshService.getAddSwitchEvent().subscribe(
      nodeData => this.addSwitch(nodeData),
      err => console.log(err),
      () => { }
    );
    this.delete_node_sub = this.ovsMeshService.getDeleteNodeEvent().subscribe(
      deleteData => this.deleteNode(deleteData),
      err => console.log(err),
      () => { }
    );
    this.add_host_sub = this.ovsMeshService.getAddHostEvent().subscribe(
      nodeData => this.addHost(nodeData),
      err => console.log(err),
      () => { }
    )
    this.add_s2s_link_sub = this.ovsMeshService.getAddS2SLinkEvent().subscribe(
      edgeData => this.addS2SLink(edgeData),
      err => console.log(err),
      () => { }
    );
    this.add_h2s_link_sub = this.ovsMeshService.getAddH2SLinkEvent().subscribe(
      edgeData => this.addH2SLink(edgeData),
      err => console.log(err),
      () => { }
    );
    this.edit_link_sub = this.ovsMeshService.getEditLinkEvent().subscribe(
      edgeData => this.editLink(edgeData),
      err => console.log(err),
      () => { }
    );
    this.delete_link_sub = this.ovsMeshService.getDeleteLinkEvent().subscribe(
      deleteData => this.deleteLink(deleteData),
      err => console.log(err),
      () => { }
    );

  }
  ngOnInit() {
    new ClipboardJS('#btnCopy');
    this.initH2SMatrix();
    this.initDefault();
    this.initDefaultArr();
    this.initS2SMatrix();
    this.initQdiscMatrix();
    this.subscribeEvents();
  }
  ngOnDestroy() {
    this.default_controller_sub.unsubscribe();
    this.default_listen_sub.unsubscribe();
    this.default_ofv_sub.unsubscribe();

    this.add_switch_sub.unsubscribe();

    this.delete_node_sub.unsubscribe();
    this.add_host_sub.unsubscribe();

    this.add_s2s_link_sub.unsubscribe();
    this.add_h2s_link_sub.unsubscribe();

    this.edit_link_sub.unsubscribe();

    this.delete_link_sub.unsubscribe();
  }

  @computed get table_headings() {
    let result = [];

    this.s2s_matrix.forEach((currentValue, index) => {
      result[index] = "sw" + ('0' + index).slice(-2);
    });

    this.h2s_matrix.forEach((currentValue, index) => {
      result.push("Host-" + ('0' + index).slice(-2));
    });
    // console.log(result);
    return result;
  }

  @computed get table_data() {
    let result = {};

    this.s2s_matrix.forEach((currentValue, index) => {
      let tr = _.concat(currentValue, ['']);

      for (let i = index + 1; i < this.s2s_matrix.length; i++) {
        tr[i] = this.s2s_matrix[i][index];
      }

      this.h2s_matrix.forEach((currentValue) => {
        tr.push(currentValue[index]);
      });

      let key = "sw" + ('0' + index).slice(-2);

      result[key] = tr;
    });

    this.h2s_matrix.forEach((currentValue, index) => {
      let key = "Host-" + ('0' + index).slice(-2);

      result[key] = currentValue;
    });
    // console.log(result);
    return result;
  }
  switchBeforeHost = (a, b) => {
    return a.key < b.key && a.key.includes('sw') ? -1 : 1;
  }
  /**
   * When a user changes the value of the default controller, update all switches controllers that are
   * the same as the value of the previous default controller.
   */
  changeDefaultController(newDefaultController: string) {
    // When a user changes the default value of controller (DefaultConfiguration.vue), update it here.
    // We are doing this check because this method can be called when a user doesn't change the default
    // controller but only changes it for the specific node (see main.js - editNode(nodeData, callback).
    if (typeof newDefaultController != 'undefined') {
      this.default_controller = newDefaultController;
    }

    let result = [];
    let switchIds = (<any>this.getSwitchNodes()).getIds();
    var that = this;
    switchIds.forEach(function (currentValue) {
      result[that.globals._nodes.get(currentValue).index] = that.globals._nodes.get(currentValue).controller;
    });

    this.controllers = result;
  }

  /**
   * When a user changes the value of the default listen, update all switches listens that are
   * the same as the value of the previous default listen.
   */
  changeDefaultListen(newDefaultListen) {
    // When a user changes the default value of listen (DefaultConfiguration.vue), update it here.
    // We are doing this check because this method can be called when a user doesn't change the default
    // listen but only changes it for the specific node (see main.js - editNode(nodeData, callback).
    if (typeof newDefaultListen != 'undefined') {
      this.default_listen = newDefaultListen;
    }

    let result = [];
    let switchIds = (<any>this.getSwitchNodes()).getIds();
    var that = this;
    switchIds.forEach(function (currentValue) {
      result[that.globals._nodes.get(currentValue).index] = that.globals._nodes.get(currentValue).listen;
    });

    this.listens = result;
  }
  /**
             * When a user changes the value of the default ofv, update all switches ofvs that are
             * the same as the value of the previous default ofv.
             */
  changeDefaultOfv(newDefaultOfv) {
    // When a user changes the default value of ofv (DefaultConfiguration.vue), update it here.
    // We are doing this check because this method can be called when a user doesn't change the default
    // ofv but only changes it for the specific node (see main.js - editNode(nodeData, callback).
    if (typeof newDefaultOfv != 'undefined') {
      this.default_ofv = newDefaultOfv;
    }

    let result = [];
    let switchIds = (<any>this.getSwitchNodes()).getIds();
    var that = this;
    switchIds.forEach(function (currentValue) {
      result[that.globals._nodes.get(currentValue).index] = that.globals._nodes.get(currentValue).ofv;
    });

    this.ofvs = result;
  }

  /**
  * Add a new switch to the graph and update the script.
  * Actually, callback(nodeData) which adds a new switch to the Vis graph is executed in the main.js (see
  * addNode function in the Vis Network manipulation options).
  * Here, we are only setting some attributes (id, group, index, label) to the switch that is being added.
  */
  addSwitch(nodeData) {
    let length, last_id, switch_nodes, switch_nodes_length, last_index, host_nodes_length;

    // Prepare data for the new node
    length = this.globals._nodes.getIds().length;

    if (length == 0) {
      last_id = -1;
    } else {
      last_id = this.globals._nodes.get(this.globals._nodes.getIds()[length - 1]).id;
    }

    switch_nodes = this.getSwitchNodes();
    switch_nodes_length = switch_nodes.getIds().length;

    if (switch_nodes_length == 0) {
      last_index = -1;
    } else {
      last_index = switch_nodes.get(switch_nodes.getIds()[switch_nodes_length - 1]).index;
    }

    // Set the data for the newly added node
    nodeData.id = ++last_id;
    nodeData.group = "switch";
    nodeData.index = ++last_index;
    nodeData.label = "sw" + ('0' + nodeData.index).slice(-2);

    // Update the script's s2s matrix
    // this.$set(this.s2s_matrix, switch_nodes_length, new Array(switch_nodes_length).fill(0));
    this.s2s_matrix[switch_nodes_length] = new Array(switch_nodes_length).fill(0);
    // Update the script's h2s matrix
    host_nodes_length = (<any>this.getHostNodes()).getIds().length;

    for (let i = 0; i < host_nodes_length; i++) {
      // this.$set(this.h2s_matrix[i], switch_nodes_length, 0);
      this.h2s_matrix[i][switch_nodes_length] = 0;
    }

    this.setupTableHoverEffect();
  }

  /**
  * Get all nodes that are switches (returns an array of node objects).
  */
  getSwitchNodes() {

    return new VisDataView(this.globals._nodes, {
      filter: function (item) {
        return (item.group == "switch");
      },
      fields: ['id', 'index', 'label', 'controller', 'listen', 'ofv']
    });

  }
  /**
             * Add a new host to the graph and update the script.
             * Actually, callback(nodeData) which adds a new host to the Vis graph is executed in the main.js (see
             * addNode function in the Vis Network manipulation options).
             * Here, we are only setting some attributes (id, group, index, label) to the host that is being added.
             */
  addHost(nodeData) {
    let length, last_id, host_nodes, host_nodes_length, last_index, switch_nodes_length;

    length = this.globals._nodes.getIds().length;

    if (length == 0) {
      last_id = -1;
    } else {
      last_id = this.globals._nodes.get(this.globals._nodes.getIds()[length - 1]).id;
    }

    host_nodes = this.getHostNodes();
    host_nodes_length = host_nodes.getIds().length;

    if (host_nodes_length == 0) {
      last_index = -1;
    } else {
      last_index = host_nodes.get(host_nodes.getIds()[host_nodes_length - 1]).index;
    }

    nodeData.id = ++last_id;
    nodeData.group = "host";
    nodeData.index = ++last_index;
    nodeData.label = "Host-" + ('0' + nodeData.index).slice(-2);

    // Update the script's h2s matrix
    switch_nodes_length = (<any>this.getSwitchNodes()).getIds().length;
    // this.$set(this.h2s_matrix, host_nodes_length, new Array(switch_nodes_length).fill(0));
    this.h2s_matrix[host_nodes_length] = new Array(switch_nodes_length).fill(0);
    this.setupTableHoverEffect();
  }

  /**
   * Get all nodes that are hosts (returns an array of node objects).
   */
  getHostNodes() {
    return new VisDataView(<any>this.globals._nodes, <any>{
      filter: function (item) {
        return (item.group == "host");
      },
      fields: ['id', 'index', 'label']
    });
  }

  /**
   * Delete a selected node(s) form the script's matrix and graph.
   * Actually, callback(deleteData) which removes the selected node(s) from the Vis graph is executed in the
   * main.js (see deleteNode function in the Vis Network manipulation options).
   * Here, we are only updating some attributes (index & label) of the remaining nodes that are on the graph.
   */
  deleteNode(deleteData) {
    for (var n = 0; n < deleteData.nodes.length; n++) {
      var nodeId = deleteData.nodes[n];
      var currentNode = <any>this.globals._nodes.get(nodeId);

      if ((<any>currentNode).group == "switch") {
        // Update the script's s2s matrix
        this.s2s_matrix.splice(<any>currentNode.index, 1);
        for (var i = currentNode.index; i < this.s2s_matrix.length; i++) {
          this.s2s_matrix[i].splice(currentNode.index, 1);
        }

        // Update the attributes of the remaining switch nodes with bigger IDs (indexes/labels)
        let maxId = Math.max.apply(null, this.globals._nodes.getIds());
        for (let j = nodeId + 1; j <= maxId; j++) {
          if (this.globals._nodes.get(j) && (<any>this.globals._nodes.get(j)).group == "switch") {
            let nodeToUpdate = <any>this.globals._nodes.get(j);
            nodeToUpdate.index--;
            nodeToUpdate.label = "sw" + ('0' + nodeToUpdate.index).slice(-2);

            this.globals._nodes.update(nodeToUpdate);
          }
        }

        // Update the script's h2s matrix
        var host_nodes_length = this.h2s_matrix.length;
        if (host_nodes_length > 0) {
          for (let h = 0; h < host_nodes_length; h++) {
            this.h2s_matrix[h].splice(<any>currentNode.index, 1);
          }
        }
      }

      if ((<any>currentNode).group == "host") {
        // Update the script's h2s matrix
        this.h2s_matrix.splice(<any>currentNode.index, 1);

        // Update the attributes (indexes, labels) of the remaining host nodes with bigger IDs (indexes/labels)
        let maxId = Math.max.apply(null, (<any>this.getHostNodes()).getIds());
        for (let j = nodeId + 1; j <= maxId; j++) {
          if (this.globals._nodes.get(j) && (<any>this.globals._nodes.get(j)).group == "host") {
            let nodeToUpdate = <any>this.globals._nodes.get(j);

            nodeToUpdate.index--;
            nodeToUpdate.label = "Host-" + ('0' + nodeToUpdate.index).slice(-2);

            this.globals._nodes.update(nodeToUpdate);
          }
        }
      }
    }

    this.deleteIndependentLinks(deleteData);
  }

  /**
   * Extract links that are not directly connected to the selected node(s)...
   * https://github.com/almende/vis/issues/2603
   * ... then format (create) the "independentDeleteData" that Vis understands
   * ... and pass it to the deleteLink method.
   */
  deleteIndependentLinks(deleteData) {
    let nodesEdges = []; // All of the edges that are directly connected to the selected node(s)

    for (let i = 0; i < deleteData.nodes.length; i++) {
      let nodeId = deleteData.nodes[i];
      let currentNode = this.globals._nodes.get(nodeId);

      nodesEdges = _.concat(nodesEdges, this.globals._network.getConnectedEdges(nodeId));
    }

    let independentEdges = _.difference(deleteData.edges, nodesEdges);

    if (independentEdges.length > 0) {
      let independentDeleteData = {
        edges: independentEdges,
        nodes: []
      };
      this.deleteLink(independentDeleteData);
    }
  }

  /**
   * Add a new switch-to-switch link
   */
  addS2SLink(edgeData) {
    let nodeOne = <any>this.globals._nodes.get(edgeData.from);
    let nodeTwo = <any>this.globals._nodes.get(edgeData.to);

    let ovs = Math.max(nodeOne.index, nodeTwo.index);
    let link = Math.min(nodeOne.index, nodeTwo.index);

    this.s2s_matrix[ovs][link]++;

    let val = this.s2s_matrix[ovs];
    // this.$set(this.s2s_matrix, ovs, val);
    this.s2s_matrix[ovs] = val;
  }

  /**
   * Add a new host-to-switch link
   */
  addH2SLink(edgeData) {
    let nodeOne = <any>this.globals._nodes.get(edgeData.from);
    let nodeTwo = <any>this.globals._nodes.get(edgeData.to);

    let host = <any>_.find([nodeOne, nodeTwo], <any>{ 'group': 'host' });
    let sw = <any>_.find([nodeOne, nodeTwo], <any>{ 'group': 'switch' });
    this.h2s_matrix[host.index][sw.index]++;

    let val = this.h2s_matrix[host.index];
    // this.$set(this.h2s_matrix,host.index, val);
    this.h2s_matrix[host.index] = val;
  }

  /**
   * Redirect link to another node.
   */
  editLink(edgeData) {
    let linkConfiguration, nodeFromLabel, nodeToLabel, linkId, groupLinkId;
    nodeFromLabel = edgeData.from.options.label;
    nodeToLabel = edgeData.to.options.label;
    linkId = edgeData.id.substring(0, 8);
    groupLinkId = nodeFromLabel + '-' + nodeToLabel;
    if (!this.qdisc_matrix[groupLinkId]) {
      this.qdisc_matrix[groupLinkId] = {};
    }
    this.qdisc_matrix[groupLinkId][linkId] = edgeData.linkConfiguration;
    console.log(edgeData.linkConfiguration);
    // let currentlyRelatedNodes, nodeOne, nodeTwo, nodeFrom, nodeTo, ovs, link, val;

    // currentlyRelatedNodes = this.globals._network.getConnectedNodes(edgeData.id);

    // // I'm doing this check because if one related node has id=0, then Vis
    // // [_network.getConnectedNodes(edgeId)] returns only the id of the other node:
    // if (currentlyRelatedNodes.length == 1) {
    //   currentlyRelatedNodes.unshift(0);
    // }

    // // The nodes that were connected by the link that is being redirected:
    // nodeOne = this.globals._nodes.get(currentlyRelatedNodes[0]);
    // nodeTwo = this.globals._nodes.get(currentlyRelatedNodes[1]);

    // // https://github.com/almende/vis/issues/2736#issuecomment-286292637
    // nodeFrom = this.globals._nodes.get(_.intersection([edgeData.from, edgeData.to], currentlyRelatedNodes)[0]);

    // // Check if a user redirects to where it already was connected:
    // let difference = _.difference([edgeData.from, edgeData.to], currentlyRelatedNodes);
    // if (_.isEmpty(difference)) {
    //   return false;
    // }
    // nodeTo = this.globals._nodes.get(difference[0]);


    // if (nodeOne.group == "switch" && nodeTwo.group == "switch") { // if we are redirecting a link that was connecting two switches
    //   this.decreaseS2SLinks(nodeOne, nodeTwo);

    //   if (nodeTo.group == "switch") { // if we are redirecting a link to another switch
    //     this.increaseS2SLinks(nodeFrom, nodeTo);
    //   } else { // if we are redirecting a link to host
    //     this.increaseH2SLinks(nodeTo, nodeFrom);
    //   }
    // } else { // if we are redirecting a link that was connecting host and switch
    //   let host = <any>_.find([nodeOne, nodeTwo], <any>{ group: 'host' });
    //   let sw = <any>_.find([nodeOne, nodeTwo], <any>{ group: 'switch' });

    //   if (nodeFrom.id == host.id) { // if we are redirecting link from host to another switch
    //     this.decreaseH2SLinks(host, sw);
    //     this.increaseH2SLinks(host, nodeTo);
    //   } else { // if we are redirecting a link from switch...
    //     if (nodeTo.group == "switch") { // ... to switch
    //       this.decreaseH2SLinks(host, sw);
    //       this.increaseS2SLinks(nodeFrom, nodeTo);
    //     } else { // ... to host
    //       this.decreaseH2SLinks(host, sw);
    //       this.increaseH2SLinks(nodeTo, nodeFrom);
    //     }
    //   }
    // }
  }

  /**
   * This helper function is used in editLink(edgeData) to update the switch-to-switch matrix in the bash
   * script: when a link was redirected to a new switch (nodeTo) - update (increase) the number of links
   * between these two switches (nodeFrom and nodeTo).
   */
  increaseS2SLinks(nodeFrom, nodeTo) {
    let ovs = Math.max(nodeFrom.index, nodeTo.index);
    let link = Math.min(nodeFrom.index, nodeTo.index);

    this.s2s_matrix[ovs][link]++;
    let val = this.s2s_matrix[ovs];
    // this.$set(this.s2s_matrix, ovs, val);
    this.s2s_matrix[ovs] = val;
  }

  /**
   * Update the switch-to-switch matrix in the bash script (decrease the # of links between switches nodeOne
   * and nodeTwo).
   */
  decreaseS2SLinks(nodeOne, nodeTwo) {
    let ovs = Math.max(nodeOne.index, nodeTwo.index);
    let link = Math.min(nodeOne.index, nodeTwo.index);

    this.s2s_matrix[ovs][link]--;
    let val = this.s2s_matrix[ovs];
    // this.$set(this.s2s_matrix, ovs, val);
    this.s2s_matrix[ovs] = val;
  }

  /**
   * Update the host-to-switch matrix in the bash script (increase the # of links between host and switch).
   */
  increaseH2SLinks(host, sw) {
    this.h2s_matrix[host.index][sw.index]++;
    let val = this.h2s_matrix[host.index];
    // this.$set(this.h2s_matrix, host.index, val);
    this.h2s_matrix[host.index] = val;
  }

  /**
   * Update the host-to-switch matrix in the bash script (decrease the # of links between host and switch).
   */
  decreaseH2SLinks(host, sw) {
    this.h2s_matrix[host.index][sw.index]--;
    let val = this.h2s_matrix[host.index];
    // this.$set(this.h2s_matrix, host.index, val);
    this.h2s_matrix[host.index] = val;
  }

  /**
   * Delete selected link(s).
   */
  deleteLink(deleteData) {
    // iterate through all edgeIds passed in the deleteData
    for (let i = 0; i < deleteData.edges.length; i++) {
      let edgeId = deleteData.edges[i];
      let relatedNodes = <any>this.globals._network.getConnectedNodes(edgeId); // get the nodeIds connected to this link
      let nodeOne, nodeTwo, ovs, link, val;

      // I'm doing this check because if one related node has id=0, then Vis
      // [_network.getConnectedNodes(edgeId)] returns only the id of the other node:
      if (relatedNodes.length == 1) {
        nodeOne = this.globals._nodes.get(0);
        nodeTwo = this.globals._nodes.get(relatedNodes[0]);
      } else {
        nodeOne = this.globals._nodes.get(relatedNodes[0]);
        nodeTwo = this.globals._nodes.get(relatedNodes[1]);
      }

      if (nodeOne.group == "switch" && nodeTwo.group == "switch") {
        ovs = Math.max(nodeOne.index, nodeTwo.index);
        link = Math.min(nodeOne.index, nodeTwo.index);

        this.s2s_matrix[ovs][link]--;

        val = this.s2s_matrix[ovs];
        // this.$set(this.s2s_matrix, ovs, val);
        this.s2s_matrix[ovs] = val;
      } else {
        let host = <any>_.find([nodeOne, nodeTwo], <any>{ group: 'host' });
        let sw = <any>_.find([nodeOne, nodeTwo], <any>{ group: 'switch' });

        this.h2s_matrix[host.index][sw.index]--;

        val = this.h2s_matrix[host.index];
        // this.$set(this.h2s_matrix, host.index, val);
        this.h2s_matrix[host.index] = val;
      }
    }
  }

  /**
   * Download generated bash script - save it as ovs-mesh.sh.
   */
  downloadBash() {
    saveAs(new Blob([document.getElementById('bash-script').innerHTML.replace("&gt;", ">")], { type: "text/html;charset=utf-8" }), "ovs-mesh.sh");
  }

  /**
   * Add table row & column highlighting on hover.
   */
  setupTableHoverEffect() {
    $(function () {
      $('.table td').mouseover(function () {
        $(this).siblings().css('background-color', '#ECF3F8');
        var ind = $(this).index();
        $('td:nth-child(' + (ind + 1) + ')').css('background-color', '#ECF3F8');
        $('th:nth-child(' + (ind + 1) + ')').css('background-color', '#ECF3F8');
      });
      $('.table td').mouseleave(function () {
        $(this).siblings().css('background-color', '');
        var ind = $(this).index();
        $('td:nth-child(' + (ind + 1) + ')').css('background-color', '');
        $('th:nth-child(' + (ind + 1) + ')').css('background-color', '');
      });
    })
  }

  /**
   * Export table (Tabular Display) to CSV.
   * Credit goes to Terry Young: http://stackoverflow.com/a/16203218/4437206
   */
  exportTableToCSV(e) {
    let args = [$('#tabela'), 'ovs-mesh.csv'];

    exportTableToCSV.apply(e.target, args);

    function exportTableToCSV($table, filename) {
      let $rows = $table.find('tr:has(td),tr:has(th)'),

        // Temporary delimiter characters unlikely to be typed by keyboard
        // This is to avoid accidentally splitting the actual contents
        tmpColDelim = String.fromCharCode(11), // vertical tab character
        tmpRowDelim = String.fromCharCode(0), // null character

        // actual delimiter characters for CSV format
        colDelim = '","',
        rowDelim = '"\r\n"',

        // Grab text from table into CSV formatted string
        csv = '"' + $rows.map(function (i, row) {
          let $row = $(row), $cols = $row.find('td,th');

          return $cols.map(function (j, col) {
            let $col = $(col), text = $col.text();
            return text.replace(/"/g, '""'); // escape double quotes
          }).get().join(tmpColDelim);
        }).get().join(tmpRowDelim)
          .split(tmpRowDelim).join(rowDelim)
          .split(tmpColDelim).join(colDelim) + '"';

      // Deliberate 'false', see comment below
      if (false && window.navigator.msSaveBlob) {
        let blob = new Blob([decodeURIComponent(csv)], {
          type: 'text/csv;charset=utf8'
        });

        // Crashes in IE 10, IE 11 and Microsoft Edge
        // See MS Edge Issue #10396033
        // Hence, the deliberate 'false'
        // This is here just for completeness
        // Remove the 'false' at your own risk
        window.navigator.msSaveBlob(blob, filename);
      } else if (window.Blob && window.URL) {
        // HTML5 Blob
        let blob = new Blob([csv], {
          type: 'text/csv;charset=utf-8'
        });
        let csvUrl = URL.createObjectURL(blob);

        $(this).attr({
          'download': filename,
          'href': csvUrl
        });
      } else {
        // Data URI
        let csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

        $(this).attr({
          'download': filename,
          'href': csvData,
          'target': '_blank'
        });
      }
    }
  }

  /**
   * Export project to a JSON file.
   */
  exportProject() {
    let project = {};

    project['default_controller'] = this.default_controller;
    project['default_listen'] = this.default_listen;
    project['default_ofv'] = this.default_ofv;

    project['s2s_matrix'] = this.s2s_matrix;
    project['h2s_matrix'] = this.h2s_matrix;

    project['controllers'] = this.controllers;
    project['listens'] = this.listens;
    project['ofvs'] = this.ofvs;

    project['vis_defaultConfiguration'] = this.globals._defaultConfiguration;

    this.globals._network.storePositions();

    project['vis_nodes'] = this.globals._nodes.get();
    project['vis_edges'] = this.globals._edges.get();

    saveAs(new Blob([JSON.stringify(project)], { type: "text/plain;charset=utf-8" }), "ovs-mesh.json");
  }

  /**
   * Import (read) JSON project.
   */
  importProject(e) {
    var json_obj = null;
    let reader = new FileReader();

    if (e.target && e.target.files[0]) {
      reader.onload = (evt) => {
        try {
          json_obj = JSON.parse(e.target.value);
          this.loadProject(json_obj);
        } catch (ex) {
          alert('Error: ' + ex);
        }
      };

      reader.readAsText(e.target.files[0]);
    }
  }

  /**
   * Load (setup) imported JSON project.
   */
  loadProject(json_obj) {
    // Set the default controller, listen and ofv:
    this.default_controller = json_obj.default_controller;
    this.default_listen = json_obj.default_listen;
    this.default_ofv = json_obj.default_ofv;

    // Set s2s and h2s matrices (which are actually arrays):
    this.s2s_matrix = json_obj.s2s_matrix;
    this.h2s_matrix = json_obj.h2s_matrix;

    // Set the controllers, listens ofvs arrays:
    this.controllers = json_obj.controllers;
    this.listens = json_obj.listens;
    this.ofvs = json_obj.ofvs;

    // Set the _defaultConfiguration (see main.js) and emit the 'load-defaults' event to update the values...
    this.globals._defaultConfiguration = json_obj.vis_defaultConfiguration;
    this.defaultConfigurationService.loadDefaults();
    // Set the this.globals._nodes and this.globals._edges (see main.js):
    this.globals._nodes.clear();
    this.globals._edges.clear();

    this.globals._nodes.add(json_obj.vis_nodes);
    this.globals._edges.add(json_obj.vis_edges);

    // Add table row & column highlighting on hover.
    // this.setupTableHoverEffect();
  }
  generateLinkConfig(link) {
    var rate = link['rate'];
    var delayTime = link['delay']['delayTime'];
    var delayVariance = link['delay']['delayVariance'];
    var lossRate = link['loss']['lossRate'];
    var lossCorrelation = link['loss']['lossCorrelation'];
    var duplicate = link['duplicate'];
    var reorderRate = link['reorder']['reorderRate'];
    var reorderCorrelation = link['reorder']['reorderCorrelation'];
    var corrupt = link['corrupt'];
    var result = ' root netem';
    // loss = request.form['Loss']
    // loss_correlation = request.form['LossCorrelation']
    // duplicate = request.form['Duplicate']
    // reorder = request.form['Reorder']
    // reorder_correlation = request.form['ReorderCorrelation']
    // corrupt = request.form['Corrupt']
    // rate = request.form['Rate']

    // # remove old setup
    // command = 'tc qdisc del dev %s root netem' % interface
    // command = command.split(' ')
    // proc = subprocess.Popen(command)
    // proc.wait()
    if (rate > 0) {
      result += ' rate ' + rate + 'mbit';
    }
    if (delayTime > 0) {
      result += ' delay ' + delayTime + 'ms';
      if (delayVariance > 0) {
        result += ' ' + delayVariance + 'ms';
      }
    }
    if (lossRate > 0) {
      result += ' loss ' + lossRate + '%';
      if (lossCorrelation > 0) {
        result += ' ' + lossCorrelation + '%';
      }
    }
    if (duplicate > 0) {
      result += ' duplicate ' + duplicate + '%';
    }
    if (reorderRate > 0) {
      result += ' reorder ' + reorderRate + '%';
      if (reorderCorrelation > 0) {
        result += ' ' + reorderCorrelation + '%';
      }
    }
    if (corrupt > 0) {
      result += ' corrupt ' + corrupt + '%';
    }
    return result;
  }
  @computed get s2s_bash() {
    var result = '';
    for (var i = 0; i < this.s2s_matrix.length; i++) {
      result += '[' + i + ']="' + this.s2s_matrix[i].join(" ") + '"\n';
    }
    return result.substring(0, result.length - 1); // remove last \n
  }

  @computed get h2s_bash() {
    var result = '';
    this.h2s_matrix.forEach((currentHost, index) => {
      result += '[' + index + ']="' + currentHost.join(" ") + '"\n';
    });
    return result.substring(0, result.length - 1);
  }

  @computed get different_clo() {
    var result = '';

    this.controllers.forEach((currentValue, index) => {
      if (currentValue != this.default_controller) {
        result += 'CONTROLLER[' + index + ']="' + currentValue + '"\n';
      }
    });

    this.listens.forEach((currentValue, index) => {
      if (currentValue != this.default_listen) {
        result += 'LISTEN[' + index + ']="' + currentValue + '"\n';
      }
    });

    this.ofvs.forEach((currentValue, index) => {
      if (currentValue != this.default_ofv) {
        result += 'OFv[' + index + ']="' + currentValue + '"\n';
      }
    });

    return result !== '' ? result + '\n' : result;
  }

  @computed get link_config_data() {
    var result = 'declare -A LINKCONFIG=(';
    var id, rule;
    // for(var pairId in this.qdisc_matrix){
    Object.keys(this.qdisc_matrix).forEach(pairId => {
      id = 1;
      Object.keys(this.qdisc_matrix[pairId]).forEach(link => {
        // for(var link in this.qdisc_matrix[pairId] ){
        rule = this.generateLinkConfig(this.qdisc_matrix[pairId][link]);
        if (rule != 'root netem') {
          result += '[\"' + pairId + '.' + id++ + '\"]=\"' + rule + '\"';
        }
      })
    });
    result += ')'
    return result;
  }

  @computed get bash_script() {
    return `#!/bin/bash

{
/usr/bin/flock -xn 9 || exit 1

DEFAULT_CONTROLLER="`+ this.default_controller + `"
DEFAULT_LISTEN="`+ this.default_listen + `"
DEFAULT_OFv="`+ this.default_ofv + `"

# Strictly left (lower) triangular matrix in Bash specifying the OVS topology
SW=(
`+ this.s2s_bash + `
)

# Hosts and their connections with OVS instances
HOSTS=(
`+ this.h2s_bash + `
)

#Link configuration
`+ this.link_config_data + `

# The number of OVS instances
N=\`expr "\${#SW[@]}" - 1\`

# The number of host instances
M=\`expr "\${#HOSTS[@]}" - 1\`

for i in $(eval echo {0..$N})
do
    CONTROLLER[$i]=$DEFAULT_CONTROLLER
    LISTEN[$i]=$DEFAULT_LISTEN
    OFv[$i]=$DEFAULT_OFv
done

# If you want something different than values specified in DEFAULT_CONTROLLER, DEFAULT_LISTEN and DEFAULT_OFv
# for one or more OVS instances, this is the to place make that change. For example:

# CONTROLLER[7]="tcp:147.91.1.83:6699"
# LISTEN[5]="ptcp:6635"
# OFv[4]="OpenFlow14"

`+ this.different_clo + `############# trap and clean-up ############################

function clean_up {

N=$1
for i in $(eval echo {00..$N}); do ovs-vsctl del-br sw$i ; done

for i in $(eval echo {00..$N})
do
    for j in $(eval echo {00..$N})
    do
        if [ "\${i#0}" -gt "\${j#0}" ]
        then
            NUM_OF_CABLES=$(echo \${SW[\${i#0}]} | cut -d' ' -f\`expr \${j#0} + 1\`) # NUM_OF_CABLES=SW[i][j]
            if [ "$NUM_OF_CABLES" != "0" ]
            then
                for k in $(eval echo {1..$NUM_OF_CABLES})
                do
                    ip link delete dev c.sw$i-sw$j.$k
                done
            fi
        fi
    done
done
}

trap "clean_up $N $M" EXIT

##################### end trap #############################

sleep 3 # sometimes needed for /etc/rc.local

echo -e "\\n(Re-)creating OVS instances..."
for i in $(eval echo {00..$N}); do ovs-vsctl -- --id=@sw$ic0 create Controller target=\\"\${CONTROLLER[\${i#0}]}\\" max_backoff=1000 -- --id=@sw$i-listen create Controller target=\\"\${LISTEN[\${i#0}]}\\" max_backoff=1000 -- --if-exists del-br sw$i -- add-br sw$i -- set bridge sw$i controller=[@sw$ic0,@sw$i-listen] other_config:datapath-id=00000000000000$i fail_mode=secure other-config:disable-in-band=true protocols=\${OFv[\${i#0}]}; done
echo "The list of OVS instances is: "\`ovs-vsctl list-br | tr '\\n' ' '\`

echo -e "\\nInstantiating virtual crossover cables..."
for i in $(eval echo {00..$N})
do
    for j in $(eval echo {00..$N})
    do
        if [ "\${i#0}" -gt "\${j#0}" ]
        then
            NUM_OF_CABLES=$(echo \${SW[\${i#0}]} | cut -d' ' -f\`expr \${j#0} + 1\`) # NUM_OF_CABLES=SW[i][j]
            if [ "$NUM_OF_CABLES" != "0" ]
            then
                for k in $(eval echo {1..$NUM_OF_CABLES})
                do
                    #ovs-vsctl add-port sw$i $i-$j-$k-patch
                    #ovs-vsctl set interface $i-$j-$k-patch type=patch
                    ip link add name c.sw$i-sw$j.$k type veth peer name c.sw$j-sw$i.$k
                    ip link set c.sw$i-sw$j.$k up
                    ip link set c.sw$j-sw$i.$k up
                done
            fi
        fi
    done
done

echo -e "\\nConnecting OVS instances to each other..."

for i in $(eval echo {00..$N})
do
    for j in $(eval echo {00..$N})
    do
        if [ "\${i#0}" -gt "\${j#0}" ]
        then
            NUM_OF_CABLES=$(echo \${SW[\${i#0}]} | cut -d' ' -f\`expr \${j#0} + 1\`) # NUM_OF_CABLES=SW[i][j]
            if [ "$NUM_OF_CABLES" != "0" ]
            then
                for k in $(eval echo {1..$NUM_OF_CABLES})
                do
                    #ovs-vsctl set interface $i-$j-$k-patch options:peer=$j-$i-$k-patch
                    ovs-vsctl add-port sw$i c.sw$i-sw$j.$k -- set Interface c.sw$i-sw$j.$k ofport_request=1
                    ovs-vsctl add-port sw$j c.sw$j-sw$i.$k -- set Interface c.sw$j-sw$i.$k ofport_request=1
                done
            fi
        fi
    done
done

echo -e "Creating and connecting virtual patch cables...\\n"
for i in $(eval echo {00..$M})
do
    for j in $(eval echo {00..$N})
    do
        NUM_OF_CABLES=$(echo \${HOSTS[\${i#0}]} | cut -d' ' -f\`expr \${j#0} + 1\`) # NUM_OF_CABLES=HOSTS[i][j]
        if [ "$NUM_OF_CABLES" != "0" ]
        then
            for k in $(eval echo {1..$NUM_OF_CABLES})
            do
                #ovs-vsctl add-port sw$j ge-1/1/$i -- set Interface ge-1/1/$i type=pica8
                #ip link add c.sw$j-host$i.$k type veth peer name c.host$i-sw$j.$k
                #ip link set c.sw$j-host$i.$k up
                #ip link set c.host$i-sw$j.$k up
                #ip link set c.sw$j-host$i.$k netns Host-$i
                #ovs-vsctl add-port sw$j c.host$i-sw$j.$k
            done
        fi
    done
done

echo -e "Setting link configruation...\\n"
for index in "$\{!LINKCONFIG[@]\}"
do 
  tc qdisc add dev c.$index $\{LINKCONFIG[$index]\}
done

# Hosts are implemented using namespaces. See ip-netns(8) for more details. For example:
# ip netns exec Host-01 ifconfig c.sw02-host01.2 192.168.0.1 netmask 255.255.255.0
# You can even get the full access to the host by running the shell of your choice:
# ip netns exec Host-03 bash
# ifconfig 192.168.0.3 netmask 255.255.255.0
# exit # Return to the main host

echo "Press Ctrl-C to exit..."

while : ; do sleep 1 ; done

exit 0

} 9>/var/lock/ovs-mesh.lock`
  }
}
