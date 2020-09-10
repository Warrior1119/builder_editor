import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

import { PebEnvService } from '@pe/builder-core';
import { PebPosApi } from '@pe/builder-api';
import { ThirdPartyFormServiceInterface } from '@pe/forms';
import { TranslateService } from '@pe/i18n';

import { AbstractComponent } from '../../../../misc/abstract.component';
import { PosConnectService } from '../../services/pos-connect.service';
import { ThirdPartyInternalFormService } from './third-party-form.service';

@Component({
  selector: 'pos-qr-settings',
  templateUrl: './qr-settings.component.html',
  styleUrls: ['./qr-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QRIntegrationComponent extends AbstractComponent
  implements OnInit {
  business: any = null;
  thirdPartyService: ThirdPartyFormServiceInterface;

  constructor(
    private envService: PebEnvService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private apiService: PebPosApi,
    private httpClient: HttpClient,
    private translateService: TranslateService,
    public posConnectService: PosConnectService,
  ) {
    super();
  }

  ngOnInit(): void {
    console.log(this.envService.terminalId)
    this.business = this.envService.businessData;
    combineLatest([
      this.apiService.getConnectIntegrationInfo('qr'),
      this.apiService.getSingleTerminal(this.envService.terminalId),
    ])
      .pipe(
        tap(([integration, terminal]) => {
          this.posConnectService.integration$.next(integration);
          this.posConnectService.terminal$.next(terminal);
          this.changeDetectorRef.markForCheck();

          this.thirdPartyService = new ThirdPartyInternalFormService(
            this.httpClient,
            this.translateService,
            this.business._id,
            this.business.name,
            integration,
            terminal,
            this.posConnectService.checkoutWrapperCustomerViewLink,
          );
        }),
        takeUntil(this.destroyed$),
      )
      .subscribe();

  }

  handleClose(): void {
    this.router.navigate([`../..`], { relativeTo: this.activatedRoute });
  }
}
