import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'onos-link-configuration',
  templateUrl: './link-configuration.component.html',
  styleUrls: ['./link-configuration.component.css']
})
export class LinkConfigurationComponent implements OnInit {
  linkConfiguration = {
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
      reoderRate: 0,
      reoderCorrelation: 0
    },
    corrupt: 0
  };
  constructor() { }

  ngOnInit() {
  }

}
