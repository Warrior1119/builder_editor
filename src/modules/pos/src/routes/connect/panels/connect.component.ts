import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {filter, takeUntil, tap, map, take, flatMap} from 'rxjs/operators';
import {Observable, BehaviorSubject, timer} from 'rxjs';

import {PebPosApi} from '@pe/builder-api';
import {PebEnvService} from '@pe/builder-core';
import { IntegrationInfoInterface } from '@pe/builder-api/pos/interfaces';

import {AbstractComponent} from '../../../misc/abstract.component';
import {IntegrationCategory} from '../enums/integration-category.enum';
import {MicroLoaderService} from '../services/micro.service';

@Component({
  selector: 'pos-panel-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelConnectComponent extends AbstractComponent {
  @Input() onlyContent = false;

  categories = IntegrationCategory;
  $enabledIntegrations: BehaviorSubject<string[]> = new BehaviorSubject([]);
  connectsReady = false;

  connects$ = this.getCategoryInstalledIntegrationsInfo([
    IntegrationCategory.Communications,
  ]).pipe(
    filter(d => !!d),
    takeUntil(this.destroyed$),
    tap(() => (this.connectsReady = true)),
  );

  constructor(
    private apiService: PebPosApi,
    private envService: PebEnvService,
    private microService: MicroLoaderService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
  ) {
    super();
    this.initCurrentTerminal();
  }

  initCurrentTerminal(): void {
    this.apiService
      .getTerminalEnabledIntegrations(
        this.envService.businessId,
        this.envService.terminalId,
      )
      .pipe(
        takeUntil(this.destroyed$),
        filter(d => !!d),
      )
      .subscribe(enabledList => {
        this.$enabledIntegrations.next(enabledList);
      });
  }

  getCategoryInstalledIntegrationsInfo(
    category: IntegrationCategory | IntegrationCategory[],
  ): Observable<IntegrationInfoInterface[]> {
    const categories = category instanceof Array ? category : [category];
    return this.apiService.getIntegrationsInfo(this.envService.businessId).pipe(
      map(data => {
        if (data) {
          data = data.filter(
            item =>
              item.installed &&
              categories.indexOf(item.integration.category) >= 0,
          );
        }
        return data;
      }),
    );
  }

  onToggleIntegration(integration: IntegrationInfoInterface) {
    this.$enabledIntegrations
      .pipe(
        takeUntil(this.destroyed$),
        filter(d => !!d),
        take(1),
      )
      .subscribe(names => {
        this.toggleTerminalIntegration(
          this.envService.terminalId,
          integration.integration.name,
          names.indexOf(integration.integration.name) < 0,
        ).subscribe(x => this.initCurrentTerminal());
      });
  }

  toggleTerminalIntegration(
    terminalId: string,
    integrationName: string,
    enable: boolean,
  ): Observable<void> {
    const businessUuid = this.envService.businessId;
    return this.apiService.toggleTerminalIntegration(
      businessUuid,
      terminalId,
      integrationName,
      enable,
    );
  }

  clickedIntegrationOpenButton(integration: IntegrationInfoInterface): void {
    this.preloadConnectMicro().subscribe(() => {
      if (integration.integration.name === 'qr') {
        this.router.navigate([`integration/${integration.integration.name}`], {
          relativeTo: this.activatedRoute,
        });
      } else {
        this.router.navigate([
          `business/${this.envService.businessId}/pos/${this.envService.terminalId}/connect`,
          {
            action: 'edit',
            integrationCategory: integration.integration.category,
            integrationName: integration.integration.name,
            terminalId: this.envService.terminalId,
          },
        ]);
      }
    });
  }

  clickedIntegrationAddButton(category: IntegrationCategory): void {
    this.preloadConnectMicro().subscribe(() => {
      this.router.navigate([
        `business/${this.envService.businessId}/pos/${this.envService.terminalId}/connect`,
        {
          action: 'add',
          integrationCategory: category,
          terminalId: this.envService.terminalId,
        },
      ]);
    });
  }

  private preloadConnectMicro(): Observable<boolean> {
    return this.microService.loadBuild('connect').pipe(
      flatMap(() => timer(500)),
      map(() => true),
    );
  }
}
