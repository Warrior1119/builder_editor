import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Optional,
  Output,
  ViewChild,
} from '@angular/core';
import { takeUntil, tap, switchMap, map } from 'rxjs/operators';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';

import { MessageBus, PebEnvService, PebShopContainer } from '@pe/builder-core';
import { PebEditorApi, PebPosApi } from '@pe/builder-api';
import { PePlatformHeaderService } from '@pe/platform-header';

import { AbstractComponent } from '../../misc/abstract.component';

@Component({
  selector: 'peb-terminal-create',
  templateUrl: './terminal-create.component.html',
  styleUrls: ['./terminal-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTerminalCreateComponent extends AbstractComponent implements OnInit {

  @ViewChild('fileInput') fileInput: ElementRef;
  @ViewChild('logo') logoEl: ElementRef;
  @ViewChild('logoWrapper') logoWrapperEl: ElementRef;

  @Input() showCreateButton = true;

  @Output() valid = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<string>();

  form = this.formBuilder.group({
    name: ['', [ Validators.required ]],
    logo: [''],
  });
  isLargeThenParent = false;
  isLoading = false;
  uploadProgress = 0;

  get terminalName(): string {
    return this.form.get('name').value;
  }

  get locale(): string {
    return this.envService.businessData?.defaultLanguage ?? 'en';
  }

  get createTitle(): string {
    if (this.locale === 'de') {
      return 'Erstellen'
    } else if (this.locale === 'sv') {
      return 'Skapa'
    }
    return 'Create'
  }

  get createTerminalTitle(): string {
    if (this.locale === 'de') {
      return 'Terminal erstellen'
    } else if (this.locale === 'sv') {
      return 'Skapa terminal'
    }
    return 'Create Terminal'
  }


  constructor(
    private api: PebPosApi,
    private editorApi: PebEditorApi,
    private cdr: ChangeDetectorRef,
    private envService: PebEnvService,
    private messageBus: MessageBus,
    private formBuilder: FormBuilder,
    @Optional() private platformHeader: PePlatformHeaderService,
  ) {
    super();
  }

  ngOnInit() {
    this.platformHeader?.setShortHeader({
      title: this.createTerminalTitle,
    });
    this.form.statusChanges.pipe(
      tap(() => this.valid.emit(this.form.valid)),
      takeUntil(this.destroyed$),
    ).subscribe();
    if (this.envService.businessData?.name) {
      this.form.get('name').patchValue(this.envService.businessData.name);
    }
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
        this.editorApi.uploadImageWithProgress(PebShopContainer.Images, file).subscribe((event) => {
          switch (event.type) {
            case HttpEventType.UploadProgress: {
              this.uploadProgress = event.loaded;
              this.cdr.detectChanges();
              break;
            }
            case HttpEventType.Response: {
              this.form.patchValue({ logo: event.body.blobName || reader.result as string });
              this.isLoading = false;
              this.uploadProgress = 0;
              this.cdr.detectChanges();
              break;
            }
            default: break;
          }
        });
      };
    }
  }

  onLoad() {
    const logo: HTMLImageElement = this.logoEl.nativeElement;
    const logoWrapper: HTMLImageElement = this.logoWrapperEl.nativeElement;
    this.isLargeThenParent = logo.width >= logoWrapper.clientWidth || logo.height >= logoWrapper.clientHeight;
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    this.form.disable();
    const body = this.form.value;
    if (body.logo === '') {
      delete body.logo;
    }
    this.api.createTerminal(body).pipe(
      tap((terminal: any) => this.envService.terminalId = terminal._id),
      switchMap(() => this.api.instantSetup()),
      tap(() => {
        this.messageBus.emit('terminal.created', this.envService.terminalId);
        this.created.emit(this.envService.terminalId);
        this.platformHeader?.setFullHeader();
      }),
      takeUntil(this.destroyed$),
    ).subscribe();
  }
}
