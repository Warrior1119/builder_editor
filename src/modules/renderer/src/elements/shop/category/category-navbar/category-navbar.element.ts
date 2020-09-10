import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { isArray } from 'lodash';

import {
  PebElementContext,
  PebElementContextState,
  PebElementDef,
  PebElementStyles,
  transformStyleProperty,
} from '@pe/builder-core';

import { PebRendererOptions } from '../../../../renderer.types';
import { PebAbstractElement } from '../../../_abstract/abstract.element';

@Component({
  selector: 'shop-category-navbar',
  templateUrl: './category-navbar.element.html',
  styleUrls: ['./category-navbar.element.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PebShopCategoryNavbarElement extends PebAbstractElement implements AfterViewInit {
  @Input() context: PebElementContext<any>;
  @Input() styles: PebElementStyles;
  @Input() options: PebRendererOptions;
  @Input() element: PebElementDef;

  @Output() toggleFilters: EventEmitter<any> = new EventEmitter();
  @Output() sort: EventEmitter<any> = new EventEmitter();
  @Output() resetFilters: EventEmitter<void> = new EventEmitter();

  @ViewChild('imageRef') imageRef: ElementRef;

  PebElementContextState = PebElementContextState;

  get elements(): { [key: string]: HTMLElement | HTMLElement[] } {
    return {
      host: this.nativeElement,
    };
  }

  get mappedStyles() {
    return {
      host: {
        display: 'flex',
        borderColor: this.styles?.borderColor,
        ...('top' in this.styles && {
          top: transformStyleProperty(this.styles.top, this.options.scale),
        }),
      },
    };
  }

  onToggleShownFilters(): void {
    if (!this.options.interactions) {
      return;
    }

    this.toggleFilters.emit();
  }

  // TODO: add typings
  onSort(value): void {
    if (!this.options.interactions) {
      return;
    }

    this.sort.emit(value);
  }

  onResetFilters(): void {
    if (!this.options.interactions) {
      return;
    }

    this.resetFilters.emit();
  }

  get atLeastOneFilterActive(): boolean {
    return this.context?.data?.filters.some(parentFilter =>
      parentFilter.children.some(filter => filter.active),
    );
  }

  // TODO: return after checking renderer's styling.
  ngAfterViewInit() {
    this.applyStyles();
  }

  @HostBinding('class')
  get hostClass() {
    return 'screen-' + this.options.screen;
  }
}
