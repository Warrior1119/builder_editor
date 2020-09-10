import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  Inject,
  Optional,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

import { PebPosApi } from '@pe/builder-api';
import { PebEnvService } from '@pe/builder-core';

import { AbstractComponent } from '../../../misc/abstract.component';
import { PEB_TERMINAL_HOST } from '../../../constants';

@Component({
  selector: 'peb-terminal-general-settings',
  templateUrl: './terminal-general-settings.component.html',
  styleUrls: ['./terminal-general-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalGeneralSettingsComponent extends AbstractComponent
  implements OnDestroy {
  terminalHost: string;
  posDeploy = this.activatedRoute.parent.snapshot.data?.pos.accessConfig;
  isLoadingSubject$ = new Subject<boolean>();
  businessButtonText$ = new BehaviorSubject<string>(this.copyTitle);
  terminalButtonText$ = new BehaviorSubject<string>(this.copiedTitle);

  get locale(): string {
    return this.envService.businessData?.defaultLanguage ?? 'en';
  }

  get copyTitle(): string {
    if (this.locale === 'de') {
      return 'Kopieren'
    } else if (this.locale === 'sv') {
      return 'Kopiera'
    }
    return 'Copy'
  }

  get copiedTitle(): string {
    if (this.locale === 'de') {
      return 'Kopiert'
    } else if (this.locale === 'sv') {
      return 'Kopierade'
    }
    return 'Copied'
  }

  get domainTitle(): string {
    if (this.locale === 'de') {
      return 'Domain'
    } else if (this.locale === 'sv') {
      return 'Domän'
    }
    return 'Domain'
  }

  get businessUUIDTitle(): string {
    if (this.locale === 'de') {
      return 'Kopiert'
    } else if (this.locale === 'sv') {
      return 'Business UUID'
    }
    return 'Unternehmung-UUID'
  }

  get editTitle(): string {
    if (this.locale === 'de') {
      return 'Bearbeiten'
    } else if (this.locale === 'sv') {
      return 'Endre'
    }
    return 'Edit'
  }


  constructor(
    private activatedRoute: ActivatedRoute,
    @Inject(PEB_TERMINAL_HOST) private pebTerminalHost: string,
    private apiService: PebPosApi,
    public envService: PebEnvService,
  ) {
    super();
    this.terminalHost = this.pebTerminalHost;
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.businessButtonText$.complete();
    this.terminalButtonText$.complete();
  }

  onCopyTerminalId() {
    this.terminalButtonText$.next(this.copiedTitle);
    setTimeout(() => this.terminalButtonText$.next(this.copyTitle), 2000);
  }

  onCopyBusinessId() {
    this.businessButtonText$.next(this.copiedTitle);
    setTimeout(() => this.businessButtonText$.next(this.copyTitle), 2000);
  }
}
