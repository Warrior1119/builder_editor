import { ComponentRef, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';

import { PebAbstractElement, PebButtonElement, PebTextElement } from '@pe/builder-renderer';
import { PebElementType, PebLink, PebPageVariant, PEB_DESKTOP_CONTENT_WIDTH } from '@pe/builder-core';

import { MaxPossibleDimensions, PebDOMRect, PebMargins } from '../editor.typings';
import { PebEditorRenderer } from './editor-renderer';
import { PebEditorElementCoordsControl } from '../controls/element-coords/element-coords.control';
import { PebEditorElementEdgesControl } from '../controls/element-edges/element-edges.control';
import { PebEditorElementAnchorsControl } from '../controls/element-anchors/element-anchors.control';
import { PebEditorSectionLabelsControl } from '../controls/section-labels/section-labels.control';
import { SidebarSelectOption } from '../behaviors/sidebars/_inputs/select/select.input';
import { ShadowStyles } from '../behaviors/sidebars/_forms/shadow/shadow.interfaces';
import { SelectOption } from '../behaviors/sidebars/_deprecated-sidebars/shared/select/select.component';
import { BorderStyles } from '../behaviors/sidebars/_forms/border/border.interfaces';

export enum Axis {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

// TODO: move to PebEditorVideoElement
export enum VideoSourceType {
  MyVideo = 'my-video',
  Link = 'link',
}

export enum VideoSubTab {
  Media = 'media',
  Details = 'details',
}

const { Horizontal, Vertical } = Axis

// questionable naming. opposite? collinear?
export const AxisOpposite = {
  [Axis.Horizontal]: Axis.Vertical,
  [Axis.Vertical]: Axis.Horizontal,
};

export const AxisProps = {
  [Axis.Horizontal]: {
    start: 'left',
    size: 'width',
    end: 'right',
  },
  [Axis.Vertical]: {
    start: 'top',
    size: 'height',
    end: 'bottom',
  },
};

export const getAxisRectStart = (axis, rect) => {
  const startProp = {
    [Vertical]: 'top',
    [Horizontal]: 'left',
  }[axis];
  return rect[startProp];
};

export const getAxisRectEnd = (axis, rect) => {
  const startProp = {
    [Vertical]: 'bottom',
    [Horizontal]: 'right',
  }[axis];
  return rect[startProp];
};

export const pointInRect = (
  rect: { left: number, top: number, bottom: number, right: number},
  point: { x: number, y: number },
): boolean => {
  return point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}

export class PebEditorElement {
  static cache = new WeakMap<PebAbstractElement, PebEditorElement>();

  controls: {
    edges?: ComponentRef<PebEditorElementEdgesControl>
    anchors?: ComponentRef<PebEditorElementAnchorsControl>,
    coords?: ComponentRef<PebEditorElementCoordsControl>,
    labels?: ComponentRef<PebEditorSectionLabelsControl>,
  } = {};

  // TODO: move to PebEditorLogoElement
  logo?: {
    initialValue: { file: string, src: string },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  // TODO: move to PebEditorVideoElement
  video?: {
    initialValue: {
      videoSubTab: VideoSubTab,
      sourceOptions: SelectOption[],
      sourceType: SelectOption,
      source: string,
      preview: string,
      file: string,
      autoplay: boolean,
      controls: boolean,
      loop: boolean,
      sound: boolean,
    },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  // TODO: move to PebEditorSectionElement
  section?: {
    initialValue: {
      name: string,
      sticky: boolean,
      default: boolean,
      isFirstSection: boolean,
      newElement: boolean,
    },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  // TODO: move to PebEditorMenuElement
  menuRoutes?: {
    initialValue: { menuRoutes: PebLink[] },
    options: {
      variants: SidebarSelectOption[],
      [PebPageVariant.Default]: SidebarSelectOption[],
      [PebPageVariant.Category]: SidebarSelectOption[],
    },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  position?: {
    initialValue: { x: number, y: number },
    form: FormGroup,
    limits: {
      x: BehaviorSubject<{ min: number, max: number }>,
      y: BehaviorSubject<{ min: number, max: number }>,
    };
    update: () => void,
    submit: Subject<any>,
  };

  dimensions?: {
    initialValue: { width: number, height: number },
    form: FormGroup,
    limits: {
      width: BehaviorSubject<{ min: number, max: number }>,
      height: BehaviorSubject<{ min: number, max: number }>,
    },
    activate: () => void,
    update: () => void,
    submit: Subject<any>,
  };


  opacity?: {
    initialValue: { opacity: number },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  background?: {
    initialValue: {
      bgColor: string,
      bgColorGradientAngle: number,
      bgColorGradientStart: string,
      bgColorGradientStop: string,
      file: File,
      bgImage: string,
      fillType: SelectOption,
      imageSize: SelectOption,
      imageScale: number,
    },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  font?: {
    initialValue: {
      fontFamily: string,
      fontWeight: string,
      fontStyle: string,
      fontSize: number,
      color: string,
    },
    form: FormGroup,
    options: {
      fontFamilies: SidebarSelectOption[],
    },
    update: () => void,
    submit: Subject<any>,
  }

  proportions?: {
    initialValue: {
      objectFit: string,
    },
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  shadow?: {
    initialValue: ShadowStyles,
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  productDimensions?: {
    initialValue: { width: number, height: number },
    form: FormGroup,
    limits: {
      width: BehaviorSubject<{ min: number, max: number }>,
      height: BehaviorSubject<{ min: number, max: number }>,
    },
    activate: () => void,
    update: () => void,
    submit: Subject<any>,
  };

  border?: {
    initialValue: BorderStyles,
    form: FormGroup,
    update: () => void,
    submit: Subject<any>,
  }

  constructor(
    private renderer: PebEditorRenderer,
    public target: PebAbstractElement,
  ) {
    if (!target || !target.element) {
      debugger;
    }
  }

  static construct(renderer: PebEditorRenderer, target: PebAbstractElement) {
    if (PebEditorElement.cache.get(target)) {
      return this.cache.get(target);
    }

    const result = new PebEditorElement(renderer, target);
    PebEditorElement.cache.set(target, result);

    return result;
  }

  get isParent(): boolean {
    return this.target.isParent;
  }

  get definition() {
    return this.target.element;
  }

  get styles() {
    return this.target.styles;
  }

  set styles(styles) {
    this.target.styles = styles;

    this.target.applyStyles();
  }

  get options() {
    return this.target.options;
  }

  get context() {
    return this.target.context;
  }

  get nativeElement(): HTMLElement {
    return this.target.nativeElement;
  }

  get parent(): PebEditorElement {
    return PebEditorElement.construct(this.renderer, this.target.parent);
  }

  get children(): PebEditorElement[] {
    return this.definition.children?.map(
      elDef => this.renderer.registry.get(elDef.id),
    );
  }

  get siblings(): PebEditorElement[] {
    return this.parent.children.filter(c => c !== this);
  }

  get contentContainer(): HTMLElement {
    return this.target.contentContainer;
  }

  get potentialContainer(): HTMLElement {
    return this.target.potentialContainer;
  }

  get textContent(): HTMLElement {
    if (this.target instanceof PebButtonElement || this.target instanceof PebTextElement) {
      return (this.target as (PebButtonElement | PebTextElement)).textContent;
    }

    return null;
  }

  get controlsSlot(): ViewContainerRef {
    return this.target.controlsSlot;
  }
  
  setTextContent(value, elementClass): void {
    if (elementClass !== 'PebTextElement') {
      throw new Error(`The component isn't instance of Class PebTextElement`);
    }
    this.target.element.data.text = value;
  }

  detectChanges() {
    this.target.cdr.detectChanges();
  }

  applyStyles() {
    this.target.applyStyles();
  }

  getAbsoluteElementRect(): PebDOMRect {
    return this.getNodeRect(this.nativeElement);
  }

  getContentContainerRect(): PebDOMRect {
    return this.getNodeRect(
      this.target.contentContainer
      || this.target.potentialContainer
      || this.target.nativeElement);
  }

  getNodeRect(node: HTMLElement): PebDOMRect {
    const scale = this.renderer.options.scale;

    const rendererRect = this.renderer.nativeElement.getBoundingClientRect();
    const elementRect = node.getBoundingClientRect();

    const horizontalMargin = (rendererRect.width / scale - PEB_DESKTOP_CONTENT_WIDTH) / 2;

    return {
      left: Math.ceil((elementRect.left - rendererRect.left) / scale - horizontalMargin),
      top: Math.ceil((elementRect.top - rendererRect.top) / scale),
      width: Math.ceil(elementRect.width / scale),
      height: Math.ceil(elementRect.height / scale),
      right: Math.ceil((elementRect.left - rendererRect.left + elementRect.width) / scale - horizontalMargin),
      bottom: Math.ceil((elementRect.top - rendererRect.top + elementRect.height) / scale),
      offsetLeft: Math.ceil(node.offsetLeft / scale),
      offsetTop: Math.ceil(node.offsetTop / scale),
    };
  }

  getCalculatedMargins(): PebMargins {
    const scale = this.renderer.options.scale;
    const nativeStyleDecl = getComputedStyle(this.nativeElement);

    return {
      marginTop: parseInt(nativeStyleDecl.getPropertyValue('margin-top'), 10) / scale,
      marginBottom: parseInt(nativeStyleDecl.getPropertyValue('margin-bottom'), 10) / scale,
      marginLeft: parseInt(nativeStyleDecl.getPropertyValue('margin-left'), 10) / scale,
      marginRight: parseInt(nativeStyleDecl.getPropertyValue('margin-right'), 10) / scale,
    }
  }

  getMinPossibleDimensions(axis: Axis): number {
    if (!this.contentContainer) {
      // FIXME: Use values defined at components
      return this.definition.type === PebElementType.Text
        ? axis === Axis.Horizontal
          ? 32
          : 18
        : 20;
    }

    if (this.contentContainer && !this.children.length) {
      return this.definition.type === PebElementType.Text
        ? axis === Axis.Horizontal
          ? 32
          : 18
        : 20;
    }

    const contentRect = this.getContentContainerRect();
    const childrenRects = this.children.map((childCmp) => childCmp.getAbsoluteElementRect());

    if (!contentRect) {
      return;
    }

    const maxEnd = Math.max(
      getAxisRectStart(axis, contentRect),
      ...childrenRects.map(r => getAxisRectEnd(axis, r)),
    );

    return maxEnd - getAxisRectStart(axis, contentRect);
  }

  getMaxPossibleDimensions(axis: Axis): MaxPossibleDimensions {
    const elementRect = this.getAbsoluteElementRect();
    const parentRect = this.parent.getContentContainerRect();

    if (!elementRect || !parentRect) {
      return;
    }

    const oppAxis = AxisOpposite[axis];

    const range = this.siblings.reduce((result: any, siblingCmp) => {
      const siblingRect = siblingCmp.getAbsoluteElementRect();

      const oppAxisStartProp = AxisProps[oppAxis].start;
      const oppAxisEndProp = AxisProps[oppAxis].end;

      if (siblingRect[oppAxisEndProp] < elementRect[oppAxisStartProp]
        || siblingRect[oppAxisStartProp] > elementRect[oppAxisEndProp]
      ) {
        return result;
      }

      const startProp = AxisProps[axis].start;
      const endProp = AxisProps[axis].end;

      if (siblingRect[endProp] <= elementRect[startProp]) {
        result.start = Math.max(result.start, siblingRect[endProp]);
      }
      if (siblingRect[startProp] >= elementRect[endProp]) {
        result.end = Math.min(result.end, siblingRect[startProp]);
      }

      return result;
    }, { start: parentRect[AxisProps[axis].start], end: parentRect[AxisProps[axis].end] });

    return {
      ...range,
      spaceStart: elementRect[AxisProps[axis].start] - range.start,
      size: range.end - range.start,
      spaceEnd: range.end - elementRect[AxisProps[axis].end],
    };
  }

  // TODO: Should be reimplemented since doesn't calculate maximum possible rectangle.
  //  @see: https://docs.google.com/spreadsheets/d/1vXZCHH2PPoHZpZNlIhLmNKIpxgLS-dxuKooNoTpFXLQ/edit#gid=304958590
  getMaxProportionalDimensions() {
    const elementRect = this.getAbsoluteElementRect();

    const horizontalLimits = this.getMaxPossibleDimensions(Horizontal);
    const verticalLimits = this.getMaxPossibleDimensions(Vertical);

    if (!horizontalLimits || !verticalLimits) {
      return;
    }

    const startCornerRect = {
      left: horizontalLimits.start,
      top: verticalLimits.start,
      right: elementRect.left,
      bottom: elementRect.top,
    }
    const startCornerLines = {
      horizontal: [horizontalLimits.start],
      vertical: [verticalLimits.start],
    };
    const endCornerRect = {
      left: elementRect.right,
      top: elementRect.bottom,
      right: horizontalLimits.end,
      bottom: verticalLimits.end,
    }
    const endCornerLines = {
      horizontal: [horizontalLimits.start],
      vertical: [verticalLimits.start],
    };

    this.siblings.forEach((siblingCmp) => {
      const siblingRect = siblingCmp.getAbsoluteElementRect();

      if (pointInRect(startCornerRect, { x: siblingRect.right, y: siblingRect.bottom })) {
        startCornerLines.horizontal.push(siblingRect.right);
        startCornerLines.vertical.push(siblingRect.bottom);
      }

      if (pointInRect(endCornerRect, { x: siblingRect.left, y: siblingRect.top })) {
        startCornerLines.horizontal.push(siblingRect.left);
        startCornerLines.vertical.push(siblingRect.top);
      }
    })

    return {
      left: Math.max(...startCornerLines.horizontal),
      top: Math.max(...startCornerLines.vertical),
      right: Math.min(...startCornerLines.horizontal),
      bottom: Math.min(...startCornerLines.horizontal),
    }
  }
}
