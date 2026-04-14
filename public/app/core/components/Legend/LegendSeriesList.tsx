import React, { PureComponent } from 'react';
import LegendItem, { LegendItemProps } from './LegendItem';
import { TimeSeries } from 'app/core/core';

export type LegendSeriesListType = {
  seriesList: TimeSeries[];
  hiddenSeries: TimeSeries[];
};
export type LegendSeriesListProps = LegendSeriesListType & Omit<LegendItemProps, 'series' | 'hidden'>;

export class LegendSeriesList extends PureComponent<LegendSeriesListProps> {
  render() {
    const { seriesList, hiddenSeries } = this.props;
    return seriesList.map((series, i) => (
      <LegendItem
        // This trick required because TimeSeries.id is not unique (it's just TimeSeries.alias).
        // In future would be good to make id unique across the series list.
        key={`${series.id}-${i}`}
        series={series}
        hidden={hiddenSeries[series.alias] ?? false}
        {...this.props}
      />
    ));
  }
}
