import { of } from 'rxjs'
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { PebElementContextState, PebEnvService } from '@pe/builder-core';
import { PebActualProductsApi, PebProductsApi, PEB_PRODUCTS_API_PATH, PEB_STORAGE_PATH } from '@pe/builder-api';

/**
 * TODO(@dmlukichev): This should use PebProductsApi instead
 */
@Injectable({ providedIn: 'root' })
export class ProductsContext {

  constructor(
    @Inject(PEB_PRODUCTS_API_PATH) private productsApiPath: string,
    @Inject(PEB_STORAGE_PATH) private mediaStoragePath: string,
    private envService: PebEnvService,
    private http: HttpClient,
    private productsApi: PebProductsApi,
  ) {}

  getByIds(ids: string[]) {
    return this.productsApi.getProducts(ids).pipe(
      map(data => ({
        state: PebElementContextState.Ready,
        data,
      })),
    );
  }

  getProductDetails(id: string) {
    return of({
      state: 'ready',
      data: {
        title: 'Product detail',
        description: '',
        price: '',
        salePrice: '',
        currency: '',
        images: [],
        variants: [
          {
            id: '',
            title: '',
            description: '',
            price: '',
            salePrice: '',
            disabled: false,
            options: [],
            images: [],
          },
        ],
      },
    });
  }

  getProducts(id: string) {
    return of({
      state: 'ready',
      data: [{
        title: 'Product',
        description: 'Description',
        price: '10',
        salePrice: '12',
        currency: 'USD',
        images: [
          '/assets/showcase-images/products/fill-1.svg',
        ],
      }],
    });
  }

  /** @deprecated */
  private mapProductData(product) {
    console.warn('Method is duplicated. This should be resolved in PebProductsApi');
    return (PebActualProductsApi.prototype as any).mapProductData.call(this, product);
  }
}
