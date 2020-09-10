import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Injector,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ComponentPortal, ComponentType, PortalInjector } from '@angular/cdk/portal';
import { Observable, Subject } from 'rxjs';
import { filter, first, map, tap } from 'rxjs/operators';

import { PebElementType, PebPageType, PebScreen } from '@pe/builder-core';

import { OVERLAY_POSITIONS } from '../utils';
import { PebEditorProductDialogComponent } from './dialogs/product/product.dialog';
import { PebEditorPublishDialogComponent } from './dialogs/publish/publish.dialog';
import { PebEditorCodeDialogComponent } from './dialogs/code/code.dialog';
import { PebEditorMediaDialogComponent } from './dialogs/media/media.dialog';
import { PebEditorScreenDialogComponent } from './dialogs/screen/screen.dialog';
import { PebEditorZoomDialogComponent } from './dialogs/zoom/zoom.dialog';
import { PebEditorViewDialogComponent } from './dialogs/view/view.dialog';
import { ObjectCategory, PebEditorObjectsDialogComponent } from './dialogs/objects/objects.dialog';
import { EditorSidebarTypes, PebEditorState } from '../services/editor.state';
import { PebEditorStore } from '../services/editor.store';
import { OverlayData, OverlayDataValue, OVERLAY_DATA } from './overlay.data';
import { PebEditorActionService } from '../services/editor-action.service';

enum ToolsDialogType {
  Media = 'media',
  Objects = 'objects',
  Product = 'product',
  Publish = 'publish',
  Screen = 'screen',
  Seo = 'seo',
  View = 'view',
  Zoom = 'zoom',
}

@Component({
  selector: 'peb-editor-toolbar',
  templateUrl: 'toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebEditorToolbarComponent {
  @Input() loading: boolean;

  @Output() createElement = new EventEmitter<ObjectCategory>();

  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();

  @Output() toggleSeoSidebar = new EventEmitter<boolean>();

  @Output() toggleThemeValidatorSidebar = new EventEmitter<boolean>();

  @Output() openPreview = new EventEmitter<void>();

  @ViewChild('seoButton', {static: false}) seoButton: ElementRef;

  scales = [33, 50, 75, 100, 150, 200, 300];
  screens = Object.values(PebScreen);

  readonly undoRedoState$ = this.actionService.undoRedoState$;

  ToolsDialogType = ToolsDialogType;
  private overlayRef: OverlayRef;

  constructor(
    private elementRef: ElementRef,
    public editorState: PebEditorState,
    private matDialog: MatDialog,
    private store: PebEditorStore,
    private actionService: PebEditorActionService,
    private injector: Injector,
    private overlay: Overlay,
  ) {
  }

  @HostBinding('class.skeleton')
  get hostSkeletonClass(): boolean {
    return this.loading;
  }

  get nativeElement() {
    return this.elementRef.nativeElement;
  }

  openView(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(
      PebEditorViewDialogComponent,
      element,
      this.editorState,
    );

    overlay.pipe(
      first(),
      filter(Boolean),
      tap((selectedView: EditorSidebarTypes) => {
        if (selectedView === EditorSidebarTypes.EditMasterPages) {
          this.editorState.pagesView = this.editorState.pagesView === PebPageType.Replica
            ? PebPageType.Master
            : PebPageType.Replica;
        }
        if (
          selectedView === EditorSidebarTypes.Navigator
          || selectedView === EditorSidebarTypes.Inspector
          || selectedView === EditorSidebarTypes.Layers
        ) {
          this.editorState.sidebarsActivity = {
            ...this.editorState.sidebarsActivity,
            [selectedView]: !this.editorState.sidebarsActivity[selectedView],
          };
        }
      }),
      tap(() => this.detachOverlay()),
    ).subscribe();
  }

  openMedia(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(
      PebEditorMediaDialogComponent,
      element,
      null,
      'dialog-media-panel',
    );
    this.createElementAfterClose(overlay);
  }

  openObjects(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(
      PebEditorObjectsDialogComponent,
      element,
      null,
      'dialog-objects-panel',
    );
    this.createElementAfterClose(overlay);
  }

  openProduct(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(
      PebEditorProductDialogComponent,
      element,
      null,
      'dialog-objects-panel',
    );
    this.createElementAfterClose(overlay);
    // this.editorComponent.appendProductElement();
    // const dialog = this.openOverlay(event, PebEditorProductDialogComponent);
  }

  openPublish(element: HTMLElement) {
    this.openOverlay(PebEditorPublishDialogComponent, element, this.store, 'dialog-publish-versions-panel');
  }

  openScreen(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(PebEditorScreenDialogComponent, element);
    overlay.pipe(
      first(),
      filter(screen => !!screen),
      tap((screen: PebScreen) => this.editorState.screen = screen),
      tap(() => this.detachOverlay()),
    ).subscribe();
  }

  openZoom(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(PebEditorZoomDialogComponent, element);
    overlay.pipe(
      first(),
      filter(scale => !!scale),
      tap(() => this.detachOverlay()),
    ).subscribe((scale: number) => this.editorState.scale = scale / 100);
  }

  openCodeDropdown(element: HTMLElement) {
    const overlay: Observable<OverlayDataValue> = this.openOverlay(PebEditorCodeDialogComponent, element, null, 'dialog-objects-panel');
    this.createElementAfterClose(overlay);
  }

  createTextElement(): void {
    this.createElement.emit({ type: PebElementType.Text, data: { text: '<span>Your text</span>' }, style: { width: '100%' }});
  }

  private openOverlay<T>(
    component: ComponentType<T>,
    element: HTMLElement,
    data?: any,
    panelClass?: string,
  ): Observable<OverlayDataValue> {
    if (this.hasOverlayAttached()) {
      return;
    }

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(element)
        .withFlexibleDimensions(false)
        .withViewportMargin(10)
        .withPositions(OVERLAY_POSITIONS),
      hasBackdrop: true,
      backdropClass: 'dialog-backdrop',
      panelClass: panelClass ? panelClass : 'dialog-publish-panel',
      disposeOnNavigation: true,
    });
    const emitter: Subject<ObjectCategory | PebScreen | number> = new Subject();
    const emitter$: Observable<ObjectCategory | PebScreen | number> = emitter.asObservable();
    const injector = this.createInjector({
      emitter,
      data,
    });
    const portal = new ComponentPortal(component, null, injector);
    this.overlayRef.attach(portal);
    this.overlayRef.backdropClick().pipe(tap(() => this.detachOverlay())).subscribe();
    return emitter$;
  }

  private createElementAfterClose(overlay: Observable<OverlayDataValue>): void {
    overlay.pipe(
      tap(() => this.detachOverlay()),
    ).subscribe((element: ObjectCategory) => {
      if (element.type) {
        this.createElement.emit(element);
      }
    });
  }

  private createInjector(injectData: OverlayData): PortalInjector {
    const injectionTokens = new WeakMap();
    injectionTokens.set(OVERLAY_DATA, injectData);
    return new PortalInjector(this.injector, injectionTokens);
  }

  private detachOverlay(): void {
    if (this.hasOverlayAttached()) {
      this.overlayRef.detach();
    }
  };

  private hasOverlayAttached(): boolean {
    return this.overlayRef && this.overlayRef.hasAttached();
  }
}
