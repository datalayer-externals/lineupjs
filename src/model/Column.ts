import AEventDispatcher from '../internal/AEventDispatcher';
import {similar} from '../internal/math';
import {fixCSS} from '../internal/utils';
import {defaultGroup} from './Group';
import {IColumnDesc, IDataRow, IGroupData} from './interfaces';
import {isMissingValue} from './missing';
import Ranking, {ISortCriteria} from './Ranking';

export {IColumnDesc} from './interfaces';

export interface IFlatColumn {
  readonly col: Column;
  readonly offset: number;
  readonly width: number;
}

export interface IColumnParent {
  remove(col: Column): boolean;

  insert(col: Column, index?: number): Column | null;

  insertAfter(col: Column, reference: Column): Column | null;

  move(col: Column, index?: number): Column | null;

  moveAfter(col: Column, reference: Column): Column | null;

  findMyRanker(): Ranking | null;

  readonly fqid: string;

  indexOf(col: Column): number;

  at(index: number): Column;

  readonly fqpath: string;

}


export interface IColumnMetaData {
  label: string;
  description: string;
  color: string | null;
}

/**
 * a column in LineUp
 */
export default class Column extends AEventDispatcher {
  /**
   * default color that should be used
   * @type {string}
   */
  static readonly DEFAULT_COLOR = '#C1C1C1';
  /**
   * magic variable for showing all columns
   * @type {number}
   */
  static readonly FLAT_ALL_COLUMNS = -1;

  static readonly EVENT_WIDTH_CHANGED = 'widthChanged';
  static readonly EVENT_FILTER_CHANGED = 'filterChanged';
  static readonly EVENT_LABEL_CHANGED = 'labelChanged';
  static readonly EVENT_METADATA_CHANGED = 'metaDataChanged';
  static readonly EVENT_ADD_COLUMN = 'addColumn';
  static readonly EVENT_MOVE_COLUMN = 'moveColumn';
  static readonly EVENT_REMOVE_COLUMN = 'removeColumn';
  static readonly EVENT_DIRTY = 'dirty';
  static readonly EVENT_DIRTY_HEADER = 'dirtyHeader';
  static readonly EVENT_DIRTY_VALUES = 'dirtyValues';
  static readonly EVENT_RENDERER_TYPE_CHANGED = 'rendererTypeChanged';
  static readonly EVENT_GROUP_RENDERER_TYPE_CHANGED = 'groupRendererChanged';
  static readonly EVENT_SUMMARY_RENDERER_TYPE_CHANGED = 'summaryRendererChanged';
  static readonly EVENT_SORTMETHOD_CHANGED = 'sortMethodChanged';
  static readonly EVENT_GROUPING_CHANGED = 'groupingChanged';
  static readonly EVENT_DATA_LOADED = 'dataLoaded';

  /**
   * the id of this column
   */
  private uid: string;

  /**
   * width of the column
   * @type {number}
   * @private
   */
  private width: number = 100;

  /**
   * parent column of this column, set when added to a ranking or combined column
   */
  parent: Readonly<IColumnParent> | null = null;

  private metadata: Readonly<IColumnMetaData>;
  private renderer: string;
  private groupRenderer: string;
  private summaryRenderer: string;


  constructor(id: string, public readonly desc: Readonly<IColumnDesc>) {
    super();
    this.uid = fixCSS(id);
    this.renderer = this.desc.renderer || this.desc.type;
    this.groupRenderer = this.desc.groupRenderer || this.desc.type;
    this.summaryRenderer = this.desc.summaryRenderer || this.desc.type;
    this.width = this.desc.width != null && this.desc.width >= 0 ? this.desc.width : 100;

    this.metadata = {
      label: desc.label || this.id,
      description: desc.description || '',
      color: desc.color || Column.DEFAULT_COLOR
    };
  }

  get frozen() {
    return Boolean(this.desc.frozen);
  }

  get id() {
    return this.uid;
  }

  assignNewId(idGenerator: () => string) {
    this.uid = fixCSS(idGenerator());
  }

  get label() {
    return this.metadata.label;
  }

  get description() {
    return this.metadata.description;
  }

  get color() {
    return this.metadata.color;
  }

  /**
   * returns the fully qualified id i.e. path the parent
   * @returns {string}
   */
  get fqid() {
    return this.parent ? `${this.parent.fqid}_${this.id}` : this.id;
  }

  get fqpath() {
    return this.parent ? `${this.parent.fqpath}@${this.parent.indexOf(this)}` : '';
  }

  /**
   * list of events
   * fires:
   *  * widthChanged
   *  * filterChanged
   *  * labelChanged
   *  * metaDataChanged
   *  * compressChanged
   *  * addColumn, removeColumn ... for composite pattern
   *  * dirty, dirtyHeader, dirtyValues
   * @returns {string[]} the list of events
   */
  protected createEventList() {
    return super.createEventList().concat([Column.EVENT_WIDTH_CHANGED, Column.EVENT_FILTER_CHANGED,
      Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
      Column.EVENT_ADD_COLUMN, Column.EVENT_REMOVE_COLUMN, Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, Column.EVENT_SORTMETHOD_CHANGED, Column.EVENT_MOVE_COLUMN,
      Column.EVENT_DIRTY, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_GROUPING_CHANGED, Column.EVENT_DATA_LOADED]);
  }

  getWidth() {
    return this.width;
  }

  /**
   * a column is hidden if it has no width
   * @return {boolean} whether the column is hidden
   */
  isHidden() {
    return this.width <= 0;
  }

  hide() {
    return this.setWidth(0);
  }

  /**
   * visitor pattern for flattening the columns
   * @param {IFlatColumn} r the result array
   * @param {number} offset left offset
   * @param {number} _levelsToGo how many levels down
   * @param {number} _padding padding between columns
   * @returns {number} the used width by this column
   */
  flatten(r: IFlatColumn[], offset: number, _levelsToGo = 0, _padding = 0): number {
    const w = this.getWidth();
    r.push({col: this, offset, width: w});
    return w;
  }

  setWidth(value: number) {
    if (similar(this.width, value, 0.5)) {
      return;
    }
    this.fire([Column.EVENT_WIDTH_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.width, this.width = value);
  }

  setWidthImpl(value: number) {
    this.width = value;
  }

  setMetaData(value: Readonly<IColumnMetaData>) {
    if (value.label === this.label && this.color === value.color && this.description === value.description) {
      return;
    }
    const events = this.color === value.color ?
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY] :
      [Column.EVENT_LABEL_CHANGED, Column.EVENT_METADATA_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY];
    const bak = this.getMetaData();
    //copy to avoid reference
    this.metadata = {
      label: value.label,
      color: value.color,
      description: value.description
    };

    this.fire(events, bak, this.getMetaData());
  }

  getMetaData(): Readonly<IColumnMetaData> {
    return {
      label: this.label,
      color: this.color,
      description: this.description
    };
  }

  /**
   * triggers that the ranking is sorted by this column
   * @param ascending ascending order?
   * @returns {boolean} was successful
   */
  sortByMe(ascending = false) {
    const r = this.findMyRanker();
    if (r) {
      return r.sortBy(this, ascending);
    }
    return false;
  }

  groupByMe(): boolean {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleGrouping(this);
    }
    return false;
  }

  /**
   *
   * @return {number}
   */
  isGroupedBy(): number {
    const r = this.findMyRanker();
    if (!r) {
      return -1;
    }
    return r.getGroupCriteria().indexOf(this);
  }

  /**
   * toggles the sorting order of this column in the ranking
   * @returns {boolean} was successful
   */
  toggleMySorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleSorting(this);
    }
    return false;
  }

  private isSortedByMeImpl(selector: ((r: Ranking) => ISortCriteria[])): { asc: 'asc' | 'desc' | undefined, priority: string | undefined } {
    const ranker = this.findMyRanker();
    if (!ranker) {
      return {asc: undefined, priority: undefined};
    }
    const criterias = selector(ranker);
    const index = criterias.findIndex((c) => c.col === this);
    if (index < 0) {
      return {asc: undefined, priority: undefined};
    }
    return {
      asc: criterias[index].asc ? 'asc' : 'desc',
      priority: index.toString()
    };
  }

  isSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getSortCriterias());
  }

  groupSortByMe(ascending = false) {
    const r = this.findMyRanker();
    if (r) {
      return r.groupSortBy(this, ascending);
    }
    return false;
  }

  toggleMyGroupSorting() {
    const r = this.findMyRanker();
    if (r) {
      return r.toggleGroupSorting(this);
    }
    return false;
  }

  isGroupSortedByMe() {
    return this.isSortedByMeImpl((r) => r.getGroupSortCriteria());
  }

  /**
   * removes the column from the ranking
   * @returns {boolean} was successful
   */
  removeMe() {
    if (this.parent) {
      return this.parent.remove(this);
    }
    return false;
  }

  /**
   * inserts the given column after itself
   * @param col the column to insert
   * @returns {boolean} was successful
   */
  insertAfterMe(col: Column) {
    if (this.parent) {
      return this.parent.insertAfter(col, this) != null;
    }
    return false;
  }

  /**
   * finds the underlying ranking column
   * @returns {Ranking|null} my current ranking
   */
  findMyRanker(): Ranking | null {
    if (this.parent) {
      return this.parent.findMyRanker();
    }
    return null;
  }

  /**
   * dumps this column to JSON compatible format
   * @param toDescRef helper mapping function
   * @returns {any} dump of this column
   */
  dump(toDescRef: (desc: any) => any): any {
    const r: any = {
      id: this.id,
      desc: toDescRef(this.desc),
      width: this.width
    };
    if (this.label !== (this.desc.label || this.id)) {
      r.label = this.label;
    }
    if (this.color !== ((<any>this.desc).color || Column.DEFAULT_COLOR) && this.color) {
      r.color = this.color;
    }
    if (this.getRenderer() !== this.desc.type) {
      r.renderer = this.getRenderer();
    }
    if (this.getGroupRenderer() !== this.desc.type) {
      r.groupRenderer = this.getGroupRenderer();
    }
    if (this.getSummaryRenderer() !== this.desc.type) {
      r.summaryRenderer = this.getSummaryRenderer();
    }
    return r;
  }

  /**
   * restore the column content from a dump
   * @param dump column dump
   * @param _factory helper for creating columns
   */
  restore(dump: any, _factory: (dump: any) => Column | null) {
    this.width = dump.width || this.width;
    this.metadata = {
      label: dump.label || this.label,
      color: dump.color || this.color,
      description: this.description
    };
    if (dump.renderer || dump.rendererType) {
      this.renderer = dump.renderer || dump.rendererType;
    }
    if (dump.groupRenderer) {
      this.groupRenderer = dump.groupRenderer;
    }
    if (dump.summaryRenderer) {
      this.summaryRenderer = dump.summaryRenderer;
    }
  }

  /**
   * return the label of a given row for the current column
   * @param row the current row
   * @return {string} the label of this column at the specified row
   */
  getLabel(row: IDataRow): string {
    return String(this.getValue(row));
  }

  /**
   * return the value of a given row for the current column
   * @param _row the current row
   * @return the value of this column at the specified row
   */
  getValue(_row: IDataRow): any {
    return ''; //no value
  }

  isMissing(row: IDataRow) {
    return isMissingValue(this.getValue(row));
  }

  /**
   * compare function used to determine the order according to the values of the current column
   * @param _a first element
   * @param _b second element
   * @return {number}
   */
  compare(_a: IDataRow, _b: IDataRow) {
    return 0; //can't compare
  }

  /**
   * group the given row into a bin/group
   * @param _row
   * @return {IGroup}
   */
  group(_row: IDataRow) {
    return defaultGroup;
  }

  /**
   * compares groups
   * @param {IGroupData} a
   * @param {IGroupData} b
   * @return {number}
   */
  groupCompare(a: IGroupData, b: IGroupData) {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }

  /**
   * flag whether any filter is applied
   * @return {boolean}
   */
  isFiltered() {
    return false;
  }

  /**
   * predicate whether the current row should be included
   * @param row
   * @return {boolean}
   */
  filter(row: IDataRow) {
    return row != null;
  }

  /**
   * determines the renderer type that should be used to render this column. By default the same type as the column itself
   * @return {string}
   */
  getRenderer(): string {
    return this.renderer;
  }

  getGroupRenderer(): string {
    return this.groupRenderer;
  }

  getSummaryRenderer(): string {
    return this.summaryRenderer;
  }

  setRenderer(renderer: string) {
    if (renderer === this.renderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.renderer, this.renderer = renderer);
  }

  protected setDefaultRenderer(renderer: string) {
    if (this.renderer !== this.desc.type) {
      return;
    }
    return this.setRenderer(renderer);
  }

  setGroupRenderer(renderer: string) {
    if (renderer === this.groupRenderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.groupRenderer, this.groupRenderer = renderer);
  }

  protected setDefaultGroupRenderer(renderer: string) {
    if (this.groupRenderer !== this.desc.type) {
      return;
    }
    return this.setGroupRenderer(renderer);
  }

  setSummaryRenderer(renderer: string) {
    if (renderer === this.summaryRenderer) {
      // nothing changes
      return;
    }
    this.fire([Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY], this.summaryRenderer, this.summaryRenderer = renderer);
  }

  protected setDefaultSummaryRenderer(renderer: string) {
    if (this.summaryRenderer !== this.desc.type) {
      return;
    }
    return this.setSummaryRenderer(renderer);
  }

  protected setDefaultWidth(width: number) {
    if (this.width !== 100) {
      return;
    }
    return this.setWidthImpl(width);
  }
}
