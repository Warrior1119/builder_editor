import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  Optional,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { catchError, takeUntil, tap } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import { PebPosApi } from '@pe/builder-api';
import { PebEnvService } from '@pe/builder-core';
import { PePlatformHeaderService } from '@pe/platform-header';

import { AbstractComponent } from '../../../misc/abstract.component';
import { PEB_TERMINAL_HOST } from '../../../constants';

@Component({
  selector: 'peb-terminal-local-domain-settings',
  templateUrl: './terminal-local-domain-settings.component.html',
  styleUrls: ['./terminal-local-domain-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalLocalDomainSettingsComponent extends AbstractComponent
  implements OnInit {
  form: FormGroup;
  posDeploy = this.activatedRoute.parent.snapshot.data?.pos.accessConfig;
  loading: boolean;
  terminalHost: string;

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

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private apiService: PebPosApi,
    private envService: PebEnvService,
    @Optional() private platformHeader: PePlatformHeaderService,
    @Optional() @Inject(PEB_TERMINAL_HOST) private pebTerminalHost: string,
  ) {
    super();
    this.terminalHost = this.pebTerminalHost;
  }

  ngOnInit() {
    this.form = this.formBuilder.group({
      internalDomain: [
        this.posDeploy?.internalDomain,
        [Validators.required, domainValidator],
      ],
    });
    this.platformHeader?.setShortHeader({
      title: 'Local domain',
    });
  }

  onSubmit() {
    this.form.disable();
    this.loading = true;

    const body = { ...this.posDeploy, ...this.form.value };
    delete body.id;
    console.log(body);

    this.apiService
      .updateTerminalDeploy(
        this.activatedRoute.parent.snapshot.data.pos._id,
        body,
      )
      .pipe(
        tap(accessConfig => {
          this.activatedRoute.parent.snapshot.data = {
            ...this.activatedRoute.parent.snapshot.data,
            pos: {
              ...this.activatedRoute.parent.snapshot.data.pos,
              accessConfig,
            },
          };
          this.loading = false;
          this.router
            .navigate(['../'], { relativeTo: this.activatedRoute })
            .then(() => {
              this.platformHeader?.setFullHeader();
            });
        }),
        catchError(e => {
          this.form.enable();
          alert(e.error.message);
          this.loading = false;
          return EMPTY;
        }),
        takeUntil(this.destroyed$),
      )
      .subscribe();
  }
}

function domainValidator(
  control: AbstractControl,
): { [key: string]: boolean } | null {
  if (!/^[A-Za-z0-9\d_-]*$/.test(control.value)) {
    return { domain: true };
  }

  return null;
}
