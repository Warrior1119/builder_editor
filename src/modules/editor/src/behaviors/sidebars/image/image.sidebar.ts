import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { catchError, finalize, map, takeUntil, tap } from 'rxjs/operators';
import { BehaviorSubject, EMPTY, merge } from 'rxjs';

import {
  PebElementDef,
  PebElementStyles,
  PebElementType, PebShopContainer,
} from '@pe/builder-core';
import { MediaService, PebEditorApi } from '@pe/builder-api';

import { AbstractComponent } from '../../../misc/abstract.component';
import { StyleForm } from './image-form.interface';
import { hexToRgba } from '../../../utils';
import { predefinedStyles } from './image.constants';
import { PebEditorElement } from '../../../renderer/editor-element';
import { PebEditorSnackbarComponent } from '../../../components/snackbar/snackbar.component';
import { PebEditorNumberInputComponent } from '../_deprecated-sidebars/shared/number-input/number-input.component';
import { SelectedMedia } from '../_deprecated-sidebars/shared/media-tab/media-tab.component';

enum ImageSubTab {
  Media = 'media',
  Details = 'details',
}

type ImageResponse = {
  progress: number;
  body: {blobName: string, brightnessGradation: string, thumbnail: string}
}

@Component({
  selector: 'peb-editor-image-sidebar',
  templateUrl: './image.sidebar.html',
  styleUrls: ['./image.sidebar.scss', '../_deprecated-sidebars/sidebars.scss'],
})
export class PebEditorImageSidebar extends AbstractComponent
  implements OnInit {
  ImageSubTab = ImageSubTab;

  @Input() element: PebElementDef;
  @Input() styles: PebElementStyles;
  @Input() imgSrc?: string;
  @Input() component: PebEditorElement;

  @Output() changeStyle = new EventEmitter<any>();
  @Output() changeStyleFinal = new EventEmitter<any>();

  @Output() changeData = new EventEmitter<any>();

  readonly PebElementType = PebElementType;

  form: FormGroup;
  imageSubTab = ImageSubTab.Media;
  predefinedStyles = predefinedStyles;
  uploadProgress = new BehaviorSubject<number>(0);
  isLoading: boolean;
  imageForm: FormGroup = this.formBuilder.group({
    src: '',
  });
  currentUploadName = '';

  isLoading$ = new BehaviorSubject<boolean>(false);

  get imageSource() {
    return this.imageForm.get('src')
  }
  private imageSource$ = this.imageSource.valueChanges;

  private activeElement: PebEditorNumberInputComponent = null;

  constructor(
    private formBuilder: FormBuilder,
    private apiService: PebEditorApi,
    private snackBar: MatSnackBar,
    private mediaService: MediaService,
    private cdr: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.element.type === PebElementType.Logo) {
      this.imageSubTab = ImageSubTab.Details;
    }
    this.form = this.initForm();
    this.imageForm.patchValue({
      src: this.imgSrc,
    });

    merge(
      this.imageSource$.pipe(
        tap(src => {
          const size = this.form.get('arrange').get('size');
          this.changeData.emit({ src });
        }),
      ),
      this.styleForm.valueChanges.pipe(
        map((formValue: StyleForm) => this.fromFormToStyles(formValue)),
        tap(styles => this.changeStyleFinal.emit(styles)),
      ),
    )
      .pipe(takeUntil(this.destroyed$))
      .subscribe();
  }

  onElementFocus(element: PebEditorNumberInputComponent) {
    this.activeElement = element;
  }
  onElementBlur(element: PebEditorNumberInputComponent) {
    this.activeElement = null;
  }

  get styleForm(): FormGroup {
    return this.form.get('style') as FormGroup;
  }

  get borderForm(): FormGroup {
    return this.styleForm.get('border') as FormGroup;
  }

  get shadowForm(): FormGroup {
    return this.styleForm.get('shadow') as FormGroup;
  }

  get arrangeForm(): FormGroup {
    return this.form.get('arrange') as FormGroup;
  }

  get fileName(): string {
    const url = this.imageSource.value;
    return url.substring(url.lastIndexOf('/') + 1);
  }

  onFileChange($event: Event): void {
    const target = $event.target as HTMLInputElement;
    const files: FileList = target.files;

    this.isLoading$.next(true);
    this.imageSource.patchValue('');
    this.currentUploadName = files.item(0).name;

    this.mediaService.uploadImageWithProgress(files.item(0), PebShopContainer.Builder).pipe(
      tap((data: ImageResponse) => {
        this.uploadProgress.next(data.progress)
        if (data.body) {
          const { blobName } = data.body
          this.imageSource.patchValue(blobName);
        }
      }),
      catchError(({ error }) => {
        this.openSnackbar(error.message, false);
        this.isLoading$.next(false);
        return EMPTY;
      }),
      finalize(() => this.isLoading$.next(false)),
      takeUntil(this.destroyed$),
    ).subscribe();

  }

  onSelect(imageUrls: SelectedMedia) {
    this.imageSource.patchValue(imageUrls.source);
  }

  flipVertical() {
    const scaleInput = this.form.get('arrange').get('scaleY');

    this.arrangeForm
      .get('scaleY')
      .patchValue(scaleInput.value === 1 ? -1 : 1);
  }

  flipHorizontal() {
    const scaleInput = this.form.get('arrange').get('scaleX');

    this.arrangeForm
      .get('scaleX')
      .patchValue(scaleInput.value === 1 ? -1 : 1);
  }

  private initForm(): FormGroup {
    return this.formBuilder.group({
      style: this.formBuilder.group({
        border: this.formBuilder.group({
          enabled: [!!this.styles.border],
          type: [this.styles.borderType || 'solid'],
          color: [this.styles.borderColor || '#000000'],
          size: [
            this.styles.borderSize || 1,
            [Validators.min(1), Validators.max(100)],
          ],
        }),
        shadow: this.formBuilder.group({
          enabled: [!!this.styles.filterShadow],
          blur: [this.styles.shadowBlur || 5],
          offset: [this.styles.shadowOffset || 10],
          opacity: [this.styles.shadowOpacity || 100],
          angle: [this.styles.shadowAngle ? this.styles.shadowAngle : 315],
          color: [this.styles.shadowFormColor || '#000000'],
        }),
        opacity: [
          this.styles.opacity !== undefined
            ? Math.round(+this.styles.opacity * 100)
            : 100,
        ],
      }),
      arrange: this.formBuilder.group({
        size: this.formBuilder.group({
          width: [this.styles.width || 0],
          height: [this.styles.height || 0],
        }),
        position: this.formBuilder.group({
          posX: [this.styles.left || 0],
          posY: [this.styles.top || 0],
        }),
        angle: [this.styles.rotate || 0],
        scaleX: [this.styles.scaleX || 1],
        scaleY: [this.styles.scaleY || 1],
      }),
    });
  }

  private fromFormToStyles(formValue: StyleForm): { [key: string]: string } {
    const res: any = {};

    if (formValue.border.enabled) {
      res.borderSize = formValue.border.size;
      res.borderType = formValue.border.type;
      res.borderColor = formValue.border.color;
      res.border = `${res.borderSize}px ${res.borderType} ${res.borderColor}`;
    } else {
      res.border = false;
    }
    if (formValue.shadow.enabled) {
      res.shadowBlur = formValue.shadow.blur;
      res.shadowFormColor = formValue.shadow.color;
      res.shadowColor = formValue.shadow.color
        ? hexToRgba(
            formValue.shadow.color,
            formValue.shadow.opacity,
          )
        : '#000000';
      res.shadowAngle = formValue.shadow.angle;
      res.shadowOpacity = formValue.shadow.opacity;
      res.shadowOffset = formValue.shadow.offset;
      const angle = res.shadowAngle * (Math.PI / 180);
      const x = Math.round(res.shadowOffset * Math.cos(angle));
      const y = Math.round(res.shadowOffset * -Math.sin(angle));

      res.filterShadow = `drop-shadow(${x}px ${y}px ${res.shadowBlur}px ${res.shadowColor}`;
    } else {
      res.filterShadow = false;
    }

    res.opacity =
    formValue.opacity || formValue.opacity === 0
      ? Number(formValue.opacity) / 100
      : 1;

    return res;
  }

  setElementSizeFromImage(src: string) {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const diff = width / height;
      width = width > 1024 ? 1024 : width;
      height = 1024 / diff;
      const size = this.form.get('arrange').get('size');
      size.get('width').patchValue(width);
      size.get('height').patchValue(height);
    };
    img.src = src;
  }

  private openSnackbar(text: string, success: boolean): MatSnackBarRef<any> {
    return this.snackBar.openFromComponent(PebEditorSnackbarComponent, {
      duration: 2000,
      verticalPosition: 'top',
      panelClass: 'mat-snackbar-shop-panel-class',
      data: {
        text,
        icon: success ? '#icon-snackbar-success' : '#icon-snackbar-error',
      },
    })
  }
}
