import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { first, share, takeUntil, tap } from 'rxjs/operators';

import { MessageBus, PebEnvService } from '@pe/builder-core';
import { PebPosApi } from '@pe/builder-api';
import { PePlatformHeaderService } from '@pe/platform-header';

import { AbstractComponent } from '../../misc/abstract.component';

@Component({
  selector: 'peb-terminal-list',
  templateUrl: './terminal-list.component.html',
  styleUrls: ['./terminal-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalListComponent extends AbstractComponent implements OnInit {

  skeletonThemes = Array.from({ length: 3 });
  terminals: any;

  defaultTerminalSubject = new BehaviorSubject<any>(null);

  get locale(): string {
    return this.envService.businessData?.defaultLanguage ?? 'en';
  }

  get openTitle(): string {
    if (this.locale === 'de') {
      return 'Öffnen'
    } else if (this.locale === 'sv') {
      return 'Åpne'
    }
    return 'Open'
  }

  get setAsDefaultTitle(): string {
    if (this.locale === 'de') {
      return 'Als Standard'
    } else if (this.locale === 'sv') {
      return 'Inställningar'
    }
    return 'Set as Default'
  }

  get editTitle(): string {
    if (this.locale === 'de') {
      return 'Bearbeiten'
    } else if (this.locale === 'sv') {
      return 'Endre'
    }
    return 'Edit'
  }

  get deleteTitle(): string {
    if (this.locale === 'de') {
      return 'Löschen'
    } else if (this.locale === 'sv') {
      return 'Radera'
    }
    return 'Delete'
  }

  get addTerminalTitle(): string {
    if (this.locale === 'de') {
      return 'Terminal erstellen'
    } else if (this.locale === 'sv') {
      return 'Lägg till terminal'
    }
    return 'Add terminal'
  }

  get onlineTerminalsTitle(): string {
    if (this.locale === 'de') {
      return 'Online-Terminals'
    } else if (this.locale === 'sv') {
      return 'Online-terminaler'
    }
    return 'Online Terminals'
  }


  constructor(
    private messageBus: MessageBus,
    private cdr: ChangeDetectorRef,
    @Optional() private platformHeader: PePlatformHeaderService,
    private envService: PebEnvService,
    private posApi: PebPosApi,
  ) {
    super();
  }

  ngOnInit(): void {
    this.platformHeader?.setShortHeader({
      title: 'Terminal list',
    })

    this.initTerminalList();
  }

  initTerminalList() {
    this.posApi.getTerminalsList().pipe(
      tap(terminals => {
        this.terminals = terminals;
        this.defaultTerminalSubject.next(terminals.find((terminal) => terminal.active));
        if (!this.defaultTerminalSubject.value) {
          this.defaultTerminalSubject.next(terminals[0]);
        }
        this.envService.terminalId = this.defaultTerminalSubject?.value?._id;
        if (this.envService.terminalId) {
          this.envService.terminalId = terminals[0]._id;
        }
        this.cdr.markForCheck();
      }),
      first(),
      takeUntil(this.destroyed$),
    ).subscribe();
  }

  onOpen({ _id }) {
    this.messageBus.emit('terminal.open-dashboard', _id)
    this.platformHeader.setFullHeader()
  }

  onEdit(terminalId: string) {
    this.messageBus.emit('terminal.edit', terminalId);
  };

  onSetAsDefault(terminal: any) {
    this.posApi.markTerminalAsActive(terminal._id).pipe(
      first(),
      tap(() => this.defaultTerminalSubject.next(terminal)),
      tap(() => this.envService.terminalId = terminal._id),
      // tap(() => this.platformHeader?.setFullHeader()),
    ).subscribe();
  }

  onDelete(terminalId: string) {
    this.posApi.deleteTerminal(terminalId).pipe(
      first(),
      tap(() => this.initTerminalList()),
      tap(() => this.messageBus.emit('terminal.deleted', terminalId)),
    ).subscribe()
  }
}
