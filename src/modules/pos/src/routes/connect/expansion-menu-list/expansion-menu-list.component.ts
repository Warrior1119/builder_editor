import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  Inject,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IntegrationInfoInterface } from '@pe/builder-api/pos/interfaces';

import { IntegrationCategory } from '../enums/integration-category.enum';
import { PEB_POS_TRANSLATION } from './../../../constants';

@Component({
  selector: 'pos-expansion-menu-list',
  templateUrl: './expansion-menu-list.component.html',
  styleUrls: ['./expansion-menu-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpansionMenuListComponent {
  @Input() category: IntegrationCategory;
  @Input() integrations: IntegrationInfoInterface[] = [];
  @Input() enabledIntegrations: string[] = null;
  @Input() isShowAddButton = true;
  @Input() isShowToggleButton = false;
  @Input() noPaddingLeft = false;
  @Input() sizeMd = false;

  @Output() clickedToggleButton = new EventEmitter<IntegrationInfoInterface>();
  @Output() clickedIntegrationButton = new EventEmitter<
    IntegrationInfoInterface
  >();
  @Output() clickedAddButton = new EventEmitter<IntegrationCategory>();

  openingIntegration$: BehaviorSubject<
    IntegrationInfoInterface
  > = new BehaviorSubject(null);

  toggleClick(integration: IntegrationInfoInterface) {
    this.clickedToggleButton.emit(integration);
  }

  onOpen(integration: IntegrationInfoInterface) {
    if (!this.openingIntegration$.getValue()) {
      this.openingIntegration$.next(integration);
      this.clickedIntegrationButton.emit(integration);
    }
  }

  constructor(@Inject(PEB_POS_TRANSLATION) public translationService: any) {}
}
