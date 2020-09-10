import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ComponentFactoryResolver,
} from '@angular/core';
import {
  pluck,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import { MessageBus, PebEnvService } from '@pe/builder-core';
import { ShopPreviewDTO, PebPosApi } from '@pe/builder-api';
import { PosClientTerminalService } from '@pe/builder-pos-client';

import { AbstractComponent } from '../../misc/abstract.component';

@Component({
  selector: 'peb-terminal-dashboard',
  templateUrl: './terminal-dashboard.component.html',
  styleUrls: ['./terminal-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalDashboardComponent extends AbstractComponent
  implements OnInit {
  terminal: any;
  terminalId: string;
  editButtonLoading: boolean;

  terminalId$ = this.activatedRoute.parent.params.pipe(pluck('terminalId'));

  preview$: Observable<ShopPreviewDTO> = this.terminalId$.pipe(
    switchMap(terminalId => this.apiService.getTerminalPreview(terminalId)),
    shareReplay(1),
  );

  get locale(): string {
    return this.envService.businessData?.defaultLanguage ?? 'en';
  }

  get yourTerminalTitle(): string {
    if (this.locale === 'de') {
      return 'Ihr Terminal'
    } else if (this.locale === 'sv') {
      return 'Din terminal'
    }
    return 'Your Terminal'
  }

  constructor(
    private messageBus: MessageBus,
    private apiService: PebPosApi,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private envService: PebEnvService,
    private cfr: ComponentFactoryResolver,
    private terminalService: PosClientTerminalService,
  ) {
    super();
  }

  ngOnInit() {
    this.terminalId = this.envService.terminalId;
  }

  onEditClick(): void {
    this.editButtonLoading = true;
    this.cdr.markForCheck();
    this.messageBus.emit('terminal.edit', this.terminalId);
  }

  onOpenClick(): void {
    this.messageBus.emit('terminal.open', this.terminalService.terminal);
  }
}
