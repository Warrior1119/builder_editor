import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'pos-connect-micro-app',
  templateUrl: './connect-micro-app.component.html',
})
export class ConnectMicroAppComponent implements OnInit {
  @ViewChild('container', { read: ElementRef, static: true })
  container: ElementRef;
  url: string;

  constructor(private activatedRoute: ActivatedRoute) {}

  async ngOnInit() {
    const params = this.activatedRoute.snapshot.params;

    let redirectData: string | any;
    if (params.action === 'add') {
      redirectData = {
        url: `connect/embedded/${params.integrationCategory}/pos`,
        getParams: {
          micro: 'pos',
          panel: params.integrationCategory,
          terminalId: params.terminalId || '',
        },
      };
    } else if (params.action === 'edit') {
      redirectData = {
        url: `connect/embedded/${params.integrationCategory}/pos/${params.integrationName}`,
        getParams: {
          micro: 'pos',
          panel: params.integrationCategory,
          terminalId: params.terminalId || '',
        },
      };
    }

    if (redirectData) {
      this.dispatchEvent({
        target: 'dashboard-micro-navigation',
        action: '',
        data: redirectData,
      });
    }
  }

  dispatchEvent(event: any, origin: string = window.location.origin): void {
    let messageString = `pe:os:${event.target}:${event.action}`;

    if (event.data) {
      if (typeof event.data === 'string') {
        messageString += `:${event.data}`;
      } else {
        messageString += `:${JSON.stringify(event.data)}`;
      }
    }

    const backgroundEvent: Event = new CustomEvent('backgroundEvent', {
      detail: messageString,
    });

    window.dispatchEvent(backgroundEvent);
  }
}
