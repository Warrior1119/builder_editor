import { Inject, Injectable } from '@angular/core';
import { EMPTY, merge, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap, switchMap, take, tap } from 'rxjs/operators';

import {
  ContextService,
  PebElementDef,
  PebElementType,
  pebGenerateId,
  PebScreen,
  PEB_DEFAULT_FONT_SIZE,
} from '@pe/builder-core';

import { PebEditorBehaviourAbstract } from '../../editor.constants';
import { PebEditorState } from '../../services/editor.state';
import { PebEditorStore } from '../../services/editor.store';
import { PebEditorEvents, PEB_EDITOR_EVENTS } from '../../services/editor.behaviors';
import { PebAbstractEditor } from '../../root/abstract-editor';
import { ObjectCategory } from '../../toolbar/dialogs/objects/objects.dialog';
import { getNextParentElement } from '../_utils/shop';
import { PebEditorRenderer } from '../../renderer/editor-renderer';
import { movingTransformations } from '../transforming/element-transformations';
import { PebElementKit } from '../../services/interfaces';

const OBJECT_COLOR = '#d4d4d4';
const BG_COLOR = '#ffffff';

interface SetStyle {
  text?: string;
  width?: number;
  height?: number;
}

const CONTEXT_COMPANY_METHODS = {
  [PebElementType.Logo]: 'getLogo',
}
const CONTEXT_COMPANY_PARAMS = {
  [PebElementType.Logo]: [],
}
const CONTEXT_PRODUCTS_METHODS = {
  [PebElementType.Products]: 'getProducts',
  [PebElementType.ProductDetails]: 'getProductDetails',
  [PebElementType.ProductCatalog]: 'getProductsCatalog',
}
const CONTEXT_PRODUCTS_PARAMS = {
  [PebElementType.Products]: ['1'],
  [PebElementType.ProductDetails]: ['1'],
  [PebElementType.ProductCatalog]: ['1'],
}

@Injectable({ providedIn: 'any' })
export class PebEditorBehaviorAddElement implements PebEditorBehaviourAbstract {
  constructor(
    private editor: PebAbstractEditor,
    private state: PebEditorState,
    private renderer: PebEditorRenderer,
    private store: PebEditorStore,
    @Inject(PEB_EDITOR_EVENTS) private events: PebEditorEvents,
  ) {
  }

  init(): Observable<any> {
    return merge(
      this.addSimpleElement(),
      this.addMenuElement(),
      this.addCarouselElement(),
      this.addButton(),
      this.addProductTypes(),
      this.addText(),
      this.addProducts(),
      this.addLogo(),
    );
  }

  addSimpleElement() {
    return this.editor.toolbar.createElement.pipe(
      filter(
        elType => elType.type === PebElementType.Shape
          || elType.type === PebElementType.Line
          || elType.type === PebElementType.Script
          || elType.type === PebElementType.Html
          || elType.type === PebElementType.Video
          || elType.type === PebElementType.Image
          || elType.type === PebElementType.Cart,
      ),
      switchMap((element) => {
        const parentDef = this.editor.getNewElementParent();
        const parentCmp = this.renderer.registry.get(parentDef.id);

        const parentTransforms = parentCmp.potentialContainer && movingTransformations[parentDef.type](
          parentCmp.definition, parentCmp.styles,
        );

        const newElementKit = {
          ...this.createElement(
            element.type,
            element.variant,
            {
              ...element.style,
              backgroundColor: OBJECT_COLOR,
              // TODO: Remove after properly tracking margins
              margin: '0 0 0 0',
            },
            element.data,
          ),
          contextSchema: null,
        }

        return this.store.appendElement(parentDef.id, newElementKit, parentTransforms).pipe(
          switchMap(() => this.renderer.rendered),
          first(),
          tap(() => {
            this.state.selectedElements = [newElementKit.element.id];
          }),
        )
      }),
    );
  }

  // TODO: Adapt this
  /** @deprecated */
  addMenuElement() {
    return this.editor.toolbar.createElement.pipe(
      filter(elType => elType.type === PebElementType.Menu),
      mergeMap((element) =>
        getNextParentElement(
          this.state,
          this.renderer,
          this.editor,
        ).pipe(
          map(parentElement => ({ ...element, parentElement })),
        ),
      ),
      switchMap(({ parentElement, type, variant, style }) => {
        const parentNode = parentElement.nativeElement;
        const parentRect = parentNode.getBoundingClientRect();

        return this.store.appendElement(parentElement.definition.id, {
          ...this.createElement(type, variant, {
            ...style,
            width: this.state.screen === PebScreen.Desktop ? 400 : 40,
            height: 40,
            fontSize: 16,
            fontFamily: 'Roboto',
            backgroundColor: 'transparent',
          },
            {
              routes: [{
                title: 'Page',
              }],
            },
          ),
          contextSchema: null,
        });
      }),
    );
  }

  // TODO: Adapt this
  /** @deprecated */
  addCarouselElement() {
    return this.editor.toolbar.createElement.pipe(
      filter(elType => elType.type === PebElementType.Carousel),
      mergeMap((element) =>
        getNextParentElement(
          this.state,
          this.renderer,
          this.editor,
        ).pipe(
          map(parentElement => ({ ...element, parentElement }))),
      ),
      switchMap(({ parentElement, type, variant, style }) => {
        const parentNode = parentElement.nativeElement;
        const parentRect = parentNode.getBoundingClientRect();

        return this.store.appendElement(parentElement.definition.id, {
          ...this.createElement(type, variant, {
            ...style,
            width: 0.6 * parentRect.width / this.state.scale,
            height: 0.6 * parentRect.height / this.state.scale,
          },
            {
              images: [],
            },
          ),
          contextSchema: null,
        });
      }),
    );
  }

  addButton() {
    return this.editor.toolbar.createElement.pipe(
      filter(elType => elType.type === PebElementType.Button),
      switchMap((element) => {
        const parentDef = this.editor.getNewElementParent();
        const parentCmp = this.renderer.registry.get(parentDef.id);

        const parentTransforms = parentCmp.potentialContainer && movingTransformations[parentDef.type](
          parentCmp.definition, parentCmp.styles,
        );

        const newElementKit = {
          ...this.createElement(
            element.type,
            element.variant,
            {
              ...element.style,
              width: 80,
              height: 20,
              // padding: 10,
              backgroundColor: OBJECT_COLOR,
              // TODO: Remove after properly tracking margins
              margin: '0 0 0 0',
            },
            { text: 'Button text' },
          ),
          contextSchema: null,
        }

        return this.store.appendElement(parentDef.id, newElementKit, parentTransforms).pipe(
          switchMap(() => this.renderer.rendered),
          first(),
          tap(() => {
            this.state.selectedElements = [newElementKit.element.id]
          }),
        )
      }),
    );
  }

  addText() {
    return this.editor.toolbar.createElement.pipe(
      filter(elType => elType.type === PebElementType.Text),
      switchMap((element) => {
        const parentDef = this.editor.getNewElementParent();
        const parentCmp = this.renderer.registry.get(parentDef.id);

        const parentTransforms = parentCmp.potentialContainer && movingTransformations[parentDef.type](
          parentCmp.definition, parentCmp.styles,
        );

        const newElementKit = {
          ...this.createElement(
            element.type,
            element.variant,
            {
              ...element.style,
              width: 32,
              height: 18,
              fontSize: PEB_DEFAULT_FONT_SIZE,
              fontWeight: 'bold',
              // TODO: Remove after properly tracking margins
              margin: '0 0 0 0',
            },
            { text: 'Text' },
          ),
          contextSchema: null,
        }

        Object.values(newElementKit.styles).forEach((styles) => {
          delete (styles as any).backgroundColor;
        })

        return this.store.appendElement(parentDef.id, newElementKit, parentTransforms).pipe(
          switchMap(() => this.renderer.rendered),
          first(),
          tap(() => {
            this.state.selectedElements = [newElementKit.element.id]
          }),
        )
      }),
    );
  }

  addSection(newElement: ObjectCategory) {
    return of(newElement).pipe(
      switchMap(({ type, variant, style, setAfter }) => {
        const documentId = this.renderer.element.id;

        let selectedIds = this.state.selectedElements;
        if (!selectedIds.length) {
          // Get id of first children element
          const children = this.renderer.element.children;
          selectedIds = children && children.length ? [this.renderer.element.children[0].id] : [];
        }


        const setAfterWidget = this.renderer.registry.get(documentId);
        const parentNode = setAfterWidget.nativeElement;
        const parentRect = parentNode.getBoundingClientRect();
        const section = {
          element: {
            id: pebGenerateId('element'),
            type: PebElementType.Section,
            data: { name: 'Section' },
            meta: { deletable: true },
            children: [],
          },
          styles: {
            ...this.createStyles(PebElementType.Section, style),
            width: 0.6 * parentRect.width / this.state.scale,
            height: 0.6 * parentRect.height / this.state.scale,
          },
        };
        return this.store.setBeforeElement(
          documentId,
          {
            ...section,
            contextSchema: null,
          },
          setAfter ? null : selectedIds[0],
        );
      }),
    );
  }

  addProducts() {
    return this.editor.toolbar.createElement.pipe(
      filter(
        elType => elType.type === PebElementType.Products,
      ),
      mergeMap((element) =>
        getNextParentElement(
          this.state,
          this.renderer,
          this.editor,
        ).pipe(
          map(parentElement => ({ ...element, parentElement }))),
      ),
      switchMap(({ parentElement, type, variant, style, data }) => {

        if (!parentElement || !parentElement.definition) {
          return;
        }

        return this.store.appendElement(parentElement.definition.id, {
          ...this.createElement(
            type,
            variant,
            {
              ...style,
              productTemplateColumns: 1,
              productTemplateRows: 1,
            },
            data,
          ),
          // contextSchema: {},
          contextSchema:
            CONTEXT_PRODUCTS_METHODS[type]
              ? {
                service: ContextService.Products,
                method: CONTEXT_PRODUCTS_METHODS[type],
                params: CONTEXT_PRODUCTS_PARAMS[type],
              }
              : null,
        });
      }),
    );
  }

  addLogo() {
    return this.editor.toolbar.createElement.pipe(
      filter(
        elType => elType.type === PebElementType.Logo,
      ),
      switchMap((element) => {
        const parentDef = this.editor.getNewElementParent();
        const parentCmp = this.renderer.registry.get(parentDef.id);

        const parentTransforms = parentCmp.potentialContainer && movingTransformations[parentDef.type](
          parentCmp.definition, parentCmp.styles,
        );

        const shopContextSchema = this.store.snapshot.contextSchemas[this.store.snapshot.shop.contextId];
        const usedBy: string[] = shopContextSchema['#logo']?.usedBy ?? [];

        const nextElement = this.createElement(
          element.type,
          element.variant,
          {
            ...element.style,
            backgroundColor: OBJECT_COLOR,
            margin: '0 0 0 0',
          },
          element.data,
        );

        const newElementKit: PebElementKit = {
          ...nextElement,
          contextSchema: {
            service: ContextService.Company,
            method: CONTEXT_COMPANY_METHODS[PebElementType.Logo],
            params: CONTEXT_COMPANY_PARAMS[PebElementType.Logo],
            usedBy: [...usedBy, nextElement.element.id],
          },
          rootContextKey: '#logo',
        }


        return this.store.appendElement(parentDef.id, newElementKit, parentTransforms).pipe(
          switchMap(() => this.renderer.rendered),
          first(),
          tap(() => this.state.selectedElements = [newElementKit.element.id]),
        );
      }),
    );
  }

  addProductTypes() {
    return this.editor.toolbar.createElement.pipe(
      filter(
        elType => elType.type === PebElementType.ProductDetails
          || elType.type === PebElementType.ProductCatalog,
      ),
      mergeMap((element) =>
        getNextParentElement(
          this.state,
          this.renderer,
          this.editor,
        ).pipe(
          map(parentElement => ({ ...element, parentElement }))),
      ),
      switchMap(({ parentElement, type, variant, style, data }) => {
        if (!parentElement || !parentElement.definition) {
          return;
        }

        return this.store.appendElement(parentElement.definition.id, {
          ...this.createElement(
            type,
            variant,
            {
              ...style,
              width: 1024,
              height: 500,
            },
            data,
          ),
          contextSchema:
            CONTEXT_PRODUCTS_METHODS[type]
              ? {
                service: ContextService.Products,
                method: CONTEXT_PRODUCTS_METHODS[type],
                params: CONTEXT_PRODUCTS_PARAMS[type],
              }
              : null,
        });
      }),
    );
  }

  private createElement(type: PebElementType, objectType?: string, style?: SetStyle, data?: any) {
    return {
      element: {
        id: pebGenerateId(),
        type,
        data: {
          variant: objectType,
          ...data,
          text: data?.text || '',
        },
        children: [],
      },
      styles: this.createStyles(type, style),
    };
  }

  private createStyles(type: PebElementType, style?: SetStyle) {
    const screen = this.state.screen;

    if (type in initialElementStyles) {
      return {
        [PebScreen.Desktop]: { display: 'none' },
        [PebScreen.Tablet]: { display: 'none' },
        [PebScreen.Mobile]: { display: 'none' },
        [screen]: initialElementStyles[type],
      }
    }

    return {
      [PebScreen.Desktop]: { display: 'none' },
      [PebScreen.Tablet]: { display: 'none' },
      [PebScreen.Mobile]: { display: 'none' },
      [screen]: {
        backgroundColor: BG_COLOR,
        width: style?.width ?? 100,
        height: style?.height ?? 100,
        ...style,
      },
    };
  }
}

const initialElementStyles = {
  [PebElementType.Line]: (screen) => ({
    [PebScreen.Desktop]: { display: 'none' },
    [PebScreen.Tablet]: { display: 'none' },
    [PebScreen.Mobile]: { display: 'none' },
    [screen]: {
      backgroundColor: BG_COLOR,
      width: 100,
      height: 1,
    },
  }),
};
