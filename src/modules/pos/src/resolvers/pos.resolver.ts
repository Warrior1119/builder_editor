import { ActivatedRouteSnapshot, Resolve, Router } from '@angular/router';
import { Inject, Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { PebEnvService, MessageBus } from '@pe/builder-core';
import { PebEditorApi, PebPosApi } from '@pe/builder-api';

@Injectable()
export class PosResolver implements Resolve<any> {
  constructor(
    private apiService: PebPosApi,
    private router: Router,
    private envService: PebEnvService,
    private messageBus: MessageBus,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const terminalId = this.envService.terminalId || route.params.terminalId || route.parent.params.terminalId;

    this.envService.terminalId = terminalId;
    return this.apiService.getSingleTerminal(terminalId).pipe(
      tap(pos => {
        route.data = { ...route.data, pos };
      }),
    );
  }
}
