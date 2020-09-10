import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ChangeDetectorRef,
  Optional,
  ViewChild,
  ElementRef,
  Inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { takeUntil, tap } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MessageBus, PebShopContainer, PebEnvService } from '@pe/builder-core';
import { PebEditorApi, PebPosApi, PEB_STORAGE_PATH } from '@pe/builder-api';
import { PePlatformHeaderService } from '@pe/platform-header';
import { Terminal } from '@pe/builder-api/pos/interfaces';

import { AbstractComponent } from '../../misc/abstract.component';

@Component({
  selector: 'peb-terminal-edit',
  templateUrl: './terminal-edit.component.html',
  styleUrls: ['./terminal-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalEditComponent extends AbstractComponent
  implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('logo') logoEl: ElementRef;
  @ViewChild('logoWrapper') logoWrapperEl: ElementRef;

  isLargeThenParent = false;
  isLoading = false;
  uploadProgress = 0;

  form: FormGroup;
  terminal: any;
  imagesPath = this.storagePath + '/images';

  get locale(): string {
    return this.envService.businessData?.defaultLanguage ?? 'en';
  }

  get saveTitle(): string {
    if (this.locale === 'de') {
      return 'Speichern'
    } else if (this.locale === 'sv') {
      return 'Rädda'
    }
    return 'Save'
  }

  constructor(
    private api: PebPosApi,
    private builderApi: PebEditorApi,
    private activatedRoute: ActivatedRoute,
    private messageBus: MessageBus,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private envService: PebEnvService,
    @Optional() private platformHeader: PePlatformHeaderService,
    @Inject(PEB_STORAGE_PATH) public storagePath: string,
  ) {
    super();
    this.form = this.formBuilder.group({
      name: ['', [Validators.required]],
      logo: [''],
    });
  }

  ngOnInit() {
    this.platformHeader?.setShortHeader({
      title: 'Edit terminal',
    });
    const terminalId = this.activatedRoute.parent.snapshot.params.terminalId;
    this.api
      .getSingleTerminal(terminalId)
      .pipe(
        tap((terminal: Terminal) => {
          this.terminal = terminal;
          this.form.controls.name.patchValue(terminal.name);
          this.form.controls.logo.patchValue(terminal.logo);
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroyed$),
      )
      .subscribe();
  }

  onLogoUpload($event: any) {
    const files = $event.target.files as FileList;
    if (files.length > 0) {
      this.isLoading = true;
      this.isLargeThenParent = false;
      const file = files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      this.fileInput.nativeElement.value = '';

      reader.onload = () => {
        console.log('Onload!');
        this.builderApi
          .uploadImageWithProgress(PebShopContainer.Images, file)
          .subscribe(event => {
            console.log('event type!', event);
            switch (event.type) {
              case HttpEventType.UploadProgress: {
                this.uploadProgress = event.loaded;
                this.cdr.detectChanges();
                break;
              }
              case HttpEventType.Response: {
                this.form.patchValue({
                  logo: event.body.blobName || (reader.result as string),
                });
                this.isLoading = false;
                this.uploadProgress = 0;
                this.cdr.detectChanges();
                break;
              }
              default:
                break;
            }
          });
      };
    }
  }

  onLoad() {
    const logo: HTMLImageElement = this.logoEl.nativeElement;
    const logoWrapper: HTMLImageElement = this.logoWrapperEl.nativeElement;
    this.isLargeThenParent =
      logo.width >= logoWrapper.clientWidth ||
      logo.height >= logoWrapper.clientHeight;
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    this.form.disable();
    this.api
      .updateTerminal({
        name: this.form.value.name,
        id: this.terminal._id,
        logo: this.form.value.logo ? this.form.value.logo : null,
      })
      .pipe(
        tap((terminal: any) => {
          this.messageBus.emit('terminal.edited', terminal._id);
          this.platformHeader?.setFullHeader();
        }),
        takeUntil(this.destroyed$),
      )
      .subscribe();
  }
}
