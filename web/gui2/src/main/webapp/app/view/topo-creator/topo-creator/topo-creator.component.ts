import { Component, OnInit, ViewChild } from '@angular/core';
import { TopMenuComponent } from '../topmenu/topmenu.component';
import { DefaultConfigurationService } from '../default-configuration.service';
import { OvsMeshService } from '../ovs-mesh-service.service';
import { NodePopupComponent } from '../node-popup/node-popup.component';
import { NodePopupService } from '../node-popup.service';
import { ElementRef, Renderer2 } from '@angular/core';

declare var $: any;
// declare var bootstrap: any;
// declare var vis: any;
import * as _ from "lodash";
import { DataSet, Network, Node, Edge } from 'vis';
import { _def } from '@angular/core/src/view/provider';
// import * as $ from 'jquery';
// import * as bootstrap from 'bootstrap';

@Component({
  selector: 'onos-topo-creator',
  templateUrl: './topo-creator.component.html',
  styleUrls: ['./topo-creator.component.css']
})


export class TopoCreatorComponent implements OnInit {
  _nodes: DataSet<any>;
  _edges: DataSet<any>;
  _data: any;
  locales: any;
  _defaultConfiguration: any;
  _network: any;
  _options: any;


  ngOnInit() {
    this._defaultConfiguration = this.initDefaultConfiguration();
    this._options = this.initOption();
    this._data = this.initNetworkData();
    this.initNetwork(this._data);
  }

  initNetworkData() {
    this._nodes = new DataSet([
      { id: 0, index: 0, group: 'switch', label: 'sw00', x: -147, y: -77, controller: 'tcp:127.0.0.1:6633', listen: 'ptcp:6634', ofv: 'OpenFlow13' },
      { id: 1, index: 1, group: 'switch', label: 'sw01', x: -186, y: 88, controller: 'tcp:127.0.0.1:6633', listen: 'ptcp:6634', ofv: 'OpenFlow13' },
      { id: 2, index: 2, group: 'switch', label: 'sw02', x: 8, y: 160, controller: 'tcp:127.0.0.1:6633', listen: 'ptcp:6634', ofv: 'OpenFlow13' },
      { id: 3, index: 3, group: 'switch', label: 'sw03', x: 159, y: 28, controller: 'tcp:127.0.0.1:6633', listen: 'ptcp:6634', ofv: 'OpenFlow13' },
      { id: 4, index: 4, group: 'switch', label: 'sw04', x: 45, y: -111, controller: 'tcp:127.0.0.1:6633', listen: 'ptcp:6634', ofv: 'OpenFlow13' },

      { id: 5, index: 0, group: 'host', label: 'Host-00', x: -257.5, y: -58.5 },
      { id: 6, index: 1, group: 'host', label: 'Host-01', x: 193.75, y: -68.55 }
    ]);
    this._edges = new DataSet([
      { from: 0, to: 1 },
      { from: 0, to: 1 },
      { from: 0, to: 2 },
      { from: 0, to: 3 },
      { from: 0, to: 4 },
      { from: 0, to: 4 },
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 3 },
      { from: 2, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 4 },
      { from: 5, to: 1 },
      { from: 6, to: 4 }
    ]);
    var networkData = {
      nodes: this._nodes,
      edges: this._edges
    };
    return networkData;
  }
  initNetwork(networkData) {
    var topoCreator = this;
    var container = document.getElementById('mynetwork');
    this._network = new Network(container, networkData, this._options);
  }
  public constructor(private defaultConfigurationService: DefaultConfigurationService,
    private ovsMeshService: OvsMeshService, private nodePopupService: NodePopupService) {
  }
  assignValues(nodeData) {
    nodeData.controller = (<HTMLInputElement>document.getElementById('node-controller')).value.trim();
    nodeData.listen = (<HTMLInputElement>document.getElementById('node-listen')).value.trim();
    nodeData.ofv = (<HTMLInputElement>document.getElementById('node-ofv')).value.trim();
  }
  initOption() {
    var topoCreator = this;
    var options = {
      locale: 'ovs',
      locales: {
        ovs: {
          edit: 'Edit',
          del: 'Delete selected',
          back: 'Back',
          addNode: 'Add Node',
          addEdge: 'Add Link',
          editNode: 'Edit Switch',
          editEdge: 'Edit Link',
          addDescription: 'Click in an empty space to place a new node.',
          edgeDescription: 'Click on a node and drag the link to another node to connect them.',
          editEdgeDescription: 'Click on the control points and drag them to a node to connect to it.',
          createEdgeError: 'Cannot link edges to a cluster.',
          deleteClusterError: 'Clusters cannot be deleted.',
          editClusterError: 'Clusters cannot be edited.'
        }
      },
      interaction: {
        hover: true,
        keyboard: {
          enabled: true,
          speed: { x: 3, y: 3, zoom: 0.02 },
          bindToWindow: false
        },
        multiselect: true,
        navigationButtons: true
      },

      manipulation: {
        enabled: true,
        initiallyActive: true,

        /**
         * Add a new switch or host.
         * If a node is going to be added by a user, this function will be called first.
         * http://visjs.org/docs/network/manipulation.html
         *
         * @param nodeData
         * @param callback
         */
        addNode(nodeData, callback) {
          // Set Modal's Title and Default Input Values
          document.getElementById('operation').innerHTML = "Add Node";
          document.getElementById('saveButton-text').innerHTML = " Add Node";
          (<HTMLInputElement>document.getElementById('node-controller')).value = topoCreator._defaultConfiguration.controller;
          (<HTMLInputElement>document.getElementById('node-listen')).value = topoCreator._defaultConfiguration.listen;
          (<HTMLInputElement>document.getElementById('node-ofv')).value = topoCreator._defaultConfiguration.ofv;
          $('#node-type').prop('disabled', false);

          // Save Button Click
          document.getElementById('saveButton').onclick = function () {

            let nodeTypeSelectElement = <HTMLSelectElement>document.getElementById("node-type");
            let nodeType = nodeTypeSelectElement.options[nodeTypeSelectElement.selectedIndex].value;

            if (nodeType == "switch") {
              // assignValues(nodeData);
              nodeData.controller = (<HTMLInputElement>document.getElementById('node-controller')).value.trim();
              nodeData.listen = (<HTMLInputElement>document.getElementById('node-listen')).value.trim();
              nodeData.ofv = (<HTMLInputElement>document.getElementById('node-ofv')).value.trim();

              // eventHub.$emit('add-switch', nodeData);
              topoCreator.ovsMeshService.publishAddSwitchEvent(nodeData);
              callback(nodeData);

              // Emit these events just to update the listed values of controllers, listens & ofvs of nodes
              // eventHub.$emit('change-default-controller');
              // eventHub.$emit('change-default-listen');
              // eventHub.$emit('change-default-ofv');
              topoCreator.defaultConfigurationService.changeDefaultController(undefined);
              topoCreator.defaultConfigurationService.changeDefaultListen(undefined);
              topoCreator.defaultConfigurationService.changeDefaultOfv(undefined);
              $('#network-popUp').modal('hide');
            }

            if (nodeType == "host") {
              // eventHub.$emit('add-host', nodeData);
              topoCreator.ovsMeshService.publishAddHostEvent(nodeData);
              callback(nodeData);

              $('#network-popUp').modal('hide');
            }

          };

          $('#network-popUp').modal();
        },

        /**
         * Change the value of controller, listen and/or ofv for a selected switch.
         * If a node is going to be edited by a user, this function will be called first.
         * http://visjs.org/docs/network/manipulation.html
         *
         * @param nodeData
         * @param callback
         */
        editNode(nodeData, callback) {
          if (nodeData.group == "switch") {
            // Set Modal's Title and Input Values
            (<HTMLSelectElement>document.getElementById("node-type")).selectedIndex = 0;
            document.getElementById('operation').innerHTML = "Edit Switch " + nodeData.label;
            document.getElementById('saveButton-text').innerHTML = " Save Changes";
            (<HTMLInputElement>document.getElementById('node-controller')).value = nodeData.controller;
            (<HTMLInputElement>document.getElementById('node-listen')).value = nodeData.listen;
            (<HTMLInputElement>document.getElementById('node-ofv')).value = nodeData.ofv;

            $('#node-type').prop('disabled', 'disabled');

            // Save Button Click
            document.getElementById('saveButton').onclick = function () {
              nodeData.controller = (<HTMLInputElement>document.getElementById('node-controller')).value.trim();
              nodeData.listen = (<HTMLInputElement>document.getElementById('node-listen')).value.trim();
              nodeData.ofv = (<HTMLInputElement>document.getElementById('node-ofv')).value.trim();

              callback(nodeData);

              // Emit these events just to update the listed values of controllers, listens & ofvs of nodes
              // eventHub.$emit('change-default-controller');
              // eventHub.$emit('change-default-listen');
              // eventHub.$emit('change-default-ofv');
              topoCreator.defaultConfigurationService.changeDefaultController(undefined);
              topoCreator.defaultConfigurationService.changeDefaultListen(undefined);
              topoCreator.defaultConfigurationService.changeDefaultOfv(undefined);
              $('#network-popUp').modal('hide');
            };

            // If a user cancels editing- Vis excepts: callback(null);
            $('#network-popUp').on('hide.bs.modal', function (e) {
              callback(null);
            });

            // Display Popup with Form
            // eventHub.$emit('edit-switch');
            topoCreator.nodePopupService.publishEditSwitchEvent(undefined);
            $('#network-popUp').modal();

          } else {
            callback(null);
          }
        },

        /**
         * Delete selected switch(es) and/or host(s).
         * If a node is going to be deleted by a user, this function will be called first.
         * http://visjs.org/docs/network/manipulation.html
         *
         * @param deleteData
         * @param callback
         */
        deleteNode(deleteData, callback) {
          // eventHub.$emit('delete-node', deleteData);
          topoCreator.ovsMeshService.publishDeleteNodeEvent(deleteData);
          callback(deleteData);

          // Emit these events just to update the listed values of controllers, listens & ofvs of nodes
          // eventHub.$emit('change-default-controller');
          // eventHub.$emit('change-default-listen');
          // eventHub.$emit('change-default-ofv');
          topoCreator.defaultConfigurationService.changeDefaultController(undefined);
          topoCreator.defaultConfigurationService.changeDefaultListen(undefined);
          topoCreator.defaultConfigurationService.changeDefaultOfv(undefined);
        },

        /**
         * Add a new link between two nodes (switches/host and switch).
         * If an edge (link) is going to be added by a user, this function will be called first.
         * http://visjs.org/docs/network/manipulation.html
         *
         * @param edgeData
         * @param callback
         */
        addEdge(edgeData, callback) {
          var nodeOne = topoCreator._nodes.get(edgeData.from);
          var nodeTwo = topoCreator._nodes.get(edgeData.to);

          if (edgeData.from === edgeData.to) {
            $('#add-link-error').modal(); // You cannot connect node (switch or host) to itself;
            callback(null);
          } else if (nodeOne.group === "host" && nodeTwo.group === "host") {
            $('#add-link-error').modal(); // Hosts cannot connect to other hosts.
            callback(null);
          } else if (nodeOne.group === "switch" && nodeTwo.group === "switch") {
            // eventHub.$emit('add-s2s-link', edgeData);
            topoCreator.ovsMeshService.publishAddS2SLinkEvent(edgeData);
            callback(edgeData);
          } else if (nodeOne.group != nodeTwo.group) {
            // eventHub.$emit('add-h2s-link', edgeData);
            let host = <any>_.find([nodeOne, nodeTwo], <any>{ 'group': 'host' });
            var hasEdge = topoCreator._network.getConnectedEdges(host.id).length > 0 ? true : false;
            if (!hasEdge) {
              topoCreator.ovsMeshService.publishAddH2SLinkEvent(edgeData);
              callback(edgeData);
            } else {
              $('#add-link-error').modal(); // Host cannot have more than one connection.
              callback(null)
            }
          }
        },

        /**
         * Redirect the selected link which connects two switches or switch and host.
         * If an edge (link) is going to be edited by a user, this function will be called first.
         *
         * @param edgeData
         * @param callback
         */
        // editEdge(edgeData, callback) {
        //   if (edgeData.from === edgeData.to) {
        //     $('#add-link-error').modal(); // You cannot connect node (switch or host) to itself;
        //     callback(null);
        //   } else if (topoCreator._nodes.get(edgeData.from).group == 'host' && topoCreator._nodes.get(edgeData.to).group == 'host') {
        //     $('#add-link-error').modal(); // Hosts cannot connect to other hosts.
        //     callback(null);
        //   } else {
        //     // eventHub.$emit('edit-link', edgeData);
        //     topoCreator.ovsMeshService.publishEditLinkEvent(edgeData);
        //     callback(edgeData)
        //   }
        // },
        editEdge: {
          editWithoutDrag: function (edgeData, callback) {
            var linkConfigurationVar = {
              rate: 0,
              delay: {
                delayTime: 0,
                delayVariance: 0
              },
              loss: {
                lossRate: 0,
                lossCorrelation: 0
              },
              duplicate: 0,
              reorder: {
                reorderRate: 0,
                reorderCorrelation: 0
              },
              corrupt: 0
            };
            if (!topoCreator._edges._data[edgeData['id']].linkConfiguration) {
              edgeData.linkConfiguration = linkConfigurationVar;
            } else {
              edgeData.linkConfiguration = topoCreator._edges._data[edgeData['id']].linkConfiguration;
            }
            (<HTMLInputElement>document.getElementById('rate')).value = edgeData.linkConfiguration['rate'];
            (<HTMLInputElement>document.getElementById('delayTime')).value = edgeData.linkConfiguration['delay']['delayTime'];
            (<HTMLInputElement>document.getElementById('delayVariance')).value = edgeData.linkConfiguration['delay']['delayVariance'];
            (<HTMLInputElement>document.getElementById('lossRate')).value = edgeData.linkConfiguration['loss']['lossRate'];
            (<HTMLInputElement>document.getElementById('lossCorrelation')).value = edgeData.linkConfiguration['loss']['lossCorrelation'];
            (<HTMLInputElement>document.getElementById('duplicate')).value = edgeData.linkConfiguration['duplicate'];
            (<HTMLInputElement>document.getElementById('reorderRate')).value = edgeData.linkConfiguration['reorder']['reorderRate'];
            (<HTMLInputElement>document.getElementById('reorderCorrelation')).value = edgeData.linkConfiguration['reorder']['reorderCorrelation'];
            (<HTMLInputElement>document.getElementById('corrupt')).value = edgeData.linkConfiguration['corrupt'];
            document.getElementById('saveLinkButton').onclick = function () {
              linkConfigurationVar['rate'] = parseInt((<HTMLInputElement>document.getElementById('rate')).value);
              linkConfigurationVar['delay']['delayTime'] = parseInt((<HTMLInputElement>document.getElementById('delayTime')).value);
              linkConfigurationVar['delay']['delayVariance'] = parseInt((<HTMLInputElement>document.getElementById('delayVariance')).value);
              linkConfigurationVar['loss']['lossRate'] = parseInt((<HTMLInputElement>document.getElementById('lossRate')).value);
              linkConfigurationVar['loss']['lossCorrelation'] = parseInt((<HTMLInputElement>document.getElementById('lossCorrelation')).value);
              linkConfigurationVar['duplicate'] = parseInt((<HTMLInputElement>document.getElementById('duplicate')).value);
              linkConfigurationVar['reorder']['reorderRate'] = parseInt((<HTMLInputElement>document.getElementById('reorderRate')).value);
              linkConfigurationVar['reorder']['reorderCorrelation'] = parseInt((<HTMLInputElement>document.getElementById('reorderCorrelation')).value);
              linkConfigurationVar['corrupt'] = parseInt((<HTMLInputElement>document.getElementById('corrupt')).value);
              // Emit these events just to update the listed values of controllers, listens & ofvs of nodes
              // eventHub.$emit('change-default-controller');
              // eventHub.$emit('change-default-listen');
              // eventHub.$emit('change-default-ofv');
              $('#link-configuration').modal('hide');
              topoCreator._edges.update({ id: edgeData.id, linkConfiguration: linkConfigurationVar });
              // console.log(topoCreator._edges);
              edgeData.linkConfiguration = linkConfigurationVar;
              callback(edgeData);
              // topoCreator._network.disableEditMode();
              // console.log(callback);
              // callback(edgeData);
              topoCreator.ovsMeshService.publishEditLinkEvent(edgeData);
            };
            $('#link-configuration').modal();
            callback(null);
            // topoCreator._edges.update({ id: edgeData['id'], linkConfiguration: linkConfigurationVar });
          }
        },

        /**
         * Delete the selected link.
         * If an edge (link) is going to be deleted by a user, this function will be called first.
         *
         * @param deleteData
         * @param callback
         */
        deleteEdge(deleteData, callback) {
          // eventHub.$emit('delete-link', deleteData);
          topoCreator.ovsMeshService.publishDeleteLinkEvent(deleteData);
          callback(deleteData)
        }
      }, // manipulation

      nodes: {
        // physics: false,
        shape: 'diamond',
        size: 16
      },

      edges: {
        color: '#666666'
      },

      groups: {
        host: {
          color: '#FF9900',
          shape: 'triangle'
        }
      }
    }
    return options;
  }
  initDefaultConfiguration() {
    var _defaultConfiguration = {
      controller: 'tcp:127.0.0.1:6633',
      listen: 'ptcp:6634',
      ofv: 'OpenFlow13'
    };
    return _defaultConfiguration;
  }
}
