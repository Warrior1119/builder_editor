import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { BusinessInterface, PebEnvService } from '@pe/builder-core';

@Injectable()
export class SandboxEnv implements PebEnvService {

  constructor() {}

  businessId: string;
  protected shopId$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  protected terminalId$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  set shopId(value: string) {
    this.shopId$.next(value);
  }

  set terminalId(value: string) {
    this.terminalId$.next(value);
  }

  get shopId(): string {
    return this.shopId$.value;
  }

  get terminalId(): string {
    return this.terminalId$.value;
  }

  get channelId(): string {
    return 'SANDBOX_CHANNEL';
  }

  businessData: BusinessInterface;
}
