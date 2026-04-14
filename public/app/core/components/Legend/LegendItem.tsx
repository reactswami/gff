import { GraphFormat, LegendFormat, PieChartFormat } from './Legend';
import React, { PureComponent } from 'react';

import { DrillDownOptions } from './Legend';
import GraphDrillDown from './GraphDrillDown';
import { SeriesColorPicker } from 'app/core/components/colorpicker/SeriesColorPicker';
import { TimeSeries } from 'app/core/core';
import _ from 'lodash';
import classNames from 'classnames';
import kbn from 'app/core/utils/kbn';

export const LEGEND_STATS = ['min', 'max', 'avg', 'current', 'total', 'pct'];
enum STATS {
  PERCENT = 'pct',
  PERCENT_FORMAT = 'percent',
}
enum GRAPH {
  LEFT_AXIS = 1,
  RIGHT_AXIS = 2,
}

export type LegendItemProps = {
  series: TimeSeries;
  hidden: boolean;
  values: boolean;
  asTable: boolean;
  ctrl?: any;
  legendFormat: LegendFormat;
  onToggleSeries: (series: TimeSeries, e: string) => void;
  onToggleAxis?: (info) => void;
  onColorChange: (series: TimeSeries, color, ctrl?) => void;
  drilldown: DrillDownOptions;
  minCharacters: number;
};

type LegendItemState = {
  yaxis: number;
};

class LegendItem extends PureComponent<LegendItemProps, LegendItemState> {
  constructor(props) {
    super(props);
    this.state = {
      yaxis: this.props.series.yaxis,
    };
  }

  onLabelClick = e => this.props.onToggleSeries(this.props.series, e);

  onToggleAxis = () => {
    const yaxis = this.state.yaxis === 2 ? 1 : 2;
    const info = { alias: this.props.series.alias, yaxis: yaxis };
    this.setState({ yaxis: yaxis });
    this.props.onToggleAxis(info);
  };

  onColorChange = color => {
    this.props.onColorChange(this.props.series, color, this.props.ctrl);
    // Because of PureComponent nature it makes only shallow props comparison and changing of series.color doesn't run
    // component re-render. In this case we can't rely on color, selected by user, because it may be overwritten
    // by series overrides. So we need to use forceUpdate() to make sure we have proper series color.
    this.forceUpdate();
  };

  formatPieChart(stat: string, value: number) {
    const pieFormat: PieChartFormat = this.props.legendFormat as PieChartFormat;
    let format, decimals;

    decimals = pieFormat.valueDecimal;
    format = pieFormat.format;

    if (stat === STATS.PERCENT) {
      decimals = pieFormat.percentageDecimal;
      format = STATS.PERCENT_FORMAT;
    }

    return this.formatDecimalInfo(decimals, format, value);
  }

  formatGraph(stat: string, value: number): number | string {
    let format, decimals;
    const graphFormat: GraphFormat = this.props.legendFormat as GraphFormat;

    const graphAxis = this.props.series.yaxis;
    decimals = graphFormat.yLeftDecimal;
    format = graphFormat.yLeftformat;

    if (graphAxis === GRAPH.RIGHT_AXIS) {
      decimals = graphFormat.yRightDecimal;
      format = graphFormat.yRightformat;
    }

    if (stat === STATS.PERCENT) {
      format = STATS.PERCENT_FORMAT;
    }
    return this.formatDecimalInfo(decimals, format, value);
  }

  formatDecimalInfo(decimals, format, value) {
    const decimalInfo = kbn.getDecimalsForValue(decimals, value);
    const formatFunc = kbn.valueFormats[format];
    if (formatFunc) {
      return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
    }
    return value;
  }

  getValueName(valueName) {
    const pieFormat: PieChartFormat = this.props.legendFormat as PieChartFormat;
    // Uppercase the first character of the series name,
    // the system names are as current, max, average, count
    const valName = valueName.charAt(0).toUpperCase() + valueName.slice(1);
    return pieFormat.format && pieFormat.valueHeader ? pieFormat.valueHeader : valName;
  }

  formatValue(stat: string, value: number): number | string {
    const pieFormat: PieChartFormat = this.props.legendFormat as PieChartFormat;
    const graphFormat: GraphFormat = this.props.legendFormat as GraphFormat;

    if (pieFormat.format) {
      return this.formatPieChart(stat, value);
    }

    if (graphFormat.yLeftformat) {
      return this.formatGraph(stat, value);
    }
    return value;
  }

  renderLegendValues() {
    const { series, asTable } = this.props;
    const legendValueItems = [];
    for (const valueName of LEGEND_STATS) {
      if (this.props[valueName]) {
        const valName = this.getValueName(valueName);
        const valueFormatted = this.props.legendFormat
          ? this.formatValue(valueName, series.stats[valueName])
          : series.formatValueByName(valueName, series.stats[valueName]);
        legendValueItems.push(
          <LegendValue
            key={valName}
            valueName={valueName}
            valueHeader={valName}
            value={valueFormatted}
            asTable={asTable}
          />
        );
      }
    }

    return legendValueItems;
  }

  render() {
    const { hidden, values, asTable, series, minCharacters } = this.props;
    const valueItems = values ? this.renderLegendValues() : [];
    // Graph specific options
    const seriesOptionClasses = classNames({
      'graph-legend-series-hidden': hidden,
      'graph-legend-series--right-y': series.yaxis === 2,
    });
    const seriesLabel = (
      <LegendSeriesLabel
        label={series.alias}
        color={series.color}
        yaxis={this.state.yaxis}
        onLabelClick={this.onLabelClick}
        onColorChange={this.onColorChange}
        onToggleAxis={this.onToggleAxis}
      />
    );
    if (asTable) {
      return (
        <tr className={`graph-legend-series ${seriesOptionClasses}`}>
          <td style={{ minWidth: `${minCharacters}ch` }}>{seriesLabel}</td>
          {valueItems}
          <GraphDrillDown {...this.props} />
        </tr>
      );
    } else {
      return (
        <div className={`graph-legend-series ${seriesOptionClasses}`}>
          {seriesLabel}
          {valueItems}
          <GraphDrillDown {...this.props} />
        </div>
      );
    }
  }
}

type LegendLabelProps = {
  label: string;
  yaxis: number;
  color: string;
  onLabelClick: (e) => void;
  onColorChange: (color) => void;
  onToggleAxis: () => void;
};

class LegendSeriesLabel extends PureComponent<LegendLabelProps> {
  render() {
    const { label, color, yaxis } = this.props;
    const { onColorChange, onToggleAxis } = this.props;
    return [
      <LegendSeriesIcon
        key="icon"
        color={color}
        yaxis={yaxis}
        onColorChange={onColorChange}
        onToggleAxis={onToggleAxis}
      />,
      <a className="graph-legend-alias pointer" title={label} key="label" onClick={e => this.props.onLabelClick(e)}>
        {label}
      </a>,
    ];
  }
}

type LegendSeriesIconProps = {
  yaxis: number;
  color: string;
  key: string;
  onColorChange: (color) => void;
  onToggleAxis: () => void;
};

class LegendSeriesIcon extends PureComponent<LegendSeriesIconProps> {
  render = () => (
    <SeriesColorPicker
      optionalClass="graph-legend-icon"
      yaxis={this.props.yaxis}
      color={this.props.color}
      onColorChange={this.props.onColorChange}
      onToggleAxis={this.props.onToggleAxis}
    >
      <SeriesIcon {...this.props} />
    </SeriesColorPicker>
  );
}

type SeriesIconProps = {
  color: string;
};

class SeriesIcon extends PureComponent<SeriesIconProps> {
  render = () => <i className="fa fa-minus pointer" style={{ color: this.props.color }} />;
}

type LegendValueProps = {
  value: string;
  valueName: string;
  valueHeader?: string;
  asTable: boolean;
};

class LegendValue extends PureComponent<LegendValueProps> {
  render() {
    const { value, valueName, valueHeader } = this.props;
    if (this.props.asTable) {
      return <td className={`graph-legend-value ${valueName}`}>{value}</td>;
    }
    if (valueHeader) {
      return (
        <div className={`graph-legend-value`}>
          {valueHeader} : {value}
        </div>
      );
    }
    return (
      <div className={`graph-legend-value ${valueName}`}>
        {valueName}:{value}
      </div>
    );
  }
}

export default LegendItem;
