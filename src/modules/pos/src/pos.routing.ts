import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PebTerminalCreateComponent } from './routes/create/terminal-create.component';
import { PebTerminalListComponent } from './routes/list/terminal-list.component';
import { PebTerminalSettingsComponent } from './routes/settings/terminal-settings.component';
import { PebPosComponent } from './routes/_root/pos-root.component';
import { PebTerminalLocalDomainSettingsComponent } from './routes/settings/local-domain/terminal-local-domain-settings.component';
import { PebTerminalGeneralSettingsComponent } from './routes/settings/general/terminal-general-settings.component';
import { PosResolver } from './resolvers/pos.resolver';
import { PebTerminalEditComponent } from './routes/edit/terminal-edit.component';
import { PebTerminalDashboardComponent } from './routes/dashboard/terminal-dashboard.component';
import { TerminalThemeGuard } from './guards/theme.guard';
import { PanelConnectComponent } from './routes/connect/panels/connect.component';
import { ConnectMicroAppComponent } from './routes/connect/connect-micro-app.component';
import { QRIntegrationComponent } from './routes/connect/integrations/qr/qr-settings.component';

const routes: Routes = [
  {
    path: '',
    component: PebPosComponent,
    children: [
      {
        path: 'list',
        component: PebTerminalListComponent,
      },
      {
        path: 'create',
        component: PebTerminalCreateComponent,
      },
      {
        path: ':terminalId',
        resolve: [PosResolver],
        children: [
          {
            path: 'edit',
            component: PebTerminalEditComponent,
          },
          {
            path: 'dashboard',
            component: PebTerminalDashboardComponent,
            canActivate: [TerminalThemeGuard],
            children: [
              {
                path: '',
                loadChildren: () =>
                  import('@pe/builder-pos-client').then(
                    m => m.PebPosClientModule,
                  ),
              },
            ],
          },
          {
            path: 'settings',
            component: PebTerminalSettingsComponent,
            resolve: [PosResolver],
            children: [
              {
                path: '',
                component: PebTerminalGeneralSettingsComponent,
              },
              {
                path: 'local-domain',
                component: PebTerminalLocalDomainSettingsComponent,
              },
            ],
          },
          {
            path: 'connect',
            component: ConnectMicroAppComponent,
          },
          {
            path: 'panel-communications',
            redirectTo: 'panel-connect',
            pathMatch: 'full',
          },
          {
            path: 'panel-connect',
            component: PanelConnectComponent,
          },
          {
            path: ':panel/integration/qr',
            component: QRIntegrationComponent,
          },
        ],
      },
    ],
  },
];

// HACK: fix --prod build
// https://github.com/angular/angular/issues/23609
export const RouterModuleForChild = RouterModule.forChild(routes);

// @dynamic
@NgModule({
  imports: [RouterModuleForChild],
  exports: [RouterModule],
  providers: [TerminalThemeGuard],
})
export class PebPosRouteModule {}
