import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { pairwise, startWith, takeUntil, tap } from 'rxjs/operators';

import { PebPageVariant } from '@pe/builder-core';

import { AbstractComponent } from '../../../../misc/abstract.component';

@Component({
  selector: 'editor-menu-routes-form',
  templateUrl: './menu-routes.form.html',
  styleUrls: ['./menu-routes.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorMenuRoutesForm extends AbstractComponent implements AfterViewInit, OnDestroy {
  @Input() formGroup: FormGroup;
  @Input() options: any;

  @Output() blurred = new EventEmitter<void>();

  ngAfterViewInit() {
    this.routes.controls.forEach((control, index) => {
      control.valueChanges.pipe(
        startWith(this.routes.controls[index].value),
        pairwise(),
        tap(([prev, next]) => {
          if ((!prev?.variant && prev?.variant !== '') || prev.variant !== next.variant) {
            control.patchValue({
              ...next,
              value: '',
            }, { emitEvent: false })
          }

          if (next.variant !== '') {
            control.patchValue({
              ...next,
              newTab: null,
            }, { emitEvent: false })
          }
        }),
        takeUntil(this.destroyed$),
      ).subscribe()
    })
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.blur();
  }

  get controls() {
    return this.formGroup.controls;
  }

  get routes() {
    return this.controls.routes as FormArray;
  }

  blur() {
    if (!this.formGroup.dirty) {
      return;
    }

    this.blurred.emit();
    this.formGroup.markAsPristine();
  }

  addField(index: number) {
    const fg = new FormGroup({
      title: new FormControl('Page'),
      variant: new FormControl(PebPageVariant.Default),
      value: new FormControl(null),
      newTab: new FormControl(null),
    });

    typeof index === 'number' ? this.routes.insert(index + 1, fg) : this.routes.push(fg);

    this.formGroup.markAsDirty();
  }

  removeField(index: number) {
    this.routes.removeAt(index);

    this.formGroup.markAsDirty();
  }

}
