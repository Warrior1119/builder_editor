import { Observable } from 'rxjs';

export type PebProduct = any;

export interface PebProductCategory {
  title: string;
  id: string;
  image: string;
}

export abstract class PebProductsApi {

  abstract getProducts(ids?: string[]): Observable<PebProduct[]>

  abstract getProductsCategories(): Observable<PebProductCategory[]>

}
