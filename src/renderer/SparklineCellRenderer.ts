import ICellRendererFactory from './ICellRendererFactory';
import {INumbersColumn} from '../model/NumbersColumn';
import {ICanvasRenderContext} from './RendererContexts';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import Column from '../model/Column';
import {matchRows} from './ANumbersCellRenderer';
import {forEachChild} from '../utils';
import {IGroup} from '../model/Group';
import {isMissingValue} from '../model/missing';

export function line(data: number[]) {
  if (data.length === 0) {
    return '';
  }
  const first = data[0];
  return `M0,${1 - first} ${data.slice(1).map((d, i) => `L${i + 1},${1 - d}`).join(' ')}`;
}

export default class SparklineCellRenderer implements ICellRendererFactory {

  createDOM(col: INumbersColumn & Column): IDOMCellRenderer {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength() - 1} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const data = col.getNumbers(d.v, d.dataIndex);
        if(data.some((v) => isNaN(v))) {
          n.querySelector('path')!.setAttribute('d', '');
        } else {
          n.querySelector('path')!.setAttribute('d', line(data));
        }
      }
    };
  }

  createCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasCellRenderer {
    return (ctx: CanvasRenderingContext2D, d: IDataRow, i: number) => {
      const data = col.getNumbers(d.v, d.dataIndex);
      if (data.length === 0) {
        return;
      }
      ctx.save();
      const w = context.colWidth(col) / (col.getDataLength()-1);
      const h = context.rowHeight(i);

      ctx.strokeStyle = '#c1c1c1';
      ctx.beginPath();
      ctx.moveTo(0, 1 - col.getMapping().apply(col.getThreshold()));
      ctx.lineTo(w * (data.length-1), h);
      ctx.stroke();

      ctx.strokeStyle = 'black';
      ctx.beginPath();
      ctx.moveTo(0, (1 - data[0]) * h);
      for (let i = 1; i < data.length; ++i) {
        ctx.lineTo(i * w, (1 - data[i]) * h);
      }
      ctx.stroke();
      ctx.restore();
    };
  }

  createGroupDOM(col: INumbersColumn & Column): IDOMGroupRenderer {
    const yPos = 1 - col.getMapping().apply(col.getThreshold());
    return {
      template: `<svg viewBox="0 0 ${col.getDataLength()} 1" preserveAspectRatio="none meet"><line x1="0" x2="${col.getDataLength() - 1}" y1="${yPos}" y2="${yPos}"></line><path></path></svg>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        //overlapping ones
        matchRows(n, rows, `<path></path>`);
        forEachChild(n, ((row, i) => {
          const d = rows[i];
          row.setAttribute('d', line(col.getNumbers(d.v, d.dataIndex)));
        }));
      }
    };
  }

  createGroupCanvas(col: INumbersColumn & Column, context: ICanvasRenderContext): ICanvasGroupRenderer {
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[]) => {
      //overlapping ones
      const groupHeight = context.groupHeight(group);
      ctx.save();
      ctx.scale(context.colWidth(col) / col.getDataLength(), groupHeight);

      ctx.strokeStyle = '#c1c1c1';
      ctx.beginPath();
      ctx.moveTo(0, 1 - col.getMapping().apply(col.getThreshold()));
      ctx.lineTo(context.colWidth(col) / col.getDataLength(), groupHeight);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';

      rows.forEach((d) => {
        const data = col.getNumbers(d.v, d.dataIndex);
        if (data.length === 0) {
          return;
        }
        ctx.beginPath();
        ctx.moveTo(0, 1 - data[0]);
        for (let i = 1; i < data.length; ++i) {
          ctx.lineTo(i, 1 - data[i]);
        }
        ctx.stroke();
      });
      ctx.restore();
    };
  }
}
