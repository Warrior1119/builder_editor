import { Component, Input } from '@angular/core';

import { PebEditorElement } from '../../../renderer/editor-element';

@Component({
  selector: 'peb-editor-menu-sidebar',
  templateUrl: 'menu.sidebar.html',
  styleUrls: ['./menu.sidebar.scss'],
})
export class PebEditorMenuSidebar {
  @Input() component: PebEditorElement;
}
