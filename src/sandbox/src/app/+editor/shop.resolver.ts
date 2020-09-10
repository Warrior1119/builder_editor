import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

import { PebEditorApi } from '@pe/builder-api';
import { PebEnvService } from "@pe/builder-core";

@Injectable({ providedIn: 'root' })
export class SandboxShopResolver implements Resolve<any> {
  // TODO: If theme has been just created it can be passed in route data to
  //       prevent reloading
  constructor(
    private api: PebEditorApi,
    private envService: PebEnvService,
  ) {}


  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    this.envService.shopId = route.params.shopId;
    return this.api.getShopThemeById(route.params.shopId).pipe(
    );
  }
}
