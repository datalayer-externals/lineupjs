/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import * as model_ from './model';
import * as provider_ from './provider';
import ADataProvider from './provider/ADataProvider';
import * as renderer_ from './renderer';
import './style.scss';
import * as ui_ from './ui';
import LineUp, {ILineUpOptions} from './ui/LineUp';
import Taggle, {ITaggleOptions} from './ui/taggle';

export {deriveColors} from './provider/utils';
export {deriveColumnDescriptions} from './provider';
export {default as LocalDataProvider} from './provider/LocalDataProvider';
export {default as LineUp, ILineUpOptions} from './ui/LineUp';
export {default as Taggle, ITaggleOptions} from './ui/taggle';
/**
 * access to the model module
 */
export const model = model_;
/**
 * access to the provider module
 */
export const provider = provider_;
/**
 * access to the renderer module
 */
export const renderer = renderer_;
/**
 * access to the ui module
 */
export const ui = ui_;

declare const __VERSION__: string;
declare const __BUILD_ID__: string;
export const version = __VERSION__;
export const buildId = __BUILD_ID__;

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalDataProvider(data: any[], columns: model_.IColumnDesc[], options: Partial<provider_.ILocalDataProviderOptions> = {}) {
  return new provider_.LocalDataProvider(data, columns, options);
}

export function createLineUp(container: HTMLElement, data: provider_.DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
