import { Injectable, Injector } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, share, take, tap } from 'rxjs/operators';

import { BaseMicroService } from './base-micro.service';

@Injectable()
export class MicroLoaderService extends BaseMicroService {
  private buildHashObservables: { [key: string]: Observable<string> } = {};
  private buildMicroConfigObservables: {
    [key: string]: Observable<any>;
  } = {};
  private buildObservables: { [key: string]: Observable<boolean> } = {};
  private innerBuildObservables: { [key: string]: Observable<boolean> } = {};
  private readonly microFileName: string = 'micro';

  constructor(injector: Injector) {
    super(injector);
  }

  loadBuildHash(microCode: string): Observable<string> {
    if (!this.buildHashObservables[microCode]) {
      this.buildHashObservables[microCode] = this._createBuildHashObservable(
        microCode,
      ).pipe(
        take(1),
        share(),
        tap(() => delete this.buildHashObservables[microCode]),
      );
    }
    return this.buildHashObservables[microCode];
  }

  loadBuildMicroConfig(microCode: string): Observable<any> {
    if (!this.buildMicroConfigObservables[microCode]) {
      this.buildMicroConfigObservables[
        microCode
      ] = this._createBuildMicroConfigObservable(microCode).pipe(
        take(1),
        share(),
        tap(() => delete this.buildMicroConfigObservables[microCode]),
      );
    }
    return this.buildMicroConfigObservables[microCode];
  }

  loadBuild(
    microCode: string,
    forceReload: boolean = false,
  ): Observable<boolean> {
    if (forceReload) {
      this.buildObservables[microCode] = null;
    }

    if (!this.buildObservables[microCode]) {
      this.buildObservables[microCode] = this._createBuildObservable(
        microCode,
        forceReload,
      ).pipe(
        take(1),
        share(),
        tap(() => delete this.buildObservables[microCode]),
      );
    }
    return this.buildObservables[microCode];
  }

  loadInnerMicroBuild(
    microCode: string,
    innerMicroCode: string,
    forceReload: boolean = false,
  ): Observable<boolean> {
    if (forceReload) {
      this.innerBuildObservables[microCode] = null;
    }

    if (!this.innerBuildObservables[microCode]) {
      this.innerBuildObservables[
        microCode
      ] = this._createInnerMicroBuildObservable(
        microCode,
        innerMicroCode,
        forceReload,
      ).pipe(
        take(1),
        share(),
        tap(() => delete this.innerBuildObservables[microCode]),
      );
    }
    return this.innerBuildObservables[microCode];
  }

  getResourceUrl(
    microCode: string,
    buildHash: string,
    resourceName: string,
    resourceType: string,
    allowCache: boolean = true,
  ): string {
    const config: any = this.config.frontend;

    if (config && config[microCode]) {
      return `${config[microCode]}/${resourceName}.${resourceType}${
        buildHash ? `?${buildHash}` : ''
      }`;
    } else {
      // For wrapper tests
      return `/dist_ext/${microCode}/${resourceName}.${resourceType}${
        allowCache ? '' : `?${+new Date()}`
      }`;
    }
  }

  private _createBuildObservable(
    microCode: string,
    forceReload: boolean = false,
  ): Observable<boolean> {
    return this.loadBuildHash(microCode).pipe(
      mergeMap((buildHash: string) => {
        const url: string = this.getResourceUrl(
          microCode,
          buildHash,
          this.microFileName,
          'js',
        );
        if (forceReload) {
          this.registry.scripts[url] = null;
        }
        return this.loadScript(url, microCode);
      }),
    );
  }

  private _createInnerMicroBuildObservable(
    microCode: string,
    innerMicroCode: string,
    forceReload: boolean = false,
  ): Observable<boolean> {
    return this.loadBuildHash(microCode).pipe(
      mergeMap((buildHash: string) => {
        return this._createBuildMicroConfigObservable(microCode).pipe(
          mergeMap((config: any) => {
            if (
              !config.innerMicros ||
              !config.innerMicros[innerMicroCode] ||
              !config.innerMicros[innerMicroCode].bootstrapScriptUrl
            ) {
              throw new Error(`Cant find inner micro: ${innerMicroCode}`);
            }
            const url: string =
              config.innerMicros[innerMicroCode].bootstrapScriptUrl;
            if (forceReload) {
              this.registry.scripts[url] = null;
            }
            return this.loadScript(url, microCode);
          }),
        );
      }),
    );
  }

  private _createBuildHashObservable(microCode: string): Observable<string> {
    if (this.registry.buildHashes[microCode]) {
      return of(this.registry.buildHashes[microCode].micro);
    } else {
      const logStart: number = new Date().getTime();
      const url: string = this.getResourceUrl(
        microCode,
        null,
        'hashmap',
        'json',
        false,
      );
      return this.httpClient.get(url).pipe(
        tap((hashmap: any) => (this.registry.buildHashes[microCode] = hashmap)),
        map(() => this.registry.buildHashes[microCode].micro),
        catchError(error => {
          console.error(
            `Cant load micro hash during ${
              new Date().getTime() - logStart
            }ms at '${url}':\n ${error.message || JSON.stringify(error)}`,
          );
          return throwError(error);
        }),
      );
    }
  }

  private _createBuildMicroConfigObservable(
    microCode: string,
  ): Observable<any> {
    if (this.registry.buildMicroConfigs[microCode]) {
      return of(this.registry.buildMicroConfigs[microCode]);
    } else {
      const logStart: number = new Date().getTime();
      const url: string = this.getResourceUrl(
        microCode,
        null,
        'micro.config',
        'json',
        false,
      );
      return this.httpClient.get(url).pipe(
        map((config: any) => {
          this.registry.buildMicroConfigs[microCode] = config;
          return config;
        }),
        catchError(error => {
          console.error(
            `Cant load micro config during ${
              new Date().getTime() - logStart
            }ms at '${url}':\n ${error.message || JSON.stringify(error)}`,
          );
          return throwError(error);
        }),
      );
    }
  }
}
