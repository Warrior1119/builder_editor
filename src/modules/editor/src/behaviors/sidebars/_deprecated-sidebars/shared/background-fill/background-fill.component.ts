import {
  Component, EventEmitter,
  Input, OnInit, Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';

import { AbstractComponent } from '../../../../../misc/abstract.component';
import { FillType } from '../../sidebar.utils';
import { SelectOption } from '../select/select.component';
import { filter, takeUntil } from "rxjs/operators";

@Component({
  selector: 'peb-editor-background-fill',
  templateUrl: './background-fill.component.html',
  styleUrls: ['./background-fill.component.scss', '../../sidebars.scss'],
})
export class PebEditorBackgroundFillComponent extends AbstractComponent {
  @Input() label: string;
  @Input() backgroundControl: FormControl;
  @Input() fillTypeControl: FormControl;
  @Input() gradientStart: FormControl;
  @Input() gradientStop: FormControl;
  @Input() gradientAngle: FormControl;
  @Input() selectOptions: SelectOption[];
  @Output() changeBlur = new EventEmitter();

  readonly fillType = FillType;

  constructor() {
    super();
  }

  getFillType(): string {
    return this.fillTypeControl.value && this.fillTypeControl.value.name
      ? this.fillTypeControl.value.name
      : this.fillTypeControl.value;
  }
}
