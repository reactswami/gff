import _ from 'lodash';
import moment from 'moment-timezone';
import kbn from 'app/core/utils/kbn';
import { escapeHtml } from 'app/core/utils/text';

declare const dashboard_data: any;
const _drillDown = kbn.drilldown;

export class TableRenderer {
  formatters: any[];
  colorState: any;

  constructor(
    private panel,
    private table,
    private isUtc,
    private sanitize,
    private templateSrv,
    private linkSrv
  ) {
    this.initColumns();
  }

  setTable(table) {
    this.table = table;

    this.initColumns();
  }

  initColumns() {
    this.formatters = [];
    this.colorState = {};

    for (let colIndex = 0; colIndex < this.table.columns.length; colIndex++) {
      const column = this.table.columns[colIndex];
      column.title = column.text;

      for (let i = 0; i < this.panel.styles.length; i++) {
        const style = this.panel.styles[i];
        if (style.pattern === column.text) {
          column.style = style;

          if (style.alias) {
            column.title = style.alias;
          }

          break;
        } else {
          const regex = kbn.stringToJsRegex(style.pattern);
          if (column?.text?.match(regex)) {
            column.style = style;

            if (style.alias) {
              column.title = column.text.replace(regex, style.alias);
            }

            break;
          }
        }
      }

      this.formatters[colIndex] = this.createColumnFormatter(column);
    }
  }

  defaultCellFormatter(v, style) {
    if (v === null || v === void 0 || v === undefined) {
      return '';
    }

    if (_.isArray(v)) {
      v = v.join(', ');
    }

    if (style && style.sanitize) {
      return this.sanitize(v);
    } else {
      return _.escape(v);
    }
  }

  createColumnFormatter(column) {
    if (!column.style) {
      return this.defaultCellFormatter;
    }

    if (column.style.type === 'hidden') {
      return v => {
        return undefined;
      };
    }

    if (column.style.type === 'date') {
      return v => {
        if (v === undefined || v === null) {
          return '-';
        }

        if (_.isArray(v)) {
          v = v[0];
        }
        let date = moment.tz(moment.unix(v), dashboard_data.timezone);
        if (this.isUtc) {
          date = date.utc();
        }
        return date.format(column.style.dateFormat);
      };
    }

    if (column.style.type === 'string') {
      return v => {
        if (_.isArray(v)) {
          v = v.join(', ');
        }

        /* Run the value mapping first */
        let value = v;
        for (let i = column.style.coloring.length - 1; i >= 0; i--) {
          const c = column.style.coloring[i];
          const tem = this.templateSrv;
          value = tem.replace(String(value));

          if (c.type === 'range') {
            if (v === null) {
              /* Special case to match null */
              if (c.from === 'null' && c.to === 'null') {
                value = tem.replace(String(c.text));
                break;
              }
            } else {
              const from = c.from && tem.replace(String(c.from));
              const to = c.to && tem.replace(String(c.to));
              if ((c.from === '' || Number(from) <= Number(v)) && (c.to === '' || Number(to) >= Number(v))) {
                value = tem.replace(String(c.text));
                break;
              }
            }
          } else if (c.type === 'valuemap') {
            if (v === null) {
              /* Special case to match null */
              if (c.from === 'null') {
                value = tem.replace(String(c.text));
                break;
              }
              continue;
            }

            // Allow both numeric and string values to be mapped
            const from = c.from && tem.replace(String(c.from));
            if ((!_.isString(v) && Number(from) === Number(v)) || c.from === v) {
              value = tem.replace(String(c.text));
              break;
            }
          }
        }

        this.setColorState(v, value, column.style);

        if (value === null || value === void 0) {
          return '-';
        }

        return this.defaultCellFormatter(value, column.style);
      };
    }

    if (column.style.type === 'number') {
      const valueFormatter = kbn.valueFormats[column.unit || column.style.unit];

      return v => {
        if (v === null || v === void 0) {
          return '-';
        }

        if (_.isString(v) || _.isArray(v)) {
          return this.defaultCellFormatter(v, column.style);
        }

        this.setColorState(v, null, column.style);
        return valueFormatter(v, column.style.decimals, null);
      };
    }

    return value => {
      return this.defaultCellFormatter(value, column.style);
    };
  }

  setColorState(value, mappedValue, style) {
    if (!style.coloring) {
      return;
    }

    const tem = this.templateSrv;

    for (const c of style.coloring) {
      if (c.type === 'range') {
        const from = c.from && tem.replace(String(c.from));
        const to = c.to && tem.replace(String(c.to));
        if ((c.from === '' || Number(from) <= Number(value)) && (c.to === '' || Number(to) >= Number(value))) {
          this.colorState[c.mode] = c.color;
        }
      } else if (c.type === 'valuemap') {
        const from = c.from && tem.replace(String(c.from));
        if ((!_.isString(value) && Number(from) === Number(value)) || from === value) {
          this.colorState[c.mode] = c.color;
        }
      } else if (c.type === 'regex') {
        const regex = kbn.stringToJsRegex(tem.replace(String(c.text)));
        const v = mappedValue || value;
        if (v && v.toString().match(regex)) {
          this.colorState[c.mode] = c.color;
        }
      }
    }
  }

  renderRowVariables(rowIndex) {
    const scopedVars = {};
    let cellVariable;
    const row = this.table.rows[rowIndex];
    for (let i = 0; i < row.length; i++) {
      cellVariable = `__cell_${i}`;
      scopedVars[cellVariable] = { value: row[i] };
    }
    return scopedVars;
  }

  formatColumnValue(colIndex, value) {
    return this.formatters[colIndex] ? this.formatters[colIndex](value) : value;
  }

  renderCell(columnIndex, rowIndex, value, addWidthHack = false) {
    value = this.formatColumnValue(columnIndex, value);
    const tem = this.templateSrv;
    value = tem.replace(value);

    const column = this.table.columns[columnIndex];
    let cellStyle = '';
    let textStyle = '';
    let tdStyle = '';
    const cellClasses = [];
    let cellClass = '';

    if (this.colorState.cell) {
      cellStyle = 'background-color:' + this.colorState.cell + ';';
      cellClasses.push('table-panel-color-cell');
      this.colorState.cell = null;
    }
    if (this.colorState.value) {
      textStyle = 'color:' + this.colorState.value + ';';
      this.colorState.value = null;
    }
    // because of the fixed table headers css only solution
    // there is an issue if header cell is wider the cell
    // this hack adds header content to cell (not visible)
    let columnHtml = '';
    if (addWidthHack) {
      columnHtml =
        '<div class="table-panel-width-hack">' + escapeHtml(this.table.columns[columnIndex].title) + '</div>';
    }

    if (value === undefined) {
      cellStyle = 'display:none;';
      column.hidden = true;
    } else {
      column.hidden = false;
    }

    if (column.hidden === true) {
      return '';
    }

    if (column.style && column.style.preserveFormat) {
      cellClasses.push('table-panel-cell-pre');
    }

    if (column.style && column.style.link) {
      // Render cell as link
      const scopedVars = this.renderRowVariables(rowIndex);
      scopedVars['__cell'] = { value: value };
      const cellLink = _drillDown.getDrilldownLink(undefined, column.style, this.linkSrv ,scopedVars);
      const cellLinkTooltip = column.style.linkTooltip ? escapeHtml(this.templateSrv.replace(column.style.linkTooltip, scopedVars)) : '';
      const cellTarget = column.style.linkTargetBlank ? '_blank' : '';

      cellClasses.push('table-panel-cell-link');

      columnHtml += `
        <a href="${cellLink}"
           target="${cellTarget}"
           data-link-tooltip
           data-original-title="${cellLinkTooltip}"
           data-placement="right"
           style="${textStyle}">
          ${value}
        </a>
      `;
    } else {
      columnHtml += value;
    }

    if (column.filterable) {
      cellClasses.push('table-panel-cell-filterable');
      columnHtml += `
        <a class="table-panel-filter-link" data-link-tooltip data-original-title="Filter out value" data-placement="bottom"
           data-row="${rowIndex}" data-column="${columnIndex}" data-operator="!=">
          <i class="fa fa-search-minus"></i>
        </a>
        <a class="table-panel-filter-link" data-link-tooltip data-original-title="Filter for value" data-placement="bottom"
           data-row="${rowIndex}" data-column="${columnIndex}" data-operator="=">
          <i class="fa fa-search-plus"></i>
        </a>`;
    }

    if (cellClasses.length) {
      cellClass = 'class="' + cellClasses.join(' ') + '"';
    }

    if (cellStyle || textStyle) {
      tdStyle = 'style="' + cellStyle + textStyle + '"';
    }

    columnHtml = `<td ${cellClass} ${tdStyle}>${columnHtml}</td>`;
    return columnHtml;
  }

  render(page) {
    const pageSize = this.panel.pageSize || 100;
    const startPos = page * pageSize;
    const endPos = Math.min(startPos + pageSize, this.table.rows.length);
    let html = '';

    for (let y = startPos; y < endPos; y++) {
      const row = this.table.rows[y];
      let cellHtml = '';
      const rowStyle = [];
      let rowClass = '';
      for (let i = 0; i < this.table.columns.length; i++) {
        cellHtml += this.renderCell(i, y, row[i], y === startPos);
      }

      if (this.colorState.row) {
        rowStyle.push('background-color:' + this.colorState.row);
        rowClass = 'table-panel-color-row';
        this.colorState.row = null;
      }

      if (this.colorState.rowvals) {
        rowStyle.push('color:' + this.colorState.rowvals);
        rowClass = '';
        this.colorState.rowvals = null;
      }

      html += `<tr class="${rowClass}" style="${rowStyle.join(';')}">${cellHtml}</tr>`;
    }

    return html;
  }

  render_values() {
    const rows = [];

    for (let y = 0; y < this.table.rows.length; y++) {
      const row = this.table.rows[y];
      const newRow = [];
      for (let i = 0; i < this.table.columns.length; i++) {
        newRow.push(this.formatColumnValue(i, row[i]));
      }
      rows.push(newRow);
    }
    return {
      columns: this.table.columns,
      rows: rows,
    };
  }
}
