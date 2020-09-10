import { Injectable } from '@angular/core';
import { merge, Observable, of } from 'rxjs';
import { debounceTime, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';

import { pebCreateLogger, PebElementDef, PebElementType } from '@pe/builder-core';

import { PebEditorImageSidebar } from './image.sidebar';
import { PebEditorElement } from '../../../renderer/editor-element';
import { AbstractEditElementWithSidebar } from '../_sidebar.behavior';

const log = pebCreateLogger('editor:behaviors:edit-image');

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorEditImage extends AbstractEditElementWithSidebar {
  static elementTypes = [PebElementType.Image];

  static sidebarComponent = PebEditorImageSidebar;

  logger = { log };

  init(): Observable<any> {
    return this.singleElementOfTypeSelected$().pipe(
      switchMap((elCmp: PebEditorElement) => {
        this.initPositionForm(elCmp);
        this.initDimensionsForm(elCmp);
        this.initProportionsForm(elCmp);

        const sidebarRef = this.initSidebar(elCmp, {
          imgSrc: elCmp.definition?.data?.src || elCmp.context?.data?.src,
        });

        return merge(
          this.handlePositionForm(elCmp),
          this.handleDimensionsForm(elCmp),
          this.handleProportionsForm(elCmp),
          this.editFlow(elCmp, sidebarRef.instance),
        ).pipe(
          takeUntil(this.state.selectionChanged$()),
          finalize(() => sidebarRef.destroy()),
        );
      }),
    );
  }

  //
  //  Old code
  //
  editFlow(element: PebEditorElement, sidebar: PebEditorImageSidebar): Observable<any> {
    return merge(
      sidebar.changeStyle.pipe(
        tap(styles => {
          element.styles = { ...element.styles, ...styles };
          element.applyStyles();
        }),
      ),
      sidebar.changeStyleFinal.pipe(
        tap(styles => {
          element.styles = { ...element.styles, ...styles };
        }),
        debounceTime(500),
        switchMap(styles => {
          return this.store.updateStyles(this.state.screen, {
            [element.definition.id]: styles,
          });
        }),
      ),
      sidebar.changeData.pipe(
        switchMap((data) => {
          if (element.definition.type === PebElementType.Logo) {
            return of(data.src);
          } else {
            const newElementDef: PebElementDef = {
              ...element.definition,
              data: {
                ...element.definition.data,
                ...data,
              },
            };
            element.definition.data = newElementDef.data;
            // widget.cdr.detectChanges();
            //TODO: create more efficient way to detect changes in image element
            return this.store.updateElement(newElementDef).pipe(
              tap(() => element.detectChanges())
            );
          }
        }),
      ),
    );
  }
}
