import {
  Input,
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';

import { MediaType } from '@pe/builder-core';

import { SelectedMedia } from '../_deprecated-sidebars/shared/media-tab/media-tab.component';
import { AbstractComponent } from '../../../misc/abstract.component';
import { PebEditorElement, VideoSubTab } from '../../../renderer/editor-element';

@Component({
  selector: 'peb-editor-video-sidebar',
  templateUrl: './video.sidebar.html',
  styleUrls: [
    './video.sidebar.scss',
    '../_deprecated-sidebars/sidebars.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebEditorVideoSidebarComponent extends AbstractComponent {

  MediaType = MediaType;
  VideoSubTab = VideoSubTab;

  @Input() component: PebEditorElement;

  constructor(private cdr: ChangeDetectorRef) {
    super();
  }
  setSourceURL(videoUrls: SelectedMedia) {
    this.component.video.form.get('source').patchValue(videoUrls.source);
    this.component.video.form.get('preview').patchValue(videoUrls.preview);
    this.cdr.detectChanges();
  }
}
