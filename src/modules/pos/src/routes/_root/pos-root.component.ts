import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'peb-pos',
  templateUrl: './pos-root.component.html',
  styleUrls: ['./pos-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebPosComponent {}
