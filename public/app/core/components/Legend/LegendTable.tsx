import LegendItem, { LEGEND_STATS, LegendItemProps } from './LegendItem';
import React, { PureComponent } from 'react';

import { LegendOptions } from './Legend';
import { LegendSeriesListType } from './LegendSeriesList';

export type LegendTableType = {
  onToggleSort: (sortBy, sortDesc) => void;
};

export type LegendTableProps = LegendTableType &
Pick<LegendOptions, 'sort' | 'sortDesc' | 'showDrillDown' | 'values' | 'minCharacters'> &
Omit<LegendItemProps, 'series' | 'hidden'> &
Pick<LegendSeriesListType, 'hiddenSeries' | 'seriesList'>;

export class LegendTable extends PureComponent<LegendTableProps> {
  onToggleSort = stat => {
    let sortDesc = this.props.sortDesc;
    let sortBy = this.props.sort;
    if (stat !== sortBy) {
      sortDesc = null;
    }

    // if already sort ascending, disable sorting
    if (sortDesc === false) {
      sortBy = null;
      sortDesc = null;
    } else {
      sortDesc = !sortDesc;
      sortBy = stat;
    }
    this.props.onToggleSort(sortBy, sortDesc);
  };

  getTableHeader = statName => {
    const { sort, sortDesc } = this.props;
    let customHeader = this.props[statName + 'Header'];

    if (!customHeader) {
      customHeader = statName;
    }

    return (
      <LegendTableHeaderItem
        key={customHeader}
        tableHeader={customHeader}
        statName={statName}
        sort={sort}
        sortDesc={sortDesc}
        onClick={this.onToggleSort}
      />
    );
  };

  render() {
    const seriesList = this.props.seriesList;
    const { hiddenSeries, values } = this.props;

    return (
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }} />
            {values ? LEGEND_STATS.map((statName) => this.props[statName] && this.getTableHeader(statName)) : <></>}
            {this.props.showDrillDown ? <LegendTableHeaderItem key={'link'} statName={'link'} /> : <></>}
          </tr>
        </thead>
        <tbody>
          {seriesList.map((series, i) => (
            <LegendItem key={`${series.id}-${i}`} series={series} hidden={hiddenSeries[series.alias] ?? false} {...this.props} />
          ))}
        </tbody>
      </table>
    );
  }
}

export type LegendTableHeaderProps = {
  statName: string;
  tableHeader?: string;
  sort?: string;
  sortDesc?: boolean;
  onClick?: (e) => void;
};

type LegendTableHeaderState = {
  showToolTip: boolean;
};

class LegendTableHeaderItem extends PureComponent<LegendTableHeaderProps, LegendTableHeaderState> {
  constructor(props) {
    super(props);
    this.state = { showToolTip: false };
  }

  setHoverState(state) {
    this.setState(prev => ({ ...prev, showToolTip: state }));
  }

  Header = () => {
    const { statName, sort, sortDesc, tableHeader } = this.props;
    const title = tableHeader ? tableHeader : statName;
    if (this.props.onClick) {
      return (
        <th className="pointer" onClick={() => this.props.onClick(this.props.statName)} style={{ textAlign: 'right' }}>
          {title}
          {sort === statName && <span className={sortDesc ? 'fa fa-caret-down' : 'fa fa-caret-up'} />}
        </th>
      );
    } else {
      return <th style={{ textAlign: 'left', paddingLeft: '1.2rem' }}>{title}</th>;
    }
  };
  render() {
    return <this.Header />;
  }
}
