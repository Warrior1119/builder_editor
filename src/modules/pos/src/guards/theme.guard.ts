import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable, combineLatest, forkJoin } from 'rxjs';
import { map, switchMap, tap, first } from 'rxjs/operators';

import { PebEnvService } from '@pe/builder-core';
import { PebPosApi, PebThemesApi } from '@pe/builder-api';
import { PosClientTerminalService } from '@pe/builder-pos-client';

@Injectable({ providedIn: 'any' })
export class TerminalThemeGuard implements CanActivate {
  constructor(
    private api: PebPosApi,
    private router: Router,
    private envService: PebEnvService,
    private themesApi: PebThemesApi,
    private terminalService: PosClientTerminalService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const terminalId = this.envService.terminalId || route.params.terminalId || route.parent.params.terminalId;
    this.envService.terminalId = terminalId;

    if (!terminalId) {
      throw new Error('There is no TERMINAL ID in the url path');
    }

    return combineLatest([
      this.api.getTerminalActiveTheme(terminalId, this.envService.businessId),
      this.api.getSingleTerminal(terminalId),
      this.api.getTerminalPreview(terminalId),
    ]).pipe(
      tap(([theme, terminal, preview]) => {
        this.terminalService.terminal = terminal;
        this.terminalService.theme = preview.published || preview.current;
        if (!theme || !theme.length) {
          this.router.navigate([
            `/business/${this.envService.businessId}/pos/${terminalId}/themes`,
          ]);
        }
      }),
      switchMap(([theme]) => this.themesApi.getThemeById(theme[0].theme)),
      map((theme) => {
        if (theme) {
          route.data = { ...route.data, theme };
          return true;
        }
      }),
    );
  }
}
