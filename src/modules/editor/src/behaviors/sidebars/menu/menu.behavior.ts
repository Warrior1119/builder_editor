import { Injectable, Injector } from '@angular/core';
import { merge, Observable, Subject } from 'rxjs';
import { filter, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { FormArray } from '@angular/forms';
import { isEqual } from 'lodash';

import { pebCreateLogger, PebElementType, PebLink, PebInteractionType, PebPageVariant, PebPageType } from '@pe/builder-core';
import { PebProductCategory, PebProductsApi } from '@pe/builder-api';

import { AbstractEditElementWithSidebar } from '../_sidebar.behavior';
import { PebEditorElement } from '../../../renderer/editor-element';
import { PebEditorMenuSidebar } from './menu.sidebar';

const log = pebCreateLogger('editor:behaviors:edit-menu');

@Injectable({ providedIn: 'any' })
export class PebEditorMenuBehavior extends AbstractEditElementWithSidebar {
  static elementTypes = [PebElementType.Menu];

  static sidebarComponent = PebEditorMenuSidebar;

  logger = { log };

  constructor(
    injector: Injector,
    private productsApi: PebProductsApi,
  ) {
    super(injector);
  }

  init(): Observable<any> {
    return this.singleElementOfTypeSelected$().pipe(
      switchMap((elCmp: PebEditorElement) => this.productsApi.getProductsCategories().pipe(
        map(productCategories => ({ elCmp, productCategories })),
      )),
      switchMap(({ elCmp, productCategories }) => {

        this.initPositionForm(elCmp);
        this.initDimensionsForm(elCmp);
        this.initOpacityForm(elCmp);
        this.initMenuRoutesForm(elCmp, productCategories);
        this.initFontForm(elCmp);

        const sidebarRef = this.initSidebar(elCmp);

        return merge(
          this.handlePositionForm(elCmp),
          this.handleDimensionsForm(elCmp),
          this.handleOpacityForm(elCmp),
          this.handleMenuRoutesForm(elCmp),
          this.handleFontForm(elCmp),
        ).pipe(
          takeUntil(this.state.selectionChanged$()),
          finalize(() => sidebarRef.destroy()),
        );
      }),
    );
  }

  private initMenuRoutesForm(elementCmp: PebEditorElement, productCategories: PebProductCategory[]) {
    const initialValue = {
      menuRoutes: elementCmp.definition.data.routes,
    };
    const snapshot = this.store.snapshot;

    elementCmp.menuRoutes = {
      initialValue,
      options: {
        variants: [
          { value: PebPageVariant.Default, label: 'Page' },
          { value: PebPageVariant.Category, label: 'Category' },
          { value: '', label: 'External' },
        ],
        [PebPageVariant.Default]:
          snapshot.shop.routing.reduce((acc, route) => {
            if (snapshot.pages[route?.pageId]?.type !== PebPageType.Master) {
              acc.push({ label: route.url, value: route.routeId });
            }
            return acc;
          }, []),
        [PebPageVariant.Category]: [
          { label: 'All', value: '' },
          ...productCategories.map(c => ({ label: c.title, value: c.id })),
        ],
      },
      form: this.formBuilder.group({
        routes: new FormArray(
          initialValue.menuRoutes.map(route => this.formBuilder.group({
            title: route?.title,
            value: route.value,
            variant: route.variant,
            newTab: route.newTab,
          })),
        ),
      }),
      update: null,
      submit: new Subject<any>(),
    };
  }

  private handleMenuRoutesForm(elementCmp: PebEditorElement): Observable<any> {
    const menuRoutes = elementCmp.menuRoutes;

    return merge(
      menuRoutes.form.valueChanges.pipe(
        tap((changes) => {
          elementCmp.definition.data.routes = this.mapRoutesForm(changes.routes);
          elementCmp.detectChanges();
        }),
      ),
      menuRoutes.submit.pipe(
        filter(() => !menuRoutes.form.invalid && !isEqual(menuRoutes.initialValue, menuRoutes.form.value)),
        switchMap(() => {
          this.logger.log('Menu: Submit ', menuRoutes.form.value);

          return this.store.updateElement(elementCmp.definition);
        }),
      ),
    );
  }

  private mapRoutesForm(routes: PebLink[]) {
    return routes.map(r => ({
      ...r,
      type: r.variant === PebPageVariant.Default
        ? PebInteractionType.NavigateInternal
        : r.variant === PebPageVariant.Category
          ? PebInteractionType.NavigateInternalSpecial
          : PebInteractionType.NavigateExternal,
    }))
  }

}
