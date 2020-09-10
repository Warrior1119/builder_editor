import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { takeUntil } from 'rxjs/operators';

import { MediaService } from '@pe/builder-api';
import { PebMediaComponent } from '@pe/builder-media';

import { AbstractComponent } from '../../../../misc/abstract.component';
import { FillTypes, FillType, ImageSizes } from '../../_deprecated-sidebars/sidebar.utils';

@Component({
  selector: 'editor-background-form',
  templateUrl: './background.form.html',
  styleUrls: [
    '../../_deprecated-sidebars/sidebars.scss',
    './background.form.scss',
  ],
})
export class EditorBackgroundForm extends AbstractComponent {
  @Input() formGroup: FormGroup;

  @Output() blurred = new EventEmitter<void>();

  readonly FillType: typeof FillType = FillType;
  readonly FillTypes: typeof FillTypes = FillTypes;
  readonly ImageSizes: typeof ImageSizes = ImageSizes;

  SliderUnit = '%';
  bgImageLoading: boolean;

  constructor(
    public dialog: MatDialog,
    public mediaService?: MediaService
  ) {
    super();
  }

  changeBgInputHandler($event) {
    const files = $event.target.files as FileList;

    if (files.length > 0) {
      const file = files[ 0 ];
      this.formGroup.controls.file.patchValue(file);
    }
  }

  openMediaStudio() {
    this.dialog.open(PebMediaComponent, {
      position: {
        top: '0',
        left: '0',
      },
      height: '100vh',
      maxWidth: '100vw',
      width: '100vw',
      panelClass: 'products-dialog',
    }).afterClosed().pipe(takeUntil(this.destroyed$))
      .subscribe(data => {
        if (data && data !== '') {
          this.formGroup.get('bgImage').patchValue(data.thumbnail);
        }
      });
  }
}
