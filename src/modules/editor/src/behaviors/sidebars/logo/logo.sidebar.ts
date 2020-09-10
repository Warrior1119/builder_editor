import { ChangeDetectorRef, Component, Input } from '@angular/core';

import { PebElementStyles } from '@pe/builder-core';

import { PebEditorElement } from '../../../renderer/editor-element';

@Component({
  selector: 'peb-editor-logo-sidebar',
  templateUrl: 'logo.sidebar.html',
  styleUrls: ['./logo.sidebar.scss'],
})
export class PebEditorLogoSidebar {
  @Input() component: PebEditorElement;

  presets: PebElementStyles[] = [
    {
      boxShadow: null,
    },
    {
      boxShadow: '0 0 10px 0 #000000',
    },
    null,
    null,
    null,
    null,
  ]

  constructor(
    public cdr: ChangeDetectorRef,
  ) {}
}
