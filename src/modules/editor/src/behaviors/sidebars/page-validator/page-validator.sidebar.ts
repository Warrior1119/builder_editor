import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { PebElementId } from '@pe/builder-core';

import { AbstractComponent } from '../../../misc/abstract.component';

@Component({
  selector: 'peb-editor-page-validator-sidebar',
  templateUrl: 'page-validator.sidebar.html',
  styleUrls: ['./page-validator.sidebar.scss'],
})
export class PebEditorPageValidatorSidebar extends AbstractComponent {
  exceptions: any[];
  completelyBrokenElements: PebElementId[] = null;

  @Output() elementSelect = new EventEmitter();

  constructor(private dialog: MatDialog) {
    super()
  }

  completelyBroken(id: PebElementId): boolean {
    return !!this.completelyBrokenElements.find(e => e === id);
  }

  moreInfo(event: MouseEvent, element) {
    event.preventDefault();

    this.dialog.open(PebEditorPageValidatorDialog, {
      width: '250px',
      data: { element },
    });
  }
}

@Component({
  selector: 'peb-editor-page-validator--dialog',
  template: `
    <div>{{ data?.element | json }}</div>
  `,
})
export class PebEditorPageValidatorDialog {

  constructor(
    public dialogRef: MatDialogRef<PebEditorPageValidatorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

  close(): void {
    this.dialogRef.close();
  }

}
