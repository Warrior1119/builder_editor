import { ComponentRef, Inject, Injectable, Injector } from '@angular/core';
import { EMPTY, merge, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, pairwise, startWith, switchMap, tap } from 'rxjs/operators';
import { isEqual, merge as lodashMerge } from 'lodash';

import {
  pebCreateLogger,
  PebElementDef,
  PebElementStyles,
  PebElementType,
  PEB_DEFAULT_FONT_COLOR,
  PEB_DEFAULT_FONT_FAMILY,
  PEB_DEFAULT_FONT_SIZE,
} from '@pe/builder-core';

import { EDITOR_ENABLED_MAKERS, PebEditorBehaviourAbstract } from '../../../../editor.constants';
import { PebEditorElement } from '../../../../renderer/editor-element';
import { PebTextMakerSidebarComponent } from './text-maker-sidebar.component';
import { PebEditorElementAnchorsControl } from '../../../../controls/element-anchors/element-anchors.control';
import { PebEditorElementEdgesControl } from '../../../../controls/element-edges/element-edges.control';
import { replaceElementWithMarker } from '../../../_utils/makers';
import { AbstractEditElementWithSidebar, DimensionsFormValues } from '../../_sidebar.behavior';

import { diff } from 'deep-object-diff';

const log = pebCreateLogger('editor:behaviors:edit-text');

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorEditText extends AbstractEditElementWithSidebar implements PebEditorBehaviourAbstract  {

  static elementTypes = [PebElementType.Text];

  static sidebarComponent = PebTextMakerSidebarComponent;

  logger = { log };

  constructor(
    @Inject(EDITOR_ENABLED_MAKERS) private makers: any,
    injector: Injector,
  ) {
    super(injector);
  }

  behaviourState: {
    initialElement: { element: PebElementDef, styles: PebElementStyles },
    activeElement: PebEditorElement,
    sidebar: ComponentRef<PebTextMakerSidebarComponent>,
    controls: {
      anchors: ComponentRef<PebEditorElementAnchorsControl>;
      edges: ComponentRef<PebEditorElementEdgesControl>;
    },
    maker: ComponentRef<any>,
  } = {
    initialElement: null,
    activeElement: null,
    sidebar: null,
    controls: {
      anchors: null,
      edges: null,
    },
    maker: null,
  };

  init(): Observable<any> {
    return merge(
      this.openSidebar(),
      this.startTypingWithoutMaker(),
      this.doubleClick(),
      this.blurMaker$.pipe(
        tap(() => this.destroyMaker()),
      ),
    );

  }

  private openSidebar(): Observable<PebEditorElement> {
    return this.state.selectedElements$.pipe(
      map(elements => this.renderer.registry.get(elements[0])),
      filter(element => element?.definition.type === PebElementType.Text),
      map(el => {
        if (
          this.behaviourState.activeElement
          && this.behaviourState.activeElement.definition.id !== el.definition.id
        ) {
          this.destroyMaker();
        }

        this.initPositionForm(el);
        this.initBackgroundForm(el);
        this.initDimensionsForm(el);

        this.behaviourState.activeElement = el;
        this.behaviourState.initialElement = lodashMerge({}, {
          element: this.behaviourState.activeElement.definition,
          styles: this.behaviourState.activeElement.styles,
        });

        const sidebar = this.editor.openSidebar(
          PebTextMakerSidebarComponent,
        );
        sidebar.instance.mode = 'global';
        sidebar.instance.component = el;
        sidebar.changeDetectorRef.detectChanges();

        this.behaviourState.sidebar = sidebar;

        return { el, sidebar };
      }),
      switchMap(({ el, sidebar }) => merge(
        this.editTextContainerFlow(el, sidebar),
        this.handlePositionForm(el),
        this.handleBackgroundForm(el, sidebar),
        this.handleTextDimensionsForm(el),
      )),
    );
  }

  private handleTextDimensionsForm(elCmp: PebEditorElement): Observable<any> {
    const elDef = elCmp.definition;
    const dimensions = elCmp.dimensions;

    if (!dimensions) {
      return EMPTY;
    }

    return merge(
      dimensions.form.valueChanges.pipe(
        startWith(null as DimensionsFormValues),
        distinctUntilChanged(isEqual),
        pairwise(),
        tap(([prevValue, value]: DimensionsFormValues[]) => {
          if (dimensions.form.invalid) {
            this.logger.log('Dimensions: Change: Invalid');
            return;
          }

          this.logger.log('Dimensions: Change: Valid ', dimensions.form.value);
          elCmp.styles.minWidth = value.width;
          elCmp.styles.minHeight = value.height;

          elCmp.applyStyles();
        }),
      ),
      dimensions.submit.pipe(
        filter(() => dimensions.form.valid && !isEqual(dimensions.initialValue, dimensions.form.value)),
        switchMap(() => {
          this.logger.log('Dimensions: Submit ', dimensions.form.value);
          elCmp.dimensions.update();
          return this.store.updateStyles(this.state.screen, {
            [elDef.id]: {
              minWidth: dimensions.form.value.width,
              minHeight: dimensions.form.value.height,
            },
          })
        }),
      ),
    );
  }

  private startTypingWithoutMaker(): Observable<any> {
    const letterPressed = (e: KeyboardEvent) => !e.metaKey && !e.ctrlKey && /^[a-zA-Z1-9]$/.test(e.key);

    const inputFocused = () => ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase());

    return this.events.window.keydown$.pipe(
      map((event) => ({ event, element: this.renderer.registry.get(this.state.selectedElements[0]) })),
      filter(({ element, event }) => (
        !!this.behaviourState.activeElement
        && [PebElementType.Text].find(t => element?.definition.type === t)
        && letterPressed(event)
        && !this.renderer?.maker
        && !inputFocused()
      )),
      tap(({ event }) => this.behaviourState.activeElement.definition.data.text = event.key),
      tap(() => this.replaceActiveElementWithMarker()),
    );
  }

  private doubleClick(): Observable<PebEditorElement> {
    return this.events.contentContainer.dblclick$.pipe(
      map((evt: MouseEvent) => {
        return  this.renderer.getElementComponentAtEventPoint(evt);
      }),
      filter(e => !!e && e.definition.type === PebElementType.Text), tap(() => {
        window.getSelection().empty();
        this.replaceActiveElementWithMarker();
      }),
    );
  }

  private get blurMaker$(): Observable<any> {
    return this.state.selectedElements$.pipe(
      filter(elements =>
        this.renderer.maker
        && this.behaviourState.activeElement
        && elements[0] !== this.behaviourState.activeElement?.definition.id,
      ),
    );
  }

  private editTextContainerFlow(
    el: PebEditorElement,
    sidebar: ComponentRef<PebTextMakerSidebarComponent>,
  ): Observable<any> {
    sidebar.instance.settings.patchValue(
      {
        backgroundColor: el.styles.backgroundColor,
        fill: !!el.styles.backgroundColor,
        justify: el.styles.textAlign === 'justify' ? 'full' : el.styles.textAlign,
        fontSize: el.styles.fontSize || PEB_DEFAULT_FONT_SIZE,
        bold: el.styles.fontWeight === 'bold',
        italic: el.styles.fontStyle === 'italic',
        underline: el.styles.textDecoration === 'underline',
        color: el.styles.color || PEB_DEFAULT_FONT_COLOR,
        fontFamily: el.styles.fontFamily || PEB_DEFAULT_FONT_FAMILY,
      }, { emitEvent: false },
    );

    return merge(
      sidebar.instance.settings.get('fill').valueChanges.pipe(
        filter(v => !v),
        tap(() => {

          if (this.behaviourState.maker) {
            const textEditorContent = this.behaviourState.maker.instance.textEditorRef.iframeBody as HTMLElement;
            textEditorContent.style.backgroundColor = null;
          }

        }),
      ),
      sidebar.instance.settings.get('justify').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((textAlign: string) => {
          el.styles = {
            ...el.styles,
            textAlign: textAlign === 'full' ? 'justify' : textAlign,
          };
        }),
      ),
      sidebar.instance.settings.get('fontSize').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((fontSize: string) => {
          el.styles = {
            ...el.styles,
            fontSize,
          };
        }),
      ),
      sidebar.instance.settings.get('bold').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((bold: boolean) => {
          el.styles = {
            ...el.styles,
            fontWeight: bold ? 'bold' : 'normal',
          };
        }),
      ),
      sidebar.instance.settings.get('italic').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((italic: boolean) => {
          el.styles = {
            ...el.styles,
            fontStyle: italic ? 'italic' : 'normal',
          };
        }),
      ),
      sidebar.instance.settings.get('linkPath').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((linkType: boolean) => {}),
      ),
      sidebar.instance.settings.get('linkType').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((linkType: boolean) => {}),
      ),
      sidebar.instance.settings.get('underline').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((value: boolean) => {
          el.styles = {
            ...el.styles,
            textDecoration: this.setTextDecoration(value, el.styles.textDecoration, 'underline'),
          };
        }),
      ),
      sidebar.instance.settings.get('strikeThrough').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((value: boolean) => {
          el.styles = {
            ...el.styles,
            textDecoration: this.setTextDecoration(value, el.styles.textDecoration, 'line-through'),
          };
        }),
      ),
      sidebar.instance.settings.get('color').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((color: string) => {
          el.styles = {
            ...el.styles,
            color,
          };
        }),
      ),
      sidebar.instance.settings.get('fontFamily').valueChanges.pipe(
        filter(() => !this.behaviourState.maker),
        tap((fontFamily: string) => {
          el.styles = {
            ...el.styles,
            fontFamily,
          };
        }),
      ),
    ).pipe(
      filter(() => !this.behaviourState.maker),
      debounceTime(250),
      switchMap(() =>
        this.saveChanges(
          {
            ...this.behaviourState.activeElement.definition,
            styles: el.styles,
          },
        ),
      ),
    )
  }

  private setTextDecoration (addDecoration: boolean, currentTextDecoration : string | number, decorationName: string) {
    if(addDecoration) {
      return currentTextDecoration && currentTextDecoration !== 'none' ?
        `${currentTextDecoration} ${decorationName}`: decorationName;
    } else {
      return currentTextDecoration?.toString().replace(decorationName, '').trim() ?? 'none';
    }
  }

  private replaceActiveElementWithMarker() {
    this.behaviourState.activeElement.dimensions.form.disable({ emitEvent: false });

    this.behaviourState.sidebar.instance.mode = 'local';
    this.behaviourState.sidebar.instance.cdr.detectChanges();

    const maker = replaceElementWithMarker(
      this.behaviourState.activeElement,
      this.editor,
      this.renderer,
      this.makers,
      this.behaviourState.sidebar,
      this.state.scale,
    );

    this.behaviourState.maker = maker;
    this.state.makerActive = true;
  }

  // TODO: duplicated code
  private destroyMaker() {
    // TODO: Check
    if ((this.renderer.maker as any)?.instance?.element.id !== this.behaviourState.activeElement.definition.id) {
      return EMPTY;
    }

    const nextStyles = {
      ...this.behaviourState.activeElement.styles,
      ...((this.renderer.maker as any)?.instance && { ...(this.renderer.maker as any).instance.styles }),
    }

    const nextElement = {
      ...this.behaviourState.activeElement.definition,
      data: {
        ...this.behaviourState.activeElement.definition.data,
        text: (this.renderer.maker as any)?.instance?.textEditorRef.text
          || this.behaviourState.activeElement.definition.data.text,
      },
      styles: nextStyles,
    }

    this.behaviourState.activeElement = null

    if (this.renderer.maker) {
      this.renderer.cleanMaker();
      this.behaviourState.maker = null;
    }

    if (this.behaviourState.controls.anchors) {
      this.behaviourState.controls.anchors.destroy();
      this.behaviourState.controls.edges.destroy();
      this.behaviourState.controls = {
        anchors: null,
        edges: null,
      };
    }

    this.state.makerActive = false;


    const initialElement = this.behaviourState.initialElement;
    const elementDiff = diff(initialElement.element, nextElement);
    const stylesDiff = diff(initialElement.styles, nextStyles);

    if (!Object.keys(elementDiff).length && !Object.keys(stylesDiff).length) {
      return EMPTY;
    }

    return this.saveChanges(nextElement);
  }

  private saveChanges(nextElement: any): Observable<any> {
    return this.store.updateElementKit(this.state.screen, nextElement, {
      [nextElement.id]: nextElement.styles,
    });
  }

}
