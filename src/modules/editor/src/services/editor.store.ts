/* tslint:disable:member-ordering */
import { Injectable, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, EMPTY, Observable, of, Subject, timer } from 'rxjs';
import { filter, map, share, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { filter as filterCollection, find, fromPairs } from 'lodash';

import {
  generateUniqueIds,
  getPageUrlByName,
  hashString,
  PebAction,
  PebAppendElementPayload,
  pebCompileActions,
  PebContext,
  PebContextSchemaEffect,
  pebCreateEmptyPage,
  pebCreateLogger,
  PebEffectTarget,
  PebElementDef,
  PebElementId,
  PebElementType,
  pebGenerateId,
  pebLayoutCreateUpdateElementEffect,
  pebMapElementDeep,
  PebPage,
  PebPageEffect,
  PebPageId,
  PebPageShort,
  PebPageType,
  PebPageVariant,
  PebScreen,
  PebShop,
  PebShopData,
  PebShopEffect,
  PebShopRoute,
  PebShopTheme,
  PebShopThemeSnapshotEntity,
  PebShopThemeSource,
  PebStylesheet,
  PebStylesheetEffect,
  PebTemplateEffect,
} from '@pe/builder-core';
import { PebEditorApi } from '@pe/builder-api';

import {
  PebActionResponse,
  PebChangeShopRouting,
  PebDeleteElement,
  PebElementKit,
  PebPasteElement,
} from './interfaces';
import { ElementTransformation } from '../behaviors/transforming/element-transformations';
import { PebEditorActionService } from './editor-action.service';
import { PebEditorCompileErrorDialog } from '../toolbar/dialogs/compile-error/compile-error.dialog';

const log = pebCreateLogger('editor:store');

const isErrorsFatal = () => Boolean(localStorage.getItem('PEB_BEHAVIORS_FATAL_ERRORS'));

/**
 * TODO(@ziulev): All modifying calls should be transformed similar to commitAction so
 *                request won't be cancelled prematurely
 */

@Injectable()
export class PebEditorStore implements OnDestroy {
  constructor(
    private dialog: MatDialog,
    private api: PebEditorApi,
    private actionService: PebEditorActionService,
  ) {
    (window as any).pebEditorStore = this;
  }

  ngOnDestroy() {
    this.snapshotSubject$.next(null);
    this.snapshotSubject$.complete();

    this.sourceSubject$.next(null);
    this.sourceSubject$.complete();

    this.destroyedSubject$.next(true);
    this.destroyedSubject$.complete();
  }

  // TODO(@dmlukichev): Check if it would be more convenient to use theme$, source$ and snapshot$
  //  after piping it through existence filter
  private readonly themeSubject$ = new BehaviorSubject<PebShopTheme>(null);
  readonly theme$ = this.themeSubject$.asObservable();

  get theme() {
    return this.themeSubject$.value;
  }

  private readonly sourceSubject$ = new BehaviorSubject<PebShopThemeSource>(null);
  readonly source$ = this.sourceSubject$.asObservable();

  get source() {
    return this.sourceSubject$.value;
  }

  private readonly snapshotSubject$ = new BehaviorSubject<PebShopThemeSnapshotEntity>(null);
  readonly snapshot$ = this.snapshotSubject$.asObservable();

  get snapshot() {
    // TODO: Dirty hack. To remove all attempts to modify snapshot directly use deepFreeze
    return JSON.parse(JSON.stringify(this.snapshotSubject$.value));
  }

  private readonly activePageIdSubject$ = new BehaviorSubject<PebPageId>(null);
  readonly activePageId$ = this.activePageIdSubject$.asObservable();

  get activePageId() {
    return this.activePageIdSubject$.value;
  }

  readonly copiedElementsSubject$ = new BehaviorSubject<PebElementKit[]>(null);
  readonly copiedElements$ = this.copiedElementsSubject$.asObservable();

  private lastActivePages = {
    [PebPageType.Master]: null,
    [PebPageType.Replica]: null,
  };

  private readonly destroyedSubject$ = new Subject();
  readonly destroyed$ = this.destroyedSubject$.asObservable();

  openTheme(theme: PebShopTheme, initialPageId: PebPageId): Observable<null> {
    if (!theme) {
      throw new Error('Attempt to initiate store for empty theme');
    }

    this.actionService.openTheme(theme);

    /**
     * Temporary adapter from actionService snapshots stream to snapshotSubject$
     * TODO: use actionService's activeSnapshot$ directly instead of this.snapshotSubject$
     */
    this.actionService.activeSnapshot$.pipe(
      withLatestFrom(this.actionService.activePage$),
      takeUntil(this.destroyed$),
    ).subscribe(([snapshot, targetPageId]) => {
      this.snapshotSubject$.next(snapshot);
      if (targetPageId && this.activePageId !== targetPageId) {
        this.activatePage(targetPageId);
      }
    });

    // TODO: move backend API subscription to actionService
    this.actionService.updateBackend$.pipe(
      takeUntil(this.destroyed$),
    ).subscribe({
      error: () => {
        this.dialog.open(PebEditorCompileErrorDialog, { disableClose: true });
      },
    });

    // TODO: use actionService openTheme() and theme$ observable as source of true instead
    const mockApiGetSource = (t) => of(t.source);

    const mockApiGetSnapshot = (t) => of(t.source.snapshot);

    this.themeSubject$.next(theme);

    return combineLatest([
      mockApiGetSource(theme),
      mockApiGetSnapshot(theme),
    ]).pipe(
      tap(([source, snapshot]) => {
        this.sourceSubject$.next(source);

        log(`Open theme "${this.theme.name}"`);

        if (initialPageId) {
          return this.activePageIdSubject$.next(initialPageId)
        }

        // TODO(@dmlukichev): This will become an async request to server
        const snapshotPages = Object.values((theme.source.snapshot as any).pages) as PebPage[];
        const frontPage = snapshotPages.find(p => p.variant === PebPageVariant.Front);

        if (!frontPage) {
          console.warn(
            'This theme somehow doesn\'t have front page defined.' +
            'Probably, this happened because your fixture doesn\'t define it.',
          );
        }

        this.activePageIdSubject$.next(frontPage.id || snapshotPages[0].id);
      }),
      map(() => null),
      takeUntil(this.destroyed$),
      share(), // TODO: Check if this should go before `takeUntil()`
    );
  }

  updateThemePreview(previewURL: string): Observable<any> {
    return this.api.updateShopThemePreview(this.theme.id, previewURL).pipe(
      tap(() => this.themeSubject$.next({
        ...this.theme,
        picture: previewURL,
      })),
    );
  }

  activatePage(pageId): Observable<any> {
    if (!pageId) {
      this.activePageIdSubject$.next(null);
      return EMPTY;
    }

    const page = this.snapshot.pages[pageId];

    if (!page) {
      return EMPTY;
    }
    this.lastActivePages[page.type] = pageId;

    if (page.master) {
      const masterActions = extractPageActionsFromSnapshot(
        this.source,
        this.snapshot,
        page.master.id,
      );
      const lastMasterActionId = masterActions[masterActions.length - 1].id;

      if (page.master.lastActionId !== lastMasterActionId) {
        const confirmation = confirm(
          'Page\'s master has been changed.\n' +
          'Do you want to apply this changes?',
        );

        if (confirmation) {
          this.applyMasterChangesInReplica(pageId).pipe(
            tap(() => this.activePageIdSubject$.next(pageId)),
          );
        }
      }
    }

    this.activePageIdSubject$.next(null)

    const result$ = new Subject();

    timer(50).pipe(
      tap(() => this.activePageIdSubject$.next(pageId)),
      takeUntil(this.destroyed$),
    ).subscribe(result$);

    return result$;
  }

  activateLastPageByView(type: PebPageType): Observable<null> {
    if (this.lastActivePages[type]) {
      return this.activatePage(this.lastActivePages[type]);
    }

    const possiblePages = Object
      .values(this.snapshot.pages as PebPageShort)
      .filter((replicaPage: PebPageShort) => replicaPage.type === type);

    return possiblePages.length
      ? this.activatePage(possiblePages[0].id)
      : EMPTY;
  }

  createPage(input: {
    name: string,
    variant: PebPageVariant,
    type: PebPageType,
    masterId: PebPageId | null,
  }): Observable<any> {
    let pageSource: PebPage = null;

    if (input.masterId) {
      const masterActions = extractPageActionsFromSnapshot(
        this.source,
        this.snapshot,
        input.masterId,
      );

      pageSource = extractPageFromSnapshot(this.snapshot, input.masterId);
      pageSource.id = pebGenerateId('page');
      pageSource.type = PebPageType.Replica;
      pageSource.master = {
        id: input.masterId,
        lastActionId: masterActions[masterActions.length - 1].id,
      };
    } else {
      pageSource = pebCreateEmptyPage(input.name, input.variant, input.type);
    }
    const routing: PebChangeShopRouting[] = [{
      pageId: pageSource.id,
      currentUrl: getPageUrlByName(pageSource.name, pageSource.variant),
    }];

    const createPageAction = makeCreatePageAction(input.name, pageSource);

    return this.commitAction(createPageAction).pipe(
      filter((res) => !!res),
      switchMap(() => this.activatePage(pageSource.id).pipe(
        tap(() => this.updateShopThemeRouting(routing)),
      )),
    );
  }

  duplicatePage(input: { name: string, pageId: PebPageId, pageVariant: PebPageVariant }): Observable<any> {
    const pageSource = extractPageFromSnapshot(this.snapshot, input.pageId);

    pageSource.id = pebGenerateId('page');
    pageSource.name = input.name;
    pageSource.variant = PebPageVariant.Default;

    if (!pageSource.master) {
      Object.assign(pageSource, generateUniqueIds(pageSource));
    }

    const createPageAction = makeCreatePageAction(input.name, pageSource);

    return this.commitAction(createPageAction).pipe(
      filter(res => res?.progress === 100),
      switchMap((res: PebActionResponse) => this.activatePage(pageSource.id)),
    );
  }

  updatePagesWithShopRouting(pagesPayload: any[], routingPayload: PebShopRoute[]): Observable<PebActionResponse> {
    const updatePagesAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: null,
      affectedPageIds: [],
      effects: [
        ...pagesPayload.map(({ page, payload }) => ({
          type: PebPageEffect.Update,
          target: `${PebEffectTarget.Pages}:${page.id}`,
          payload,
        })),
        {
          type: PebShopEffect.UpdateRouting,
          target: `${PebEffectTarget.Shop}:${this.snapshot.shop.id}`,
          payload: routingPayload,
        },
      ],
    };
    return this.commitAction(updatePagesAction);
  }

  updateShopThemeRouting(routes: PebChangeShopRouting[]): Observable<PebActionResponse> {
    const payload = getShopThemeRoutingPayload(routes, this.snapshot.shop.routing);

    const updateShopAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: null,
      affectedPageIds: [],
      effects: [
        {
          type: PebShopEffect.UpdateRouting,
          target: `${PebEffectTarget.Shop}:${this.snapshot.shop.id}`,
          payload,
        },
      ],
    };
    return this.commitAction(updateShopAction);
  }

  updatePage(page: PebPageShort, payload: any): Observable<PebActionResponse> {
    const updatePageAction = makeUpdatePageAction(page, payload);

    return this.commitAction(updatePageAction);
  }

  deletePage(page: PebPageShort, pagesView: PebPageType): Observable<PebActionResponse> {
    const routing: PebChangeShopRouting[] = [{
      currentUrl: '',
      pageId: page.id,
    }];
    const deletePageAction = makeDeletePageAction(page);

    return this.commitAction(deletePageAction).pipe(
      filter((res) => !!res),
      tap((res: PebActionResponse) => {
        if (this.activePageId === page.id) {
          this.activateExistPage(page.id, pagesView);
        }
        this.updateShopThemeRouting(routing);
      }),
    );
  }

  appendElement(
    parentId: PebElementId,
    elementDef: PebElementKit,
    parentTransforms?: ElementTransformation,
  ): Observable<PebActionResponse> {
    const page = this.snapshot.pages[this.activePageId];

    const appendAction = makeAppendElementAction(
      page,
      parentId,
      elementDef,
      null,
      parentTransforms,
      this.snapshot.shop,
    );

    return this.commitAction(appendAction);
  }

  pasteElement(pasteElements: PebPasteElement[], screen: PebScreen): Observable<PebActionResponse> {
    const page = this.snapshot.pages[this.activePageId];
    const pasteAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [],
    }

    pasteElements.forEach((element: PebPasteElement) => {
      const effects = makePasteElementAction(
        page,
        element.parentId,
        element.elementDef,
        element.childIds,
        screen,
        element.beforeId,
      );
      pasteAction.effects.push(...effects);
    });

    return this.commitAction(pasteAction);
  }

  deleteElement(elements: PebDeleteElement[] | PebElementKit[], currentScreen: PebScreen): Observable<PebActionResponse> {
    const page = this.snapshot.pages[this.activePageId];

    const deleteAction = makeDeleteElementAction(page, elements, this.snapshot, currentScreen);
    return this.commitAction(deleteAction);
  }

  setBeforeElement(
    parentId: PebElementId,
    elementDef: any,
    beforeId?: PebElementId,
  ): Observable<PebActionResponse> {
    // Set element before parentId element
    const page = this.snapshot.pages[this.activePageId];

    const appendAction = makeAppendElementAction(page, parentId, elementDef, beforeId);

    return this.commitAction(appendAction);
  }

  updateElement(element: PebElementDef): Observable<PebActionResponse> {
    const page = this.snapshot.pages[this.activePageId];

    const updateElementAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [
        pebLayoutCreateUpdateElementEffect(page.templateId, element),
      ],
    };

    return this.commitAction(updateElementAction);
  }

  relocateElement(
    elementId: PebElementId,
    nextParentId: PebElementId,
    styles: PebStylesheet,
    stylesScreen: PebScreen,
    transformation?: ElementTransformation,
  ): Observable<PebActionResponse> {
    const page = this.snapshot.pages[this.activePageId];
    const stylesheetId = page.stylesheetIds[stylesScreen];

    const transformEffects = transformation ? [
      {
        type: PebTemplateEffect.UpdateElement,
        target: `${PebEffectTarget.Templates}:${page.templateId}`,
        payload: transformation.definition,
      },
      {
        type: PebStylesheetEffect.Replace,
        target: `${PebEffectTarget.Stylesheets}:${stylesheetId}`,
        payload: {
          selector: transformation.definition.id,
          styles: transformation.styles,
        },
      },
    ] : [];

    const relocateElementAction: PebAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [
        ...transformEffects,
        {
          type: PebStylesheetEffect.Update,
          target: `${PebEffectTarget.Stylesheets}:${stylesheetId}`,
          payload: styles,
        },
        {
          type: PebTemplateEffect.RelocateElement,
          target: `${PebEffectTarget.Templates}:${page.templateId}`,
          payload: {
            elementId,
            nextParentId,
          },
        },
      ],
    }

    return this.commitAction(relocateElementAction);
  }

  updateStyles(screen: PebScreen, styles: PebStylesheet) {
    const page = this.snapshot.pages[this.activePageId];
    const stylesheetId = page.stylesheetIds[screen];

    const updateStylesAction: PebAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [
        {
          type: PebStylesheetEffect.Update,
          target: `${PebEffectTarget.Stylesheets}:${stylesheetId}`,
          payload: styles,
        },
      ],
    };

    return this.commitAction(updateStylesAction);
  }

  // TODO: Reorganize and unify this
  updateElementKit(screen: PebScreen, newDefinition: PebElementDef, newStyles: PebStylesheet) {
    const page = this.snapshot.pages[this.activePageId];
    const stylesheetId = page.stylesheetIds[screen];

    const updateKitAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [
        pebLayoutCreateUpdateElementEffect(page.templateId, newDefinition),
        {
          type: PebStylesheetEffect.Update,
          target: `${PebEffectTarget.Stylesheets}:${stylesheetId}`,
          payload: newStyles,
        },
      ],
    };

    return this.commitAction(updateKitAction);
  }

  updateContext(elementId: PebElementId, context: PebContext) {
    const page = this.snapshot.pages[this.activePageId];

    const updateContextAction: PebAction = {
      id: pebGenerateId('action'),
      createdAt: new Date(),
      targetPageId: page.id,
      affectedPageIds: [page.id],
      effects: [
        {
          type: PebContextSchemaEffect.Update,
          target: `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
          payload: context ? { [elementId]: context } : null,
        },
      ],
    };

    return this.commitAction(updateContextAction);
  }

  updateShop(data: PebShopData) {
    const updateShopAction: PebAction = {
      id: pebGenerateId(),
      createdAt: new Date(),
      targetPageId: null,
      affectedPageIds: [],
      effects: [{
        type: PebShopEffect.UpdateData,
        target: PebEffectTarget.Shop,
        payload: data,
      }],
    };

    return this.commitAction(updateShopAction);
  }

  undoAction(): void {
    this.actionService.undo();
  }

  redoAction(): void {
    this.actionService.redo();
  }

  updatePagePreview(pageId: string, previewUrl: string, actionId: string): Observable<any> {
    const previews = {
      ...this.source.previews,
      [pageId]: {
        previewUrl,
        actionId,
      },
    };
    return this.api.updateThemeSourcePagePreviews(this.theme.id, this.source.id, previews).pipe(
      tap(() => this.sourceSubject$.next({
        ...this.source,
        previews,
      })),
    );
  }

  commitFailed$ = new BehaviorSubject(null);

  private commitAction(action: PebAction): Observable<PebActionResponse> {
    log(`New action #${action.id} at ${this.source.hash}: `, action.effects);

    if (this.commitFailed$.value) {
      log('.. ignored since previous commit failed');
    }

    this.sourceSubject$.next({
      ...this.source,
      hash: hashString(this.source.hash + action.id),
      actions: [...this.source.actions, action],
    });

    // source and snapshot could already process next action so we need to compare with current one
    const expectedHashes = {
      sourceHash: this.source.hash,
      snapshotHash: this.snapshot.hash,
    }

    return this.actionService.createAction(action);

    // TODO: Add hash comparing to actionService.createAction
    // merge(
    //   of({
    //     snapshot: newSnapshot,
    //     progress: 0,
    //   }),
    //   this.api.addAction(this.theme.id, action).pipe(
    //     // tap(result => {
    //     //   if (!isEqual(result, expectedHashes)) {
    //     //     throw new Error('Local and servers states of the theme differ');
    //     //   }
    //     // }),
    //     map(() => ({
    //       progress: 100,
    //       snapshot: newSnapshot,
    //     })),
    //     catchError((err) => {
    //       console.error(err);
    //
    //       if (isErrorsFatal()) {
    //         this.dialog.open(PebEditorCompileErrorDialog, { disableClose: true });
    //       } else {
    //         this.reloadTheme_TMP();
    //       }
    //
    //       this.commitFailed$.next(true);
    //
    //       return of(EMPTY);
    //     }),
    //     takeUntil(
    //       this.commitFailed$.pipe(filter(Boolean)),
    //     ),
    //   ) as Observable<any>,
    // ).subscribe(result$);
  }

  private reloadTheme_TMP() {
    this.api.getShopThemeById(this.theme.id).pipe(
      switchMap((theme: any) => {
        return this.openTheme(theme, this.activePageId)
      }),
      tap(() => {
        this.commitFailed$.next(false);
      }),
    ).subscribe();
  }

  private applyMasterChangesInReplica(pageId: PebPageId) {
    const page = this.snapshot.pages[pageId];

    const masterActions = extractPageActionsFromSnapshot(
      this.source,
      this.snapshot,
      page.master.id,
    );
    const replicaActions = extractPageActionsFromSnapshot(this.source, this.snapshot, pageId);

    const prevReplicaInitAction = replicaActions[0];

    const masterSource = extractPageFromSnapshot(this.snapshot, page.master.id);
    masterSource.id = page.id;
    masterSource.type = PebPageType.Replica;
    masterSource.master = {
      id: page.master.id,
      lastActionId: masterActions[masterActions.length - 1].id,
    };

    const newReplicaInitAction = makeCreatePageAction(page.name, masterSource, {
      pageId,
      templateId: page.templateId,
      stylesIds: page.stylesheetIds,
      contextId: page.contextId,
    });

    this.sourceSubject$.next({
      ...this.sourceSubject$.value,
      actions: this.sourceSubject$.value.actions.map(
        a => a.id === prevReplicaInitAction.id ? newReplicaInitAction : a,
      ),
    });

    this.snapshotSubject$.next({
      ...pebCompileActions(this.source.actions),
      id: this.snapshot.id,
    });

    return this.api.updateReplica(
      this.theme.id,
      prevReplicaInitAction,
      newReplicaInitAction,
    );
  }

  private activateExistPage(pageId: PebPageId, pagesView: PebPageType = PebPageType.Replica): Observable<null> {
    // If page was deleted, find another one by PagesView
    let existPage = find(this.snapshot.pages, (snapshotPage) => snapshotPage.id === pageId);
    if (!existPage) {
      // Get pages by active PagesView
      const pages = filterCollection(this.snapshot.pages, (snapshotPage) => snapshotPage.type === pagesView);
      if (!pages.length) {
        // Set pagesView to Replica and set active front page
        pagesView = PebPageType.Replica;
        existPage = find(this.snapshot.pages, (snapshotPage) => snapshotPage.variant === PebPageVariant.Front);
      } else {
        existPage = pages[0];
      }
    }
    return this.activatePage(existPage.id)
  }
}

export function makeCreatePageAction(pageName, pageSource, ids?: any): PebAction {
  const templateId = ids?.templateId || pebGenerateId('template');
  const stylesIds = ids?.stylesIds || {
    [PebScreen.Desktop]: pebGenerateId('stylesheet'),
    [PebScreen.Tablet]: pebGenerateId('stylesheet'),
    [PebScreen.Mobile]: pebGenerateId('stylesheet'),
  };
  const contextId = ids?.stylesIds || pebGenerateId('context');

  return {
    id: pebGenerateId('action'),
    createdAt: new Date(),
    targetPageId: pageSource.id,
    affectedPageIds: [pageSource.id],
    effects: [
      {
        type: PebTemplateEffect.Init,
        target: `${PebEffectTarget.Templates}:${templateId}`,
        payload: pageSource.template,
      },
      ...Object.values(PebScreen).map(screen => ({
        type: PebStylesheetEffect.Init,
        target: `${PebEffectTarget.Stylesheets}:${stylesIds[screen]}`,
        payload: pageSource.stylesheets[screen],
      })),
      {
        type: PebContextSchemaEffect.Init,
        target: `${PebEffectTarget.ContextSchemas}:${contextId}`,
        payload: pageSource.context,
      },
      {
        type: PebPageEffect.Create,
        target: `${PebEffectTarget.Pages}:${pageSource.id}`,
        payload: {
          id: pageSource.id,
          variant: pageSource.variant,
          type: pageSource.type,
          master: pageSource.master,
          name: pageName,
          data: pageSource.data,
          templateId,
          stylesheetIds: {
            [PebScreen.Desktop]: `${stylesIds[PebScreen.Desktop]}`,
            [PebScreen.Tablet]: `${stylesIds[PebScreen.Tablet]}`,
            [PebScreen.Mobile]: `${stylesIds[PebScreen.Mobile]}`,
          },
          contextId,
        },
      },
      ...(ids?.page ? [{
        type: PebShopEffect.AppendPage,
        target: PebEffectTarget.Shop,
        payload: pageSource.id,
      }] : []),
    ],
  };
}

export function makeDeletePageAction(page: PebPageShort): PebAction {
  return {
    id: pebGenerateId('action'),
    createdAt: new Date(),
    targetPageId: null,
    affectedPageIds: [],
    effects: [
      {
        type: PebTemplateEffect.Destroy, // TODO: Unify naming with other targets
        target: `${PebEffectTarget.Templates}:${page.templateId}`,
        payload: null,
      },
      ...Object.values(PebScreen).map(screen => ({
        type: PebStylesheetEffect.Delete,
        target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
        payload: null,
      })),
      {
        type: PebContextSchemaEffect.Delete,
        target: `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
        payload: null,
      },
      {
        type: PebPageEffect.Delete,
        target: `${PebEffectTarget.Pages}:${page.id}`,
        payload: null,
      },
      {
        type: PebShopEffect.DeletePage,
        target: PebEffectTarget.Shop,
        payload: page.id,
      },
    ],
  };
}

export function makeUpdatePageAction(page: PebPageShort, payload: any): PebAction {
  return {
    id: pebGenerateId('action'),
    targetPageId: page.id,
    affectedPageIds: [page.id],
    createdAt: new Date(),
    effects: [
      {
        type: PebPageEffect.Update,
        target: `${PebEffectTarget.Pages}:${page.id}`,
        payload,
      },
    ],
  };
}

export function makeAppendElementAction(
  page: PebPageShort,
  parentId: PebElementId,
  elementKit: PebElementKit,
  beforeId?: PebElementId,
  transformation?: ElementTransformation,
  shop?: any,
): PebAction {
  const elementId = elementKit.element.id;
  const payload = getPayload(parentId, elementKit, beforeId);

  const transformEffects = transformation ? [
    {
      type: PebTemplateEffect.UpdateElement,
      target: `${PebEffectTarget.Templates}:${page.templateId}`,
      payload: transformation.definition,
    },
    ...Object.values(PebScreen).map(screen => ({
      type: PebStylesheetEffect.Replace,
      target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
      payload: {
        selector: transformation.definition.id,
        styles: transformation.styles,
      },
    })),
  ] : [];

  const rootContextEffect = elementKit?.rootContextKey
    ? {
      type: PebContextSchemaEffect.Update,
      target: `${PebEffectTarget.ContextSchemas}:${shop.contextId}`,
      payload: { [elementKit.rootContextKey]: elementKit.contextSchema },
    }
    : null;

  return {
    id: pebGenerateId('action'),
    createdAt: new Date(),
    targetPageId: page.id,
    affectedPageIds: [page.id],
    effects: [
      ...transformEffects,
      {
        type: PebTemplateEffect.AppendElement,
        target: `${PebEffectTarget.Templates}:${page.templateId}`,
        payload,
      },
      ...Object.values(PebScreen).map(screen => ({
        type: PebStylesheetEffect.Update,
        target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
        payload: {
          [elementId]: elementKit.styles[screen],
        },
      })),
      ...(rootContextEffect
        ? [rootContextEffect]
        : [{
          type: PebContextSchemaEffect.Update,
          target: `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
          payload: elementKit.contextSchema ? { [elementId]: elementKit.contextSchema } : null,
        }]
      ),
    ],
  };
}

export function makePasteElementAction(
  page: PebPageShort,
  parentId: PebElementId,
  elementKit: PebElementKit,
  childIds: PebElementId[],
  currentScreen: PebScreen,
  beforeId?: PebElementId,
): any[] {
  const elementId = elementKit.element.id;

  const appendElementPayload = [];
  const appendStylePayload = [];

  const genChildIds = childIds.map((id: PebElementId) => ({ prevId: id, id: pebGenerateId() }))

  Object.values(PebScreen).map((screen: PebScreen) => {
    const stylesPayload = {};
    if (elementKit.element.type !== PebElementType.Document) {
      const styleElementId =  elementKit.prevId || elementId;
      stylesPayload[elementId] = currentScreen === screen
        ? elementKit.styles[screen][styleElementId]
        : { display: 'none' };
      appendStylePayload.push({
        type: PebStylesheetEffect.Update,
        target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
        payload: stylesPayload,
      })
    }

    genChildIds.forEach((childId) => {
      stylesPayload[childId.id] = currentScreen === screen
        ? elementKit.styles[screen][childId.prevId]
        : { display: 'none' };
      appendStylePayload.push({
        type: PebStylesheetEffect.Update,
        target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
        payload: stylesPayload,
      });
    });

    appendStylePayload.push({
      type: PebStylesheetEffect.Update,
      target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
      payload: stylesPayload,
    });
  });
  // Clean up inner elements from renderer
  elementKit.element = pebMapElementDeep(elementKit.element, (el) => {
    const newId = genChildIds.find((ids) => ids.prevId === el.id);
    const newElementKit = {
      id: newId ? newId.id : el.id,
      type: el.type,
      data: el.data || null,
      meta: el.meta || null,
      children: el.children || [],
    };

    if (newElementKit?.meta?.deletable) {
      newElementKit.meta.deletable = false;
    }

    return newElementKit;
  });
  if (elementKit.element.type === PebElementType.Document) {
    // Paste only inner elements of document
    elementKit.element.children.forEach((child) => {
      appendElementPayload.push({
        type: PebTemplateEffect.AppendElement,
        target: `${PebEffectTarget.Templates}:${page.templateId}`,
        payload: getPayload(
          parentId, {
          element: child,
          styles: null,
          contextSchema: null,
        },
          beforeId),
      });
    });
  } else {
    appendElementPayload.push({
      type: PebTemplateEffect.AppendElement,
      target: `${PebEffectTarget.Templates}:${page.templateId}`,
      payload: getPayload(parentId, elementKit, beforeId),
    });
  }

  return [
    ...appendElementPayload,
    ...appendStylePayload,
    {
      type: PebContextSchemaEffect.Update,
      target: `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
      payload: elementKit.contextSchema ? { [elementId]: elementKit.contextSchema } : null,
    },
  ];
}

// TODO: Here we should receive only ids of elements we want to delete
export function makeDeleteElementAction(
  page: PebPageShort,
  widgets: PebDeleteElement[] | PebElementKit[],
  snapshot: PebShopThemeSnapshotEntity,
  currentScreen: PebScreen,
): PebAction {
  const action = {
    id: pebGenerateId('action'),
    targetPageId: page.id,
    affectedPageIds: [page.id],
    createdAt: new Date(),
    effects: [],
  };
  widgets.forEach(({ element }) => {

    let updateThemeContextEffect: any;
    if (element.type === PebElementType.Logo) {
      const shopContextSchema = snapshot.contextSchemas[snapshot.shop.contextId];
      const logoContext: any = shopContextSchema['#logo']; // TODO: fix typings
      const nextUsedBy = logoContext.usedBy.filter(id => id !== element.id);

      updateThemeContextEffect = nextUsedBy.length
        ? {
          type: PebContextSchemaEffect.Update,
          target: `${PebEffectTarget.ContextSchemas}:${snapshot.shop.contextId}`,
          payload: {
            ['#logo']: {
              ...logoContext,
              usedBy: nextUsedBy,
            },
          },
        }
        : {
          type: PebContextSchemaEffect.Delete,
          target: `${PebEffectTarget.ContextSchemas}:${snapshot.shop.contextId}`,
          payload: '#logo',
        };
    }

    if (element) {
      const elementId = element.id;
      const isRemovedFromOtherScreens = Object.values(PebScreen)
        .filter(screen => screen !== currentScreen)
        .reduce((removedFromOtherScreens: boolean, scr: string) => (
          removedFromOtherScreens && snapshot.stylesheets[page.stylesheetIds[scr]][elementId].display === 'none'
        ), true);

      const effects = isRemovedFromOtherScreens
        ? [
          {
            type: PebTemplateEffect.DeleteElement,
            target: `${PebEffectTarget.Templates}:${page.templateId}`,
            payload: elementId,
          },
          ...Object.values(PebScreen).map(screen => ({
            type: PebStylesheetEffect.Delete,
            target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[screen]}`,
            payload: elementId,
          })),
          {
            type: PebContextSchemaEffect.Delete,
            target: `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
            payload: elementId,
          },
          ...(updateThemeContextEffect ? [updateThemeContextEffect] : []),
        ]
        : [
          {
            type: PebStylesheetEffect.Update,
            target: `${PebEffectTarget.Stylesheets}:${page.stylesheetIds[currentScreen]}`,
            payload: {
              [elementId]: {
                display: 'none',
              },
            },
          },
        ];

      action.effects.push(...effects);
    }
  });

  return action;
}

export function extractPageFromSnapshot(
  snapshot: PebShopThemeSnapshotEntity,
  pageId: PebPageId,
): PebPage {
  const page = snapshot.pages[pageId];
  const template = snapshot.templates[page.templateId];

  const stylesheets = fromPairs(
    Object.entries(PebScreen).map(([key, screen]) =>
      [screen, snapshot.stylesheets[page.stylesheetIds[screen]]],
    ),
  );
  const context = snapshot.contextSchemas[page.contextId];

  return {
    id: page.id,
    name: page.name,
    variant: page.variant,
    type: page.type,
    master: page.master,
    data: page.data,
    template,
    stylesheets,
    context,
  };
}

export function extractPageActionsFromSnapshot(
  source: PebShopThemeSource,
  snapshot: PebShopThemeSnapshotEntity, pageId: PebPageId,
) {
  const page = snapshot.pages[pageId];

  const effectTargets = [
    `${PebEffectTarget.Pages}:${page.id}`,
    `${PebEffectTarget.Templates}:${page.templateId}`,
    ...Object.values(page.stylesheetIds).map(sid =>
      `${PebEffectTarget.Stylesheets}:${sid}`,
    ),
    `${PebEffectTarget.ContextSchemas}:${page.contextId}`,
  ];

  return source.actions.filter(a =>
    a.effects.find(e => effectTargets.includes(e.target)),
  );
}

export function getPayload(
  parentId: PebElementId,
  elementKit: PebElementKit,
  beforeId?: PebElementId,
) {
  const payload: PebAppendElementPayload = {
    to: parentId,
    element: elementKit.element,
  };
  if (beforeId) {
    payload.before = beforeId;
  }
  return payload;
}

export function getShopThemeRoutingPayload(
  routes: PebChangeShopRouting[],
  payload: PebShopRoute[],
) {
  const addUpdateRoutes = [];
  routes.forEach((newRoute: PebChangeShopRouting) => {
    const shopRouteInd = payload.findIndex((route) => route.pageId === newRoute.pageId);
    if (newRoute.currentUrl) {
      if (shopRouteInd > -1) {
        // Update route
        payload[shopRouteInd].url = newRoute.currentUrl;
      } else {
        // Add a new route
        addUpdateRoutes.push({
          routeId: pebGenerateId(),
          pageId: newRoute.pageId,
          url: newRoute.currentUrl,
        });
      }
    } else if (shopRouteInd > -1) {
      // Delete route
      payload.splice(shopRouteInd, 1);
    }
  });
  return [
    ...payload,
    ...addUpdateRoutes,
  ];
}

export function setSnapshotDefaultRoutes(snapshot: any): PebShop {
  const pageNamesCount = {};
  Object.keys(snapshot.pages).forEach((pageId: string) => {
    pageNamesCount[snapshot.pages[pageId].name]
      ? pageNamesCount[snapshot.pages[pageId].name]++
      : (pageNamesCount[snapshot.pages[pageId].name] = 1);
  });
  Object.keys(snapshot.pages).forEach((pageId: string) => {
    const route = snapshot.routing.find(
      route => route.pageId === snapshot.pages[pageId].id,
    );
    if (!route) {
      snapshot.routing.push({
        routeId: pebGenerateId(),
        pageId: snapshot.pages[pageId].id,
        url:
          '/' +
          snapshot.pages[pageId].name.toLowerCase().replace(' ', '-') +
          '-' +
          pageNamesCount[snapshot.pages[pageId].name],
      });
    }
  });

  return snapshot;
}

/* tslint:enable:member-ordering */
