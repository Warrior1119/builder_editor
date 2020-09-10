import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { share, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

import { PebShopContainer, PebShopThemeVersionEntity, PebShopThemeVersionId } from '@pe/builder-core';
import { PebEditorApi, PEB_STORAGE_PATH } from '@pe/builder-api';

import { PebEditorStore, setSnapshotDefaultRoutes } from '../../../services/editor.store';
import { AbstractComponent } from '../../../misc/abstract.component';
import { OverlayData, OVERLAY_DATA } from '../../overlay.data';

@Component({
  selector: 'peb-editor-publish-dialog',
  templateUrl: 'publish.dialog.html', // TODO: add skeleton
  styleUrls: ['./publish.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebEditorPublishDialogComponent extends AbstractComponent implements OnInit {
  @ViewChild('logoFileInput') logoFileInput: ElementRef;
  @ViewChild('logo') logoEl: ElementRef;
  @ViewChild('logoWrapper') logoWrapperEl: ElementRef;

  shopName: string;
  shopPicture: string;
  versionName: string;

  isVersionCreating: boolean;
  isLargeThenParent = false;
  isLoading = false;
  uploadProgress = 0;

  readonly versions$ = new BehaviorSubject<PebShopThemeVersionEntity[]>([]);
  // private readonly publishedVersionIdSubject$ = new BehaviorSubject<PebShopThemeVersionId>(null);
  // get publishedVersionId$(): Observable<PebShopThemeVersionId> {
  //   return this.publishedVersionIdSubject$.asObservable().pipe(share());
  // }

  private readonly activatedVersionIdSubject$ = new BehaviorSubject<PebShopThemeVersionId>(null);
  get activatedVersionId$(): Observable<PebShopThemeVersionId> {
    return this.activatedVersionIdSubject$.asObservable().pipe(share());
  }

  private store: PebEditorStore;

  constructor(
    @Inject(OVERLAY_DATA) public data: OverlayData,
    @Inject(PEB_STORAGE_PATH) private storagePath: string,
    private api: PebEditorApi,
    private cdr: ChangeDetectorRef,
  ) {
    super();
    this.store = data.data;
  }

  ngOnInit() {
    this.store.theme$.pipe(
      tap(theme => {
        this.shopName = theme.name;
        if (theme.picture) {
          this.shopPicture = `${this.storagePath}${theme.picture}`;
        }
      }),
      takeUntil(this.destroyed$),
    ).subscribe();

    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.getShopThemeVersions(theme.id)),
      tap(versions => this.versions$.next(versions)),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onCreateVersion(name: string) {
    if (this.isVersionCreating) {
      return;
    }

    this.isVersionCreating = true;

    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.createShopThemeVersion(theme.id, name)),
      tap((version: PebShopThemeVersionEntity) => {
        this.versionName = '';
        this.isVersionCreating = false;
        this.versions$.next([version, ...this.versions$.value]);
      }),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onSelectVersion(id: PebShopThemeVersionId) {
    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.activateShopThemeVersion(theme.id, id)),
      switchMap((theme) => this.store.openTheme(theme, null)),

      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onPublishVersion(id: PebShopThemeVersionId) {
    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.publishShopThemeVersion(theme.id, id)),
      tap(version => this.versions$.next(this.versions$.value.map(v => {
        v.published = v.id === version.id;
        return v;
      }))),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onDeleteVersion(id: PebShopThemeVersionId) {
    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.deleteShopThemeVersion(theme.id, id)),
      tap(() => this.versions$.next(this.versions$.value.filter(v => v.id !== id))),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onChangeShopName(name: string) {
    this.store.theme$.pipe(
      take(1),
      switchMap(theme => this.api.updateShop({ id: theme.id, name })),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onLogoUpload($event: Event) {
    const files = ($event.target as HTMLInputElement).files;
    if (files.length > 0) {
      this.isLoading = true;
      this.isLargeThenParent = false;
      const file = files[0];
      this.logoFileInput.nativeElement.value = '';

      this.api.uploadImageWithProgress(PebShopContainer.Builder, file, true).pipe(
        tap((event) => {
          switch (event.type) {
            case HttpEventType.UploadProgress: {
              this.uploadProgress = event.loaded;
              this.cdr.detectChanges();
              break;
            }
            case HttpEventType.Response: {
              this.shopPicture = `${this.storagePath}${event.body.blobName}`;
              this.isLoading = false;
              this.uploadProgress = 0;
              this.cdr.detectChanges();
              this.store.updateThemePreview(event.body.blobName).subscribe();
              break;
            }
            default: break;
          }
        }),
        takeUntil(this.destroyed$),
      ).subscribe();
    }
  }

  onLogoLoad() {
    const logo: HTMLImageElement = this.logoEl.nativeElement;
    const logoWrapper: HTMLImageElement = this.logoWrapperEl.nativeElement;
    this.isLargeThenParent = logo.width >= logoWrapper.clientWidth || logo.height >= logoWrapper.clientHeight;
  }
}
