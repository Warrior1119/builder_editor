import { BehaviorSubject } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

@Component({
  selector: 'editor-expandable-panel',
  templateUrl: './expandable-panel.component.html',
  styleUrls: ['./expandable-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebEditorExpandablePanelComponent {
  @Input() set opened(opened: boolean) {
    this.openedSubject$.next(opened);
  };

  readonly openedSubject$ = new BehaviorSubject<boolean>(true);

  toggle() {
    this.openedSubject$.next(
      !this.openedSubject$.value,
    )
  }
}
