/**
 * Created by Samuel Gratzl on 05.09.2017.
 */
import Column from '../../model/Column';
import {IRankingHeaderContext, toFullTooltip} from '../engine/RenderColumn';
import createSummary from '../engine/summary';
import {createToolbar} from '../engine/header';


export default class SidePanelEntryVis {
  readonly node: HTMLElement;

  constructor(public readonly column: Column, private ctx: IRankingHeaderContext, document: Document) {
    this.node = document.createElement('article');
    this.node.dataset.type = column.desc.type;

    this.column.on(`${Column.EVENT_FILTER_CHANGED}.panel, ${Column.EVENT_DIRTY_HEADER}.panel`, () => {
      this.update();
    });
    this.init();
    this.update();
  }

  private init() {
    this.node.innerHTML = `
      <header><i class="lu-sort"></i><h2 class="lu-label"></h2><div class="lu-toolbar"></div></header>
      <main class="lu-summary"></main>`;
    createToolbar(<HTMLElement>this.node.querySelector('.lu-toolbar'), this.column, this.ctx);
  }

  update(ctx: IRankingHeaderContext = this.ctx) {
    this.ctx = ctx;
    this.node.querySelector('.lu-label')!.textContent = this.column.label;
    this.node.title = toFullTooltip(this.column);

    createSummary(<HTMLElement>this.node.querySelector('.lu-summary')!, this.column, this.ctx, true);
  }

  destroy() {
    this.column.on(`${Column.EVENT_FILTER_CHANGED}.panel, ${Column.EVENT_DIRTY_HEADER}.panel`, null);
    this.node.remove();
  }
}
