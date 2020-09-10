import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';

import { PebShopRoute, PebShopThemeSnapshotEntity, PEB_DEFAULT_FONT_FAMILY, PEB_DEFAULT_FONT_SIZE } from '@pe/builder-core';
import { PebEditorApi } from '@pe/builder-api';
import { PebInteractionType, PebLinkDatasetLink, PebPageType } from '@pe/builder-core';

import {
  borderVariables,
  colorPaletteVariables,
  fillNamesVariables,
  fontNamesVariables,
  fontStylesVariables,
  linkVariables,
  paragraphStylesVariables,
} from './default-variables';
import { SidebarBasic } from '../sidebar.basic';
import { PebEditorStore } from '../../../../services/editor.store';
import { PebEditorElement } from '../../../../renderer/editor-element';
import { PebTextEditorService } from '@pe/builder-text-editor';
import { PageSidebarDefaultOptions } from '../sidebar.utils';

@Component({
  selector: 'peb-text-maker-sidebar',
  templateUrl: './text-maker-sidebar.component.html',
  styleUrls: [
    './text-maker-sidebar.component.scss',
    '../sidebars.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebTextMakerSidebarComponent extends SidebarBasic implements OnInit {

  @Input()
  mode: 'global'|'local';

  @Input() component: PebEditorElement;

  @Output()
  settingsChange = new EventEmitter<any>();

  @Output()
  arrangeChange = new EventEmitter<any>();

  @Output()
  changeStyle = new EventEmitter<any>();

  PebInteractionType = PebInteractionType;

  arrangeForm: FormGroup = new FormGroup({
    size: new FormGroup({
        width: new FormControl(0),
        height: new FormControl(0),
      }),
      position: new FormGroup({
        posX: new FormControl(0),
        posY: new FormControl(0),
      }),
      angle: new FormControl(0),
      flipX: new FormControl(0),
      flipY: new FormControl(0),
  });

  settings: FormGroup = new FormGroup({
    afterParagraph: new FormControl(false),
    alignItems: new FormControl('flex-start'),
    beforeParagraph: new FormControl(false),
    border: new FormControl(false),
    borderColor: new FormControl('#000000'),
    borderWeight: new FormControl(1),
    borderName: new FormControl('solid'),
    fill: new FormControl(false),
    fillStyle: new FormControl('colorFill'),
    color: new FormControl('#000000'),
    fontFamily: new FormControl(PEB_DEFAULT_FONT_FAMILY),
    fontSize: new FormControl(PEB_DEFAULT_FONT_SIZE),
    fontStyle: new FormControl('Regular'),
    justifyContent: new FormControl('flex-start'),
    linkType: new FormControl(null),
    linkPath: new FormControl(''),
    paragraphStyle: new FormControl(''),
    shadow: new FormControl(false),
    shadowAngle: new FormControl(315),
    shadowBlur: new FormControl(2),
    shadowColor: new FormControl('#000000'),
    shadowOffset: new FormControl(2),
    shadowOpacity: new FormControl(100),
    spacing: new FormControl(false),
    justify: new FormControl('left'),
    bold: new FormControl(false),
    italic: new FormControl(false),
    strikeThrough: new FormControl(false),
    underline: new FormControl(false),
  });

  fontNames = fontNamesVariables;
  fontStyles = fontStylesVariables;
  colorPalette = colorPaletteVariables;
  fillNames = fillNamesVariables;
  paragraphStyles = paragraphStylesVariables;
  borderNames = borderVariables;
  linkNames = linkVariables;

  activeTabIndex$ = new BehaviorSubject<number>(0);

  constructor(
    private store: PebEditorStore,
    public api: PebEditorApi,
    public cdr: ChangeDetectorRef,
    private textEditorService: PebTextEditorService,
  ) {
    super(api)
  }

  readonly routes$: Observable<any> = this.store.snapshot$.pipe(
    filter(Boolean),
    map((snapshot: PebShopThemeSnapshotEntity) =>
      snapshot.shop.routing.reduce((acc, route: PebShopRoute) => {
        if (snapshot.pages[route?.pageId]?.type !== PebPageType.Master) {
          acc.push({
            title: snapshot.pages[route.pageId]?.name,
            path: route.routeId,
            route: route.url,
          });
        }
        return acc;
      }, []),
    ),
  );

  ngOnInit() {
    this.settingsChange.emit(this.settings);
    this.arrangeChange.emit(this.arrangeForm);

    const attrs = this.component.nativeElement.getElementsByClassName('content')[0].getElementsByTagName('a')[0]?.attributes;
    if (attrs) {
      this.settings.get('linkType').patchValue(attrs['peb-link-action']?.value);
      this.settings.get('linkPath').patchValue(attrs['peb-link-payload']?.value);
    }
    merge(
      this.settings.get('fontFamily').valueChanges,
      this.settings.get('fill').valueChanges.pipe(
        map(fill => {
          const color = fill ? this.component.background.form.get('bgColor').value || PageSidebarDefaultOptions.BgColor : null;
          this.component.background.form.get('bgColor').patchValue(color);
        }),
      ),
      this.settings.get('linkType').valueChanges.pipe(
        tap(() => this.settings.patchValue({ linkPath: ''}, { emitEvent: false })),
        tap((type: string) => {
          console.log('link added')
          if (type) {
            this.settings.get('underline').patchValue(true);
            const content = `<u><a ${PebLinkDatasetLink.type}="${type}" ${PebLinkDatasetLink.payload}=" " style="color: rgb(0, 0, 0); text-decoration: none;" href="#">${this.component.nativeElement.textContent}</a></u>`;
            this.component.setTextContent(content, this.component.target.constructor.name);
          } else {
            this.settings.get('underline').patchValue(false);
            this.component.setTextContent(this.component.nativeElement.textContent, this.component.target.constructor.name);
          }
          this.component.detectChanges();
        }),
      ),
      this.settings.get('linkPath').valueChanges.pipe(
        map(payload => ({ payload, type: this.settings.get('linkType').value })),
        tap((path: any) => {
          let content = `<a ${PebLinkDatasetLink.type}="${this.settings.value.linkType}" ${PebLinkDatasetLink.payload}="${path.payload}"  style="color: rgb(0, 0, 0); text-decoration: none;" href="#">${this.component.nativeElement.textContent}</a>`;
          if (this.settings.value.underline) {
            content = `<u>${content}</u>`
          }
          this.component.setTextContent(content, this.component.target.constructor.name);
        }),
      ),
      this.settings.get('underline').valueChanges.pipe(
        tap(() => {
          const underline = this.component.nativeElement.getElementsByClassName('content')[0].getElementsByTagName('u')[0];
          if (underline) {
            const link = underline.getElementsByTagName('a')[0];
            this.component.setTextContent(link ? link.outerHTML : this.component.nativeElement.textContent, this.component.target.constructor.name);
          } else {
            const link = this.component.nativeElement.getElementsByClassName('content')[0].getElementsByTagName('a')[0];
            this.component.setTextContent(link ? '<u>'+link.outerHTML+'</u>' : '<u>'+this.component.nativeElement.textContent+'</u>', this.component.target.constructor.name);
          }
          this.component.detectChanges();
        })
      )
    ).pipe(
      tap(changes => this.changeStyle.emit(changes)),
      takeUntil(this.destroyed$),
    ).subscribe()
  }

  changeControl(control, value) {
    this.settings.get(control).setValue(value);
  }

  setItalic() {
    this.settings.get('italic').setValue(!this.settings.get('italic').value);
  }

  setBold() {
    this.settings.get('bold').setValue(!this.settings.get('bold').value);
  }

  setUnderline() {
    this.settings.get('underline').setValue(!this.settings.get('underline').value);
  }

  setStrikeThrough() {
    this.settings.get('strikeThrough').setValue(!this.settings.get('strikeThrough').value);
  }

  setBackgroundColor(color: string) {
    this.component.background.form.get('bgColor').patchValue(color);
    this.settings.get('fill').patchValue(true);
    this.cdr.detectChanges();
  }
}
