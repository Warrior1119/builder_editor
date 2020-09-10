import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { PebEnvService } from '@pe/builder-core';
import { PebEditorApi } from '@pe/builder-api';

@Injectable({ providedIn: 'any' })
export class ShopThemeGuard implements CanActivate {
  constructor(
    private api: PebEditorApi,
    private router: Router,
    private envService: PebEnvService,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot, state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const shopId = this.envService.shopId || route.parent.parent.params.shopId;
    if (!shopId) {
      throw new Error('There is no SHOP ID in the url path');
    }

    return this.api.getShopActiveTheme(shopId).pipe(
      tap(theme => {
        if (!theme || !theme.length) {
          this.router.navigate([`/business/${this.envService.businessId}/shop/${shopId}/themes`]);
        }
      }),
      switchMap(theme => this.api.getShopThemeById(theme[0].themeId)),
      map(theme => {
        if (theme) {
          route.data = { ...route.data, theme };
          return true;
        }

        return this.router.createUrlTree(['/']);
      }),
    );
  }
}
