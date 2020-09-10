/* tslint:disable:member-ordering */
import { ComponentRef, Inject, Injectable } from '@angular/core';
import { EMPTY, merge, Observable } from 'rxjs';
import { filter, map, repeat, skip, skipWhile, switchMap, take, takeLast, takeUntil, tap } from 'rxjs/operators';

import { pebCreateLogger, PebElementType } from '@pe/builder-core';

import { PebEditorBehaviourAbstract } from '../../editor.constants';
import { PebEditorState } from '../../services/editor.state';
import { PebEditorStore } from '../../services/editor.store';
import { PebEditorEvents, PEB_EDITOR_EVENTS } from '../../services/editor.behaviors';
import { PebAbstractEditor } from '../../root/abstract-editor';
import { PebEditorRenderer } from '../../renderer/editor-renderer';
import { PebEditorElement } from '../../renderer/editor-element';
import { calculateGrid } from './calculate-grid';
import { PebEditorElementEdgesControl } from '../../controls/element-edges/element-edges.control';
import { PebEditorElementAnchorsControl } from '../../controls/element-anchors/element-anchors.control';
import { PebEditorElementCoordsControl } from '../../controls/element-coords/element-coords.control';
import { movingTransformations } from './element-transformations';
import { filterNot, MouseKey, onlyMouseKeyFilter } from '../_utils/filters';
import { PebDOMRect } from '../../editor.typings';

interface MoveTick {
  state: {
    initialCoords: PebDOMRect,
    movingElement: PebEditorElement;
    nextParent: PebEditorElement;
    nextSiblings: PebEditorElement[];
    invalidPosition: boolean;
    movingBordersCmpRef: ComponentRef<PebEditorElementEdgesControl>
    movingAnchorsCmpRef: ComponentRef<PebEditorElementAnchorsControl>
    movingCoordsCtrlRef: ComponentRef<PebEditorElementCoordsControl>
  },
  startEvent: MouseEvent,
  moveEvent: MouseEvent,
}

const log = pebCreateLogger('editor:behaviors:move-with-mouse');

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorMoveWithMouse implements PebEditorBehaviourAbstract {
  constructor(
    private editor: PebAbstractEditor,
    private state: PebEditorState,
    private renderer: PebEditorRenderer,
    private store: PebEditorStore,
    @Inject(PEB_EDITOR_EVENTS) private events: PebEditorEvents,
  ) { }


  init(): Observable<any> {
    return this.events.renderer.mousedown$.pipe(
      filter(onlyMouseKeyFilter(MouseKey.Primary)),
      switchMap((startEvent) => {
        const state = {
          movingElement: this.renderer.getElementComponentAtEventPoint(startEvent),
        };

        const move$ = this.events.contentContainer.mousemove$.pipe(
          filter(() => state.movingElement.definition.type !== PebElementType.Section),
          skipWhile(moveEvent => {
            const movement = {
              dx: Math.ceil(moveEvent.pageX - startEvent.pageX),
              dy: Math.ceil(moveEvent.pageY - startEvent.pageY),
            };
            return Math.sqrt(Math.pow(movement.dx, 2) + Math.pow(movement.dy, 2)) < 4;
          }),
          map((moveEvent) => ({ state, startEvent, moveEvent })),
          takeUntil(merge(
            this.events.contentContainer.mouseup$,
            this.events.contentContainer.mouseleave$,
            this.events.contentContainer.mousedown$.pipe(
              filter(filterNot(onlyMouseKeyFilter(MouseKey.Primary))),
            ),
          )),
        );

        return merge(
          move$.pipe(
            take(1), // `first` doesn't allow empty sequence
            tap(this.moveInitHandler),
            tap(this.moveInProgressHandler),
          ),
          move$.pipe(
            skip(1),
            tap(this.moveInProgressHandler),
          ),
          move$.pipe(
            takeLast(1),
            switchMap(this.moveCompleteHandler),
          ),
        );
      }),
      repeat(),
    );
  }

  private moveInitHandler = (tick: MoveTick) => {
    const movingElementCmp = tick.state.movingElement;
    const movingElementNode = movingElementCmp.nativeElement;

    const movingBordersCmpRef = movingElementCmp.controls.edges;
    const movingAnchorsCmpRef = movingElementCmp.controls.anchors;

    PebEditorElementCoordsControl.construct(this.editor, movingElementCmp);

    movingElementNode.style.zIndex = '1000';
    movingBordersCmpRef.instance.nativeElement.style.zIndex = '1001';
    movingAnchorsCmpRef.instance.variant = 'hidden';
    movingAnchorsCmpRef.instance.detectChanges();

    tick.state.initialCoords = movingElementCmp.getAbsoluteElementRect();
    tick.state.movingElement = movingElementCmp;
    tick.state.movingBordersCmpRef = movingBordersCmpRef;
    tick.state.movingAnchorsCmpRef = movingAnchorsCmpRef;
  };

  private moveInProgressHandler = (tick: MoveTick) => {
    const { movingElement, initialCoords } = tick.state;
    const scale = this.state.scale;

    const movement = {
      dx: Math.ceil(tick.moveEvent.pageX - tick.startEvent.pageX),
      dy: Math.ceil(tick.moveEvent.pageY - tick.startEvent.pageY),
    };

    movingElement.position?.form.setValue({
      x: Math.round(initialCoords.left + movement.dx / scale),
      y: Math.round(initialCoords.top + movement.dy / scale),
    }, {
      onlySelf: true,
      emitEvent: false,
    })

    tick.state.nextParent = this.renderer.getBehindElementComponentAtEventPoint(tick.moveEvent);
    tick.state.nextSiblings = this.getPotentialSiblings(tick.state.nextParent, movingElement);
    tick.state.invalidPosition = !this.validatePosition(tick);

    const setTransformValue = (el: HTMLElement) => el.style.transform = `translate(${movement.dx}px, ${movement.dy}px)`;

    setTransformValue(movingElement.nativeElement);

    movingElement.controls.edges.instance.valid = !tick.state.invalidPosition;
    movingElement.controls.edges.instance.detectChanges();

    movingElement.controls.coords.instance.detectChanges();
  };

  private moveCompleteHandler = (tick: MoveTick): Observable<any> => {
    const { movingElement, invalidPosition, nextParent, nextSiblings } = tick.state;

    log('Completion');
    // log('ParentId: ', nextParent.definition.id);

    movingElement.controls.coords.hostView.destroy();
    movingElement.controls.coords = null;

    if (invalidPosition) {
      log('Invalid move');
      this.resetBehaviorStyles(tick);
      return EMPTY;
    }

    if (this.renderer.elementMatchesInsideContentContainer(movingElement, nextParent)) {
      this.fixElementPosition(tick);
    }

    //  Moving into new parent
    if (nextParent.definition.id !== movingElement.parent.definition.id) {
      const prevParent = movingElement.parent;
      const prevParentChildren = this.getPotentialSiblings(prevParent, movingElement);
      const prevElementsChanges = calculateGrid(prevParent, prevParentChildren);

      const nextParentId = nextParent.definition.id;
      const nextParentChildren = [movingElement, ...nextSiblings];
      const nextElementChanges = calculateGrid(nextParent, nextParentChildren);

      if (prevElementsChanges[nextParentId]) {
        Object.assign(nextElementChanges[nextParentId], prevElementsChanges[nextParentId]);
        delete prevElementsChanges[nextParentId];
      }

      const nextParentTransformation = nextParent.potentialContainer
        && movingTransformations[nextParent.definition.type](
          nextParent.definition, nextParent.styles,
        );

      return this.store.relocateElement(
        movingElement.definition.id,
        nextParent.definition.id,
        { ...prevElementsChanges, ...nextElementChanges },
        this.state.screen,
        nextParentTransformation,
      ).pipe(
        tap(() => {
          this.resetBehaviorStyles(tick);
          movingElement.dimensions?.update();
        }),
      );
    }

    // Moving inside previous parent
    const children = [movingElement, ...nextSiblings];
    const changes = calculateGrid(nextParent, children);

    return this.store.updateStyles(this.state.screen, changes).pipe(
      tap(() => {
        const newElementCmp = this.renderer.getElementComponent(movingElement.definition.id);
        tick.state.movingBordersCmpRef.instance.component = newElementCmp;
        tick.state.movingBordersCmpRef.instance.detectChanges();

        tick.state.movingAnchorsCmpRef.instance.component = newElementCmp;
        tick.state.movingAnchorsCmpRef.instance.detectChanges();
        this.resetBehaviorStyles(tick);
        movingElement.dimensions?.update();
      }),
    );
  };

  private getPotentialSiblings(parentCmp: PebEditorElement, elementCmp: PebEditorElement) {
    if (!parentCmp) {
      return null;
    }

    const allChildren = parentCmp.definition.children?.map(elDef => this.renderer.registry.get(elDef.id));

    return allChildren?.filter(siblingCmp => siblingCmp !== elementCmp) || [];
  }

  private resetBehaviorStyles(tick: MoveTick) {
    const element = tick.state.movingElement;

    tick.state.movingAnchorsCmpRef.instance.variant = 'default';
    tick.state.movingBordersCmpRef.instance.valid = true;

    element.nativeElement.style.zIndex = null;
    element.nativeElement.style.boxShadow = null;
    element.nativeElement.style.transform = null;

    tick.state.movingAnchorsCmpRef.instance.nativeElement.style.transform = null;
    tick.state.movingBordersCmpRef.instance.nativeElement.style.transform = null;
  }

  private validatePosition(tick: MoveTick): boolean {
    const { nextParent, nextSiblings, movingElement } = tick.state;

    if (!nextParent || !nextSiblings) {
      return null;
    }

    const intersectWithNextSiblings = nextSiblings.some(
      (sibling) => this.renderer.elementIntersect(movingElement, sibling),
    );

    const fullIncludedToNextParent = this.renderer.elementInclude(movingElement, nextParent);

    const elementInsideContentContainer = this.renderer.elementInsideContentContainer(movingElement, nextParent) || this.renderer.elementMatchesInsideContentContainer(movingElement, nextParent);

    return fullIncludedToNextParent && !intersectWithNextSiblings && elementInsideContentContainer;
  }

  private fixElementPosition(tick: MoveTick): void {
    const { movingElement } = tick.state;

    const movement = {
      dx: 0,
      dy: Math.ceil(tick.moveEvent.pageY - tick.startEvent.pageY),
    };

    const setTransformValue = (el: HTMLElement) => el.style.transform = `translate(${movement.dx}px, ${movement.dy}px)`;

    setTransformValue(movingElement.nativeElement);
  }

}
