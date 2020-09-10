import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { round as _round } from 'lodash';

import { ElementIdAttribute, PebAbstractElement, PebRenderer, PebRendererOptions, RenderMaker } from '@pe/builder-renderer';
import { PebElementDef, PebElementId, PEB_DESKTOP_CONTENT_WIDTH } from '@pe/builder-core';

import { PebEditorElement } from './editor-element';
import { PebDOMRect } from '../editor.typings';

const round = (x) => _round(x, 2);

/**
 * This class is a wrapper on _renderer that serves two purposes:
 *  expand _renderer's elements with methods that are needed only in editor
 *  deny direct access to properties and methods of _renderer that shouldn't be accessible
 */
export class PebEditorRenderer {

  constructor(
    private _renderer: PebRenderer,
  ) { }

  /** @deprecated */
  get renderer() {
    console.warn('Renderer shouldn\'t be accessed directly');
    return this._renderer;
  }

  get registry() {
    const self = this;
    return {
      /** @deprecated: use renderer.getElementComponent() */
      get(elementId: PebElementId): PebEditorElement {
        return self.getElementComponent(elementId);
      },
    }
  }

  get options(): PebRendererOptions {
    return this._renderer.options;
  }

  get shadowRoot(): ShadowRoot {
    return this._renderer.shadowRoot
  }

  get rendered(): Observable<any> {
    return this._renderer.rendered.pipe(
      map(() => this.registry),
    );
  }

  get nativeElement(): HTMLElement {
    return this._renderer.nativeElement;
  }

  renderDocument() {
    this._renderer.renderDocument();
  }

  get maker(): RenderMaker {
    return this._renderer.maker;
  }

  setMaker(maker: RenderMaker): void {
    return this._renderer.setMaker(maker);
  }

  cleanMaker(): void {
    return this._renderer.cleanMaker();
  }

  get element(): PebElementDef {
    return this._renderer.element;
  }

  getElementComponent = (elementId: PebElementId) => {
    const element: PebAbstractElement = this._renderer.registry.get(elementId);

    if (!element) {
      return null;
    }

    return PebEditorElement.construct(this, element);
  }

  getElementComponentAtEventPoint = (evt: MouseEvent): PebEditorElement => {
    const elementNodesUnderClick = this.getElementNodesAtEventPoint(evt);
    const topNode = elementNodesUnderClick[0];

    if (!topNode) { return null; }

    const elementId = topNode.attributes[ElementIdAttribute].value;

    return this.getElementComponent(elementId);
  }

  getBehindElementComponentAtEventPoint = (evt: MouseEvent): PebEditorElement => {
    const elementNodesUnderClick = this.getElementNodesAtEventPoint(evt);
    const topNode = elementNodesUnderClick[1];

    if (!topNode) { return null; }

    const elementId = topNode.attributes[ElementIdAttribute].value;

    return this.getElementComponent(elementId);
  }

  getResizeAnchorTypeAndElementIdAtEventPoint = (evt: MouseEvent): Element => {
    const elementNodesUnderClick = this.getResizeAnchorsAtEventPoint(evt);
    const resizeAnchorNode = elementNodesUnderClick[0];

    if (!resizeAnchorNode) { return null; }
    return resizeAnchorNode;
  }

  queryElementAll(predicate: (el: PebAbstractElement) => boolean): PebEditorElement[] {
    return this._renderer.registry.queryAll(predicate).map(element => PebEditorElement.construct(this, element));
  }

  getAbsoluteElementRect(elementCmp: PebEditorElement) {
    const scale = this._renderer.options.scale;
    const rendererRect = this.nativeElement.getBoundingClientRect();
    const elementRect = elementCmp.nativeElement.getBoundingClientRect();

    const horizontalMargin = (rendererRect.width / scale - PEB_DESKTOP_CONTENT_WIDTH) / 2;

    return {
      left: round((elementRect.left - rendererRect.left) / scale - horizontalMargin),
      top: round((elementRect.top - rendererRect.top) / scale),
      width: round(elementRect.width / scale),
      height: round(elementRect.height / scale),
      right: round((elementRect.left - rendererRect.left + elementRect.width) / scale - horizontalMargin),
      bottom: round((elementRect.top - rendererRect.top + elementRect.height) / scale),
    } as PebDOMRect;
  }

  elementIntersect(a: PebEditorElement, b: PebEditorElement): boolean {
    const aRect = a.nativeElement.getBoundingClientRect();
    const bRect = b.nativeElement.getBoundingClientRect();

    return bRect.bottom > aRect.top
      && bRect.right > aRect.left
      && bRect.top < aRect.bottom
      && bRect.left < aRect.right;
  }

  elementInclude(a: PebEditorElement, b: PebEditorElement): boolean {
    const aRect = a.nativeElement.getBoundingClientRect();
    const bRect = b.nativeElement.getBoundingClientRect();

    return aRect.top >= bRect.top
      && aRect.bottom <= bRect.bottom
      && aRect.left >= bRect.left
      && aRect.right <= bRect.right;
  }

  elementInsideContentContainer(target: PebEditorElement, parent: PebEditorElement): boolean {
    if (!parent.contentContainer && !parent.potentialContainer) {
      console.warn(`There is no contentContainer in element with id: ${parent.definition.id}`);
      return false;
    }

    const targetRect = target.nativeElement.getBoundingClientRect();
    const parentRect = (parent.contentContainer || parent.potentialContainer).getBoundingClientRect();

    return targetRect.top >= parentRect.top
      && targetRect.bottom <= parentRect.bottom
      && targetRect.left >= parentRect.left
      && targetRect.right <= parentRect.right;
  }

  elementMatchesInsideContentContainer(target: PebEditorElement, parent: PebEditorElement): boolean {
    if (!parent.contentContainer && !parent.potentialContainer) {
      console.warn(`There is no contentContainer in element with id: ${parent.definition.id}`);
      return false;
    }
    const maxElementContainerDifference = 10;
    const maxMarginOfError = 40;

    const targetRect = target.nativeElement.getBoundingClientRect();
    const parentRect = (parent.contentContainer || parent.potentialContainer).getBoundingClientRect();

    const containerWidthDifference = parentRect.width - targetRect.width;
    const marginDifference = Math.abs(parentRect.left - targetRect.left);

    return containerWidthDifference < maxElementContainerDifference
      && marginDifference < maxMarginOfError;
  }

  private buildGuideRails(producingElements: PebEditorElement[]) {
    const rects = producingElements.map(el => el.getAbsoluteElementRect());

    const horizontal = [
      ...rects.map(rect => rect.top),
      ...rects.map(rect => rect.bottom),
    ].sort((a, b) => a - b);

    const vertical = [
      ...rects.map(rect => rect.left),
      ...rects.map(rect => rect.right),
    ].sort((a, b) => a - b);

    return { horizontal, vertical }
  }

  private getElementNodesAtEventPoint(evt: MouseEvent): Element[] {
    return this.shadowRoot
      .elementsFromPoint(evt.pageX, evt.pageY)
      .filter((el: HTMLElement) => el.tagName.toLowerCase().startsWith('peb-element-'));
  }

  private getResizeAnchorsAtEventPoint(evt: MouseEvent): Element[] {
    return this.shadowRoot
      .elementsFromPoint(evt.pageX, evt.pageY)
      .filter(
        (el: HTMLElement) =>
          (el.tagName.toLowerCase() === 'circle' ||
            el.tagName.toLowerCase() === 'svg') &&
          el.classList.contains('anchor'),
      );
  }
}
