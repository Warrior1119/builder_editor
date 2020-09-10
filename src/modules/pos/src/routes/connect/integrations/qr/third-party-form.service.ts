import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { InfoBoxSettingsInterface } from '@pe/forms';
import { TranslateService } from '@pe/i18n';

import * as Cookie from 'js-cookie';

import { TerminalInterface } from '../../interfaces';

export class ThirdPartyInternalFormService {
  constructor(
    private httpClient: HttpClient,
    private translateService: TranslateService,
    private businessId: string,
    private businessName: string,
    private integration: any,
    private terminal: TerminalInterface,
    private qrText: string,
  ) {}

  requestInitialForm(): Observable<{ form: InfoBoxSettingsInterface }> {
    let url = `${this.integration.extension.url}/app/${this.businessId}/generate`;
    let action = 'POST';

    return this.httpClient.post<{ form: InfoBoxSettingsInterface }>(url, {
      businessId: this.businessId,
      businessName: this.businessName,
      url: this.qrText,
      id: this.terminal._id,
      avatarUrl: '',
      // payeverLogo: true,
      // wording: this.translateService.translate('qr.imageTitle')
    },
    {
      headers: {
        'authorization': `Bearer ${Cookie.get('pe_auth_token')}`,
      }
    });
  }

  executeAction(
    action: string,
    data: {},
  ): Observable<{ form: InfoBoxSettingsInterface }> {
    return null;
  }

  getActionUrl(action: string): string {
    return null;
  }

  allowCustomActions(): boolean {
    return true;
  }

  prepareUrl(url: string): string {
    return url;
  }

  allowDownload(): boolean {
    return true;
  }
}
