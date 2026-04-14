import React, { PureComponent } from 'react';

import CustomScrollbar from '../CustomScrollbar/CustomScrollbar';
import { LegendSeriesList } from './LegendSeriesList';
import { LegendTable } from './LegendTable';
import { TimeSeries } from 'app/core/core';
import _ from 'lodash';

const MINIMUM_CHARACTERS_FOR_LEGEND = 20;

export type DrillDownType = 'disabled' | 'dashboard' | 'absolute' | 'report';
export type LegendSortType = 'min' | 'max' | 'avg' | 'current' | 'total' | 'pct';

export type LegendOptions = {
  asTable: boolean;
  rightSide: number;
  sideWidth: number;
  isRightSide: boolean;
  sort: LegendSortType;
  sortDesc: boolean;
  hideEmpty: boolean;
  hideZero: boolean;
  show: boolean;
  values: boolean;
  showDrillDown?: boolean;
  drillDownUrl?: string;
  minHeader?: string;
  maxHeader?: string;
  currentHeader?: string;
  totalHeader?: string;
  avgHeader?: string;
  min: boolean;
  max: boolean;
  current: boolean;
  total: boolean;
  avg: boolean;
  pct?: boolean;
  legendFormat: LegendFormat;
  minCharacters?: number;
};

export type LegendFormat = PieChartFormat | GraphFormat;

export type PieChartFormat = {
  format: string;
  valueDecimal: number;
  valueHeader?: string;
  percentageDecimal: number;
};

export type GraphFormat = {
  yLeftformat: string;
  yLeftDecimal: number;

  yRightformat: string;
  yRightDecimal: number;
};

export type DrillDownOptions = {
  type: DrillDownType;
  dashboard: string;
  url: string;
  varName: string;
  showLegend: boolean;
  keepTime: boolean;
  includeVars: boolean;
  targetBlank: boolean;
  linkName: string;
  params?: string;
};

export type LegendDrillDownState = {
  showDrillDown: boolean;
  drillDownUrl: string;
  newWindow: boolean;
  drillDownType: DrillDownType;
  getLinkContent?: (seriesLabel: string, drilldown: DrillDownOptions) => string;
  getVariableValue?: (drilldown: DrillDownOptions, seriesLabel: string) => string;
  drilldown: DrillDownOptions;
};

type LegendProps = {
  seriesList: TimeSeries[];
  optionalClass?: string;
  hiddenSeries: TimeSeries[];
  onToggleSeries: (series: TimeSeries, ctrl) => void;
  onToggleSort: (sortBy: string, sortDesc: boolean) => void;
  onToggleAxis?: (series: TimeSeries) => void;
  onColorChange: (series: TimeSeries, color: string) => void;
  ctrl?: any;
};

type LegendState = {
  hiddenSeries: any;
};

export type LegendComponentProps = LegendProps & LegendOptions & DrillDownOptions & LegendDrillDownState & LegendFormat;

export default class Legend extends PureComponent<LegendComponentProps, LegendState> {
  _minCharacters; // A placeholder to compute the minCharacters based on the legend alias title lengths.

  constructor(props) {
    super(props);
    this.state = {
      hiddenSeries: this.props.hiddenSeries,
    };
  }

  componentWillUnmount() {
    this.setState({ hiddenSeries: null });
  }

  sortLegend() {
    let seriesList = this.props.seriesList ? [...this.props.seriesList] : [];

    if (this.props.sort) {
      seriesList = _.sortBy(seriesList, series => {
        let sort = series.stats[this.props.sort];
        if (sort === null) {
          sort = -Infinity;
        }
        return sort;
      });
      if (this.props.sortDesc) {
        seriesList = seriesList.reverse();
      }
    }
    return seriesList;
  }

  onToggleSeries = (series, event: any) => {
    let hiddenSeries = { ...this.state.hiddenSeries };
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      if (hiddenSeries[series.alias]) {
        hiddenSeries[series.alias] = false;
      } else {
        hiddenSeries[series.alias] = true;
      }
    } else {
      hiddenSeries = this.toggleSeriesExclusiveMode(series, event?.target?.text);
    }
    this.setState({ hiddenSeries });
    this.props.onToggleSeries(hiddenSeries, this.props.ctrl);
  };

  isGraph = () => Boolean(this.props.onToggleAxis);

  determineToggle = (series: TimeSeries, value: TimeSeries): boolean => {
    if (this.isGraph()) {
      return value.alias === series.alias;
    } else {
      return value.alias !== series.alias;
    }
  };

  toggleSeriesExclusiveMode(series, seriesValue) {
    const hiddenSeries = this.isGraph() ? { ...this.state.hiddenSeries, [seriesValue]: false } : { ...this.state.hiddenSeries};

    if (hiddenSeries[series.alias]) {
      hiddenSeries[series.alias] = false;

      if (!this.isGraph()) {
        return hiddenSeries;
      }
    }

    // check if every other series is hidden
    const alreadyExclusive = this.props.seriesList.every(value => {
      if (this.determineToggle(series, value)) {
        return true;
      }

      return hiddenSeries[value.alias];
    });

    if (alreadyExclusive) {
      return [];
    } else {
      // hide all but this serie
      this.props.seriesList.forEach(value => {
        if (this.determineToggle(series, value)) {
          return;
        }

        hiddenSeries[value.alias] = true;
      });
    }

    return hiddenSeries;
  }

  /**
   * Compute the minCharacters based on the series titles. (BAU-4132)
   * By default, we use legendProps.minCharacters (20) but if the longest alias is shorter, we use the alias.
   * This allows the legend to 'shrink' based on the longest title in the series, capped to 20 characters max.
   * So if the longest alias is 10 characters long, we set minCharacters to 10+3ch (3ch is a buffer for the legend color)
   * Note that if the user has set minCharacters, it will override the 'auto'
   */
  computeMinCharactersWidth() {
    const {minCharacters} = this.props;
    if (minCharacters) {
      this._minCharacters = minCharacters + 3 ;
    } else {
      const maxLegendTitle = this.props.seriesList.reduce((max, serie) =>
        serie.alias.length + 2 > max ? (serie.alias.length + 3): max
      , 0);
      this._minCharacters = maxLegendTitle < MINIMUM_CHARACTERS_FOR_LEGEND ? maxLegendTitle : MINIMUM_CHARACTERS_FOR_LEGEND;
    }
  }

  render() {
    this.computeMinCharactersWidth();
    const { optionalClass, rightSide, sideWidth, show } = this.props;
    if (!show) {
      return <></>;
    }
    const legendClass = `${this.props.asTable ? 'graph-legend-table' : ''} ${optionalClass}`;
    const width: number = rightSide && sideWidth ? sideWidth : undefined;
    const ieWidth: number = rightSide && sideWidth ? sideWidth - 1 : undefined;
    const legendStyle: React.CSSProperties = {
      minWidth: width,
      width: ieWidth,
    };
    const hiddenSeries = this.state.hiddenSeries;
    const seriesList = this.sortLegend().filter(series => !series.hideFromLegend(this.props));

    const legendProps = {
      ...this.props,
      seriesList: seriesList,
      hiddenSeries: hiddenSeries,
      onToggleSeries: this.onToggleSeries,
      minCharacters: this._minCharacters
    };

    return (
      <CustomScrollbar>
        <div className={`graph-legend-content ${legendClass}`} style={legendStyle}>
          {this.props.asTable ? <LegendTable {...legendProps} /> : <LegendSeriesList {...legendProps} />}
        </div>
      </CustomScrollbar>
    );
  }
}
