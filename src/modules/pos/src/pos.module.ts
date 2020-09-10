import { CommonModule } from '@angular/common';
import { Inject, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { PebViewerModule } from '@pe/builder-viewer';
import { PebPosClientModule } from '@pe/builder-pos-client';
import { FormCoreModule, PE_FORMS_ENV, ThirdPartyFormModule } from '@pe/forms';
import { I18nModule, PE_TRANSLATION_API_URL } from '@pe/i18n';

import { PebPosRouteModule } from './pos.routing';
import { PebPosSharedModule } from './pos.shared';
import { PebTerminalListComponent } from './routes/list/terminal-list.component';
import { PebTerminalSettingsComponent } from './routes/settings/terminal-settings.component';
import { PebPosAddImageComponent } from './misc/icons/add-image.icon';
import { PebPosControlDotsComponent } from './misc/icons/control-dots.icon';
import { PebPosPayeverLogoComponent } from './misc/icons/payever-logo.icon';
import { PebPosUUIDComponent } from './misc/icons/uuid.icon';
import { PebPosComponent } from './routes/_root/pos-root.component';
import { PebTerminalLocalDomainSettingsComponent } from './routes/settings/local-domain/terminal-local-domain-settings.component';
import { PebTerminalGeneralSettingsComponent } from './routes/settings/general/terminal-general-settings.component';
import { PosResolver } from './resolvers/pos.resolver';
import { PebTerminalEditComponent } from './routes/edit/terminal-edit.component';
import { PebTerminalDashboardComponent } from './routes/dashboard/terminal-dashboard.component';
import { PanelConnectComponent } from './routes/connect/panels/connect.component';
import { ConnectMicroAppComponent } from './routes/connect/connect-micro-app.component';
import { ExpansionMenuListComponent } from './routes/connect/expansion-menu-list/expansion-menu-list.component';
import { PosConnectService } from './routes/connect/services/pos-connect.service';
import { MicroLoaderService } from './routes/connect/services/micro.service';
import { QRIntegrationComponent } from './routes/connect/integrations/qr/qr-settings.component';

// HACK: fix --prod build
// https://github.com/angular/angular/issues/23609
export const PebViewerModuleForRoot = PebViewerModule.forRoot();

export const I18NModuleForRoot = I18nModule.forRoot();

const icons = [
  PebPosAddImageComponent,
  PebPosControlDotsComponent,
  PebPosPayeverLogoComponent,
  PebPosUUIDComponent,
];

@NgModule({
  imports: [
    PebPosRouteModule,
    PebPosSharedModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatSlideToggleModule,
    MatExpansionModule,
    PebViewerModuleForRoot,
    NgScrollbarModule,
    ClipboardModule,
    PebPosClientModule,
    ThirdPartyFormModule,
    FormCoreModule,
    I18NModuleForRoot,
  ],
  declarations: [
    ...icons,
    PebPosComponent,
    PebTerminalListComponent,
    PebTerminalEditComponent,
    PebTerminalSettingsComponent,
    PebTerminalGeneralSettingsComponent,
    PebTerminalLocalDomainSettingsComponent,
    PebTerminalDashboardComponent,
    PanelConnectComponent,
    QRIntegrationComponent,
    ConnectMicroAppComponent,
    ExpansionMenuListComponent,
    // ThirdPartyFormComponent,
  ],
  providers: [
    PosResolver,
    PosConnectService,
    MicroLoaderService,
  ],
})
export class PebPosModule {}
