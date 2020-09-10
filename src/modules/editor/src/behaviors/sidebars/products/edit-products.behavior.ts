import { ComponentRef, Injectable, Injector } from '@angular/core';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import {
  debounceTime,
  filter,
  finalize,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { FormGroup } from '@angular/forms';

import { pebCreateLogger, PebElementType } from '@pe/builder-core';

import { PebEditorProductsSidebarComponent } from './products.sidebar';
import { Axis, PebEditorElement } from '../../../renderer/editor-element';
import { AbstractEditElementWithSidebar } from '../_sidebar.behavior';
import { ProductsDimensionsBehavior } from './products-dimensions.bahavior';
import {
  ProductsFontBehavior,
  ProductsFontTypes,
} from './products-font.behavior';
import { getColumnsAndRows } from './products.utils';

const log = pebCreateLogger('editor:behaviors:edit-products');

const DEFAULT_PRODUCT_WIDTH = 220;
const DEFAULT_PRODUCT_HEIGHT = 280;

export interface ProductDimensions {
  initialValue: { width: number; height: number };
  form: FormGroup;
  limits: {
    width: BehaviorSubject<{ min: number; max: number }>;
    height: BehaviorSubject<{ min: number; max: number }>;
  };
  activate: () => void;
  update: () => void;
  submit: Subject<any>;
}

const PRODUCTS_MARGIN = 15;

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorEditProducts extends AbstractEditElementWithSidebar {
  static elementTypes = [PebElementType.Products];

  static sidebarComponent = PebEditorProductsSidebarComponent;

  logger = { log };

  behaviourState: {
    sidebarRef: ComponentRef<PebEditorProductsSidebarComponent>;
    activeElement: PebEditorElement;
  } = {
    sidebarRef: null,
    activeElement: null,
  };

  constructor(
    private productsDimensionsBehavior: ProductsDimensionsBehavior,
    private productsFontBehavior: ProductsFontBehavior,
    injector: Injector,
  ) {
    super(injector);
  }

  init(): Observable<any> {
    return this.singleElementOfTypeSelected$().pipe(
      switchMap(elCmp => {
        const sidebarRef = this.initSidebar(elCmp) as ComponentRef<
          PebEditorProductsSidebarComponent
        >;
        const sidebar = sidebarRef.instance;
        sidebar.context = elCmp.context;
        this.initShadowForm(elCmp);
        this.initPositionForm(elCmp);
        this.initDimensionsForm(elCmp);
        this.productsDimensionsBehavior.initDimensionsForm(elCmp);

        sidebar.priceFont = this.productsFontBehavior.initProductFontForm(
          elCmp.styles,
          ProductsFontTypes.Price,
        );
        sidebar.titleFont = this.productsFontBehavior.initProductFontForm(
          elCmp.styles,
          ProductsFontTypes.Title,
        );

        return merge(
          this.productsGridFlow(elCmp, sidebar),
          this.handleShadowForm(elCmp),
          this.handleProductsStyleChanges(elCmp, sidebar),
          this.productsFontBehavior.handleProductFontForm(
            elCmp,
            sidebar.priceFont,
          ),
          this.productsFontBehavior.handleProductFontForm(
            elCmp,
            sidebar.titleFont,
          ),
          this.handlePositionForm(elCmp),
          this.handleDimensionsForm(elCmp),
          this.productsDimensionsBehavior.handleDimensionsForm(elCmp),
          this.handleDeleteProducts(elCmp, sidebar),
        ).pipe(
          takeUntil(this.state.selectionChanged$()),
          finalize(() => sidebarRef.destroy()),
        );
      }),
    );
  }

  private handleDeleteProducts(
    elCmp: PebEditorElement,
    sidebar: PebEditorProductsSidebarComponent,
  ) {
    return sidebar.removeProductHandler.pipe(
      filter(product => !!product),
      map((product: any) =>
        elCmp.context.data
          .filter(({ id }) => id !== product.id)
          .map(({ id }) => id),
      ),
      switchMap(productsIds =>
        this.loadProducts(elCmp, sidebar, productsIds).pipe(
          tap(() => elCmp.dimensions.update()),
        ),
      ),
    );
  }

  private productsGridFlow(
    elCmp: PebEditorElement,
    sidebar: PebEditorProductsSidebarComponent,
  ): Observable<any> {
    return sidebar.openProductsGrid.pipe(
      switchMap(() =>
        this.editor
          .openProductsDialog(
            elCmp.context?.data?.length
              ? elCmp.context.data?.map(p => p.id)
              : [],
          )
          .pipe(map(productsIds => ({ elCmp, productsIds }))),
      ),
      filter(({ elCmp, productsIds }) => !!productsIds),
      switchMap(({ elCmp, productsIds }) =>
        this.loadProducts(elCmp, sidebar, productsIds).pipe(
          tap(() => this.calcGridSize(elCmp)),
        ),
      ),
    );
  }

  private loadProducts(
    elCmp: PebEditorElement,
    sidebar: PebEditorProductsSidebarComponent,
    productsIds: string[],
  ) {
    const columns = Number(elCmp.styles.productTemplateColumns || 1);
    const rows = Number(elCmp.styles.productTemplateRows || 1);

    const nextColumns = productsIds.length
      ? columns > productsIds.length
        ? productsIds.length
        : columns
      : columns;

    const nextRows = productsIds.length
      ? Math.ceil(productsIds.length / nextColumns)
      : rows;

    const nextStyles = {
      ...elCmp.styles,
      productTemplateColumns: nextColumns,
      productTemplateRows: nextRows,
    };

    return this.store
      .updateContext(elCmp.definition.id, {
        service: 'products',
        method: 'getByIds',
        params: [productsIds],
      })
      .pipe(
        switchMap(() =>
          this.store.updateStyles(this.state.screen, {
            [elCmp.definition.id]: nextStyles,
          }),
        ),
        debounceTime(100),
        tap(e => {
          sidebar.context = elCmp.context;
          elCmp.productDimensions.activate();
          elCmp.productDimensions.submit.next();
        }),
      );
  }

  private handleProductsStyleChanges(
    elCmp: PebEditorElement,
    sidebar: PebEditorProductsSidebarComponent,
  ): Observable<any> {
    return sidebar.changes.pipe(
      map(changes => ({
        ...elCmp.styles,
        ...changes.styles,
      })),
      switchMap(styles =>
        this.store.updateStyles(this.state.screen, {
          [elCmp.definition.id]: styles,
        }),
      ),
    );
  }

  protected getDimensionsLimits(elementCmp: PebEditorElement) {
    const widthMaxDimensions = elementCmp.getMaxPossibleDimensions(
      Axis.Horizontal,
    );
    const heightMaxDimensions = elementCmp.getMaxPossibleDimensions(
      Axis.Vertical,
    );

    if (!widthMaxDimensions || !heightMaxDimensions) {
      return;
    }

    const { productTemplateColumns, productTemplateRows } = getColumnsAndRows(
      elementCmp,
    );
    const itemWidth =
      elementCmp.productDimensions?.form.value.width ??
      elementCmp.styles.itemWidth ??
      DEFAULT_PRODUCT_WIDTH;
    const itemHeight =
      elementCmp.productDimensions?.form.value.height ??
      elementCmp.styles.itemHeight ??
      DEFAULT_PRODUCT_HEIGHT;
    const elementWidthMinDimensions =
      itemWidth * productTemplateColumns +
      (PRODUCTS_MARGIN * productTemplateColumns - 1);

    const elementHeightMinDimensions = itemHeight * productTemplateRows;

    return {
      width: {
        min: Math.max(
          elementWidthMinDimensions,
          elementCmp.getMinPossibleDimensions(Axis.Horizontal),
        ),
        max: widthMaxDimensions.size - widthMaxDimensions.spaceStart,
      },
      height: {
        min: Math.max(
          elementHeightMinDimensions,
          elementCmp.getMinPossibleDimensions(Axis.Vertical),
        ),
        max: heightMaxDimensions.size - heightMaxDimensions.spaceStart,
      },
    };
  }

  private calcGridSize(elCmp: PebEditorElement, columns?: number) {
    const { productTemplateColumns, productTemplateRows } = getColumnsAndRows(
      elCmp,
    );
    columns = columns ?? productTemplateColumns;

    elCmp.productDimensions.update();
    elCmp.dimensions.update();
    elCmp.dimensions.form.patchValue({
      width: Math.max(
        elCmp.getMinPossibleDimensions(Axis.Horizontal),
        elCmp.productDimensions.form.value.width * columns + columns * 15,
      ),
      height: elCmp.productDimensions.form.value.height * productTemplateRows,
    });
    elCmp.productDimensions.submit.next();
  }
}
