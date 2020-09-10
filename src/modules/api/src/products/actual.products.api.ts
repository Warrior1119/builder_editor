import { Observable } from 'rxjs';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { filter, map } from 'rxjs/operators';

import { PebEnvService } from '@pe/builder-core';

import { PebProduct, PebProductCategory, PebProductsApi } from './abstract.products.api';
import { PEB_STORAGE_PATH } from '../constants';

export const PEB_PRODUCTS_API_PATH = new InjectionToken<string>('PEB_PRODUCTS_API_PATH');

@Injectable()
export class PebActualProductsApi implements PebProductsApi {
  constructor(
    @Inject(PEB_PRODUCTS_API_PATH) private productsApiPath: string,
    @Inject(PEB_STORAGE_PATH) private storagePath: string,
    private http: HttpClient,
    private envService: PebEnvService,
  ) {}

  getProducts(ids?: string[]): Observable<PebProduct[]> {
    return this.http.post(`${this.productsApiPath}/products`, {
      query: `{getProducts(
        businessUuid: "${this.envService.businessId}",
        ${ids ? `includeIds: [${ids.map(
          i => `"${i}"`,
        )}]` : ''}
        pageNumber: 1,
        paginationLimit: 100,
      ) {
        products {
          images
          _id
          title
          description
          price
          salePrice
          currency
        }
      }}`,
    }).pipe(
      filter((result: any) => !!result?.data?.getProducts?.products),
      map((result: any) => result.data.getProducts.products),
      map((products: any) => products.map(product => this.mapProductData(product))),
    );
  }

  getProductsCategories(): Observable<PebProductCategory[]> {
    return this.http.post(`${this.productsApiPath}/products`, {
      query: `{
        getCategories (
          businessUuid: "${this.envService.businessId}",
        ) {
          id
          title
        }
      }`,
    }).pipe(map((result: any) => result.data.getCategories));
  }

  private mapProductData(product) {
    return {
      id: product._id,
      title: product.title,
      description: product?.description,
      price: product.price,
      salePrice: product.salePrice,
      currency: product.currency,
      images: product.images?.map(
        i => `${this.storagePath}/products/${i}`,
      ),
      variants: product.variants
        ? product.variants.map(v => ({
          id: v.id,
          title: v.title,
          description: v?.description,
          price: v.price,
          salePrice: v.salePrice,
          options: v.options,
          images: v.images.map(
            i => `${this.storagePath}/products/${i}`,
          ),
        }))
        : null,
    };
  }
}
