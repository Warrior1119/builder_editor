import { PebAction } from './action';
import { PebContextSchema, PebContextSchemaId, PebPage, PebPageId, PebShop, PebShopId, PebStylesheet, PebTemplate } from './client';
import {
  PebPageShort,
  PebShopThemeId,
  PebShopThemeSnapshotId, PebShopThemeSource,
  PebShopThemeSourceId,
  PebShopThemeVersionId,
} from './editor';

//
// Data structures required by editor
//
export interface PebShopThemeEntity {
  id: PebShopThemeId;
  name: string;
  picture: string;
  sourceId: PebShopThemeSourceId;
  versionsIds: PebShopThemeVersionId[];
  publishedId: null | PebShopThemeVersionId;
}

export interface PebShopThemeVersionEntity {
  id: PebShopThemeVersionId;
  name: string;
  sourceId: PebShopThemeSourceId;
  result: PebShop;
  createdAt: Date;
  published: boolean;
  description: string;
}

export interface PebShopThemeSourcePagePreviews {
  [key: string/*PebPageId*/]: {
    actionId: string;
    previewUrl: string;
  };
}

export interface PebShopThemeSourceEntity {
  id: PebShopThemeSourceId;
  hash: string;
  actions: PebAction[];
  snapshotId: PebShopThemeSnapshotId;
  previews: PebShopThemeSourcePagePreviews;
}

export interface PebShopThemeSnapshotEntity {
  id: PebShopThemeSnapshotId;
  hash: string;
  shop: PebShopEntity;
  pages: {
    [key: string]: PebPageShort,
  };
  templates: {
    [key: string]: PebTemplate,
  };
  stylesheets: {
    [key: string]: PebStylesheet,
  };
  contextSchemas: {
    [key: string]: PebContextSchema,
  };
}

//
// Data required by shop client to actually render shop
//
export interface PebShopRoute {
  routeId: string;
  url: string;
  pageId: PebPageId;
}

export interface PebShopEntity {
  id: PebShopId;
  frontPage: PebPageId;
  routing: PebShopRoute[];
  contextId: PebContextSchemaId;
  pages: PebPageId[];
}

export type PebPageEntity = PebPage;

export interface PebShopImageResponse {
  blobName: string;
  brightnessGradation: string;
  preview: string
}

export interface PebShopGeneratedThemeResponse {
  category: string;
  page: string;
  theme: string;
  themeId: string;
  createdAt: Date;
  updatedAt: Date;
}
