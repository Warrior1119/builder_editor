import { Injectable, Injector } from '@angular/core';
import { merge, Observable } from 'rxjs';
import { debounceTime, filter, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';

import { PebElementDef, PebElementType, pebCreateLogger } from '@pe/builder-core';

import { PebEditorElement } from '../../../../renderer/editor-element';
import { PebAbstractEditor } from '../../../../root/abstract-editor';
import { PebEditorState } from '../../../../services/editor.state';
import { PebEditorRenderer } from '../../../../renderer/editor-renderer';
import { PebEditorStore } from '../../../../services/editor.store';
import { elementOfTypeFocused } from '../../../_utils/filters';
import { PebEditorCartSideBarComponent } from './cart.sidebar';
import { AbstractEditElementWithSidebar } from '../../_sidebar.behavior';

const log = pebCreateLogger('editor:behaviors:edit-section');

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorEditCart extends AbstractEditElementWithSidebar {

  logger = { log };

  constructor(
    injector: Injector,
    public editor: PebAbstractEditor,
    public state: PebEditorState,
    public renderer: PebEditorRenderer,
    public store: PebEditorStore,
  ) {
    super(injector);
  }

  init(): Observable<any> {
    const cartFocused$ = elementOfTypeFocused(this.state, this.renderer.registry, [ PebElementType.Cart ]);

    return cartFocused$.pipe(
      filter(Boolean),
      switchMap((element: PebEditorElement) => {
        const sidebarCmpRef = this.editor.openSidebar(
          PebEditorCartSideBarComponent,
        );
        this.initBackgroundForm(element);
        sidebarCmpRef.instance.element = element.definition;
        sidebarCmpRef.instance.styles = element.styles;
        sidebarCmpRef.changeDetectorRef.detectChanges();
        sidebarCmpRef.instance.component = element;

        return merge(
          this.editFlow(element, sidebarCmpRef.instance),
          this.handleBackgroundForm(element, sidebarCmpRef),
        ).pipe(
          takeUntil(this.state.selectionChanged$()),
          finalize(() => {
            sidebarCmpRef.destroy();
          }),
        );
      }),
    );
  }

  editFlow(
    element: PebEditorElement,
    sidebar: PebEditorCartSideBarComponent,
  ): Observable<any> {
    return merge(
      sidebar.changeStyle.pipe(
        tap(styles => {
          element.styles = { ...element.styles, ...styles };
          sidebar.styles = element.styles;
        }),
        debounceTime(50),
        switchMap(() => {
          return this.store.updateStyles(this.state.screen, {
            [element.definition.id]: element.styles,
          });
        }),
      ),
      sidebar.changeData.pipe(
        switchMap(data => {
          const newElementDef: PebElementDef = {
            ...element.definition,
            data: {
              ...element.definition.data,
              ...data,
            },
          };

          element.definition.data = newElementDef.data;

          return this.store.updateElement(newElementDef);
        }),
      ),
    );
  }
}
