import { Inject, Injectable } from '@angular/core';
import { interval, merge, Observable, of, timer } from 'rxjs';
import {
  debounceTime,
  delay,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  mapTo,
  repeat,
  scan,
  switchMap,
  switchMapTo,
  takeLast,
  takeUntil,
  tap,
} from 'rxjs/operators';

import { pebCreateLogger, PebElementType } from '@pe/builder-core';

import { PebEditorBehaviourAbstract } from '../../editor.constants';
import { PebAbstractEditor } from '../../root/abstract-editor';
import { PebEditorState } from '../../services/editor.state';
import { PebEditorRenderer } from '../../renderer/editor-renderer';
import { PebEditorStore } from '../../services/editor.store';
import { PebEditorEvents, PEB_EDITOR_EVENTS } from '../../services/editor.behaviors';
import { Axis, getAxisRectEnd, getAxisRectStart } from '../../renderer/editor-element';
import { filterAnd } from '../_utils/filters';
import { calculateGrid } from './calculate-grid';
import {
  axisSizeProps, fixPositionForOverflowingElement, getStartOffsetForAxis,
  isElementOverflowingContainer, setOffsetForAxis, setSizeForAxis,
} from './resizing-utils';

const { Horizontal, Vertical } = Axis;

const KeyMap = {
  ArrowUp: { delta: 2, axis: Vertical },
  ArrowDown: { delta: -2, axis: Vertical },
  ArrowLeft: { delta: -2, axis: Horizontal },
  ArrowRight: { delta: 2, axis: Horizontal },
};

const InputFieldMap = {
  Width: { delta: 0, axis: Horizontal },
};

const log = pebCreateLogger('editor:behaviors:resize-with-keyboard');

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorResizeByKeyboard implements PebEditorBehaviourAbstract {
  constructor(
    private editor: PebAbstractEditor,
    private state: PebEditorState,
    private renderer: PebEditorRenderer,
    private store: PebEditorStore,
    @Inject(PEB_EDITOR_EVENTS) private events: PebEditorEvents,
  ) {}


  init(): Observable<any> {
    return merge(
      this.resizeOnKeyboardClick(),
      this.resizeOnKeyboardHold(),
    );
  }

  resizeOnKeyboardClick() {
    const shortClick$ = this.events.window.keydown$.pipe(
      filter(downEvt => !downEvt.repeat),
      switchMap(downEvt => this.events.window.keyup$.pipe(
        filter(upEvt => upEvt.code === downEvt.code),
        takeUntil(timer(399)),
      )),
    );

    return this.state.selectedElements$.pipe(
      filter(selIds => selIds.length === 1),
      filter(selIds => {
        const component = this.renderer.getElementComponent(selIds[0]);
        if (!component) {
          // display: none
          return false;
        }

        return ![PebElementType.Document, PebElementType.Section].includes(component.definition.type);
      }),
      switchMapTo(shortClick$),
      filter(filterAnd(
        (evt) => (Object.keys(KeyMap).includes(evt.code) && evt.shiftKey)
          || this.isInputNumericValue(evt)),
      ),
      map((evt) => ({ ...this.resizeInitHandler(evt), count: 1 })),
      map(resize => this.resizeInProgressHandler(resize)),
      debounceTime(300),
      tap(() => this.resizeCompleteHandler()),
    );
  }

  resizeOnKeyboardHold() {
    let resizeInProgress = false;

    return this.state.selectedElements$.pipe(
      filter(selIds => selIds.length === 1),
      filter(selIds => {
        const component = this.renderer.getElementComponent(selIds[0]);
        if (!component) {
          // display: none
          return false;
        }

        return ![PebElementType.Document, PebElementType.Section].includes(component.definition.type);
      }),
      switchMapTo(this.events.window.keydown$),
      distinctUntilChanged((a, b) => resizeInProgress),
      filter(filterAnd(
        (evt) => Object.keys(KeyMap).includes(evt.code) && evt.shiftKey),
      ),
      switchMap((evt) => {
        resizeInProgress = true;

        const flow$ = of(this.resizeInitHandler(evt)).pipe(
          switchMap((resize) => merge(
            // of(resize),
            of(resize).pipe(
              delay(400),
              switchMapTo(interval(50).pipe(mapTo(resize))),
            ),
          )),
          scan((acc, config) => ({
            count: acc.count + 1,
            ...config,
          }), { count: 0 }),
          tap((resize) => {
            this.resizeInProgressHandler(resize)
          }),
          finalize(() => {
            resizeInProgress = false;
          //   this.resizeCompleteHandler()
          }),
          takeUntil(this.events.window.keyup$),
        );

        return merge(
          flow$.pipe(
            takeLast(1),
            tap(() => {
              this.resizeCompleteHandler();
            }),
          ),
        );
      }),
      repeat(),
    );
  }

  private resizeInitHandler = (evt) => {
    log('initiated');
    const config = KeyMap[evt.code] ?? InputFieldMap.Width;
    const elementCmp = this.renderer.getElementComponent(this.state.selectedElements[0]);

    return {
      ...config,
      minDs: elementCmp.getMinPossibleDimensions(config.axis),
      maxDs: elementCmp.getMaxPossibleDimensions(config.axis),
    };
  }

  private resizeInProgressHandler = (resize) => {
    log('progress');
    const elementCmp = this.renderer.getElementComponent(this.state.selectedElements[0]);
    const elementDs = elementCmp.getAbsoluteElementRect();
    const elementStyles = elementCmp.styles;

    const diff = resize.delta * Math.ceil(resize.count / 10);

    const spaceStart = getAxisRectStart(resize.axis, elementDs) - resize.maxDs.start;
    const spaceEnd = resize.maxDs.end - getAxisRectEnd(resize.axis, elementDs);

    let nextStart = getStartOffsetForAxis(resize.axis, elementStyles, elementDs);
    let nextSize = elementDs[axisSizeProps[resize.axis]];

    if (resize.delta > 0) {
      nextStart = getStartOffsetForAxis(resize.axis, elementStyles, elementDs) - Math.min(diff / 2, spaceStart);
      nextSize = elementDs[axisSizeProps[resize.axis]]
        + Math.min(diff / 2, spaceStart)
        + Math.min(diff / 2, spaceEnd);
    } else {
      if (elementDs[axisSizeProps[resize.axis]] > resize.minDs) {
        const subtract = nextSize - Math.max(nextSize - Math.abs(diff), 50);

        nextSize = nextSize - subtract;
        nextStart = nextStart + subtract / 2;
      }
    }
    // Fix position if necassery
    if (isElementOverflowingContainer(nextStart, nextSize, resize.maxDs.end)) {
      nextStart = fixPositionForOverflowingElement(nextStart, nextSize, resize.maxDs.end);
    }

    elementCmp.dimensions?.form.setValue({
      ...elementCmp.dimensions.form.value,
      [axisSizeProps[resize.axis]]: nextSize,
    }, { emitEvent: false, onlySelf: true });

    const nextStyles = {
      ...elementStyles,
      ...setSizeForAxis(resize.axis, nextSize, elementCmp.nativeElement, this.state.scale),
      ...setOffsetForAxis(resize.axis, elementStyles, nextStart),
    }

    elementCmp.styles = {
      ...nextStyles,
      ...(elementCmp.definition.type === PebElementType.Text ? { minWidth: nextStyles.width } : {}),
      ...(elementCmp.definition.type === PebElementType.Text ? { minHeight: nextStyles.height } : {}),
    };

    elementCmp.applyStyles();
  }

  private resizeCompleteHandler = () => {
    const elementCmp = this.renderer.getElementComponent(this.state.selectedElements[0]);

    elementCmp.dimensions?.update();

    const changes = calculateGrid(elementCmp.parent, elementCmp.parent.children);

    // FIXME: Follow general behavior flow
    return this.store.updateStyles(this.state.screen, changes).subscribe();
  }

  private isInputNumericValue(event: KeyboardEvent): boolean {
    const isNumber = /^[0-9]$/i.test(event.key)
    const isTargetValid: any = event;
    return isNumber && isTargetValid.target.valueAsNumber > 20;

  }

}
