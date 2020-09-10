import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

import { PebEnvService } from '@pe/builder-core';

import { TerminalInterface } from '../interfaces';
import { PEB_POS_CHECKOUT_WRAPPER_FRONTEND_PATH } from '../../../constants';

@Injectable()
export class PosConnectService {
  terminal$: BehaviorSubject<TerminalInterface> = new BehaviorSubject(null);
  integration$: BehaviorSubject<any> = new BehaviorSubject(null);

  get integration(): any {
    return this.integration$.value;
  }

  get terminal(): any {
    return this.terminal$.value;
  }

  constructor(
    private http: HttpClient,
    private envService: PebEnvService,
    @Inject(PEB_POS_CHECKOUT_WRAPPER_FRONTEND_PATH) private checkoutPath: string,
  ) {}

  get checkoutWrapperCustomerViewLink(): string {
    return `${this.checkoutPath}/pay/create-flow-from-qr/channel-set-id/${this.terminal.channelSet}`;
  }

  requestInitialForm(): Observable<{ form: any }> {
    const url = `${this.integration.extension.url}/app/${this.envService.businessId}/generate`;

    return this.http.post<{ form: any }>(url, {
      businessId: this.envService.businessId,
      businessName: this.envService.businessData.name,
      url: this.checkoutWrapperCustomerViewLink,
      id: this.terminal._id,
      avatarUrl: this.terminal.logo,
    });
  }
}
