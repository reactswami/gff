import React, { PureComponent } from 'react';
import { TimeSeries } from 'app/core/core';
import { DrillDownOptions } from './Legend';

const styleTooltip = state =>
  ({
    visibility: state ? 'visible' : 'hidden',
  } as React.CSSProperties);

const openUrl = (url, newWindow) => {
  newWindow ? window.open(url, '_blank') : window.open(url, '_self');
};

const DrillDownContainer = props => (
  <div {...props} style={{ position: 'relative', display: 'inline-block' }}>
    {props.children}
  </div>
);

const DrillDownToolTip = ({ showToolTip, drillDownUrl, newWindow, drillDownTitle }) => (
  <span className="gf-table-legend" style={styleTooltip(showToolTip)} onClick={() => openUrl(drillDownUrl, newWindow)}>
    {drillDownTitle}
  </span>
);

const Anchor = ({ newWindow, drillDownUrl }) =>
  newWindow ? (
    <a className="fa fa-external-link fa-align-right" href="#" onClick={() => window.open(drillDownUrl, '_blank')} />
  ) : (
    <a className="fa fa-external-link fa-align-right" href={drillDownUrl} />
  );

export type DrillDownProps = {
  asTable: boolean;
  series: TimeSeries;
  drilldown: DrillDownOptions;
};

export type DrillDownState = {
  showToolTip: boolean;
};

class GraphDrillDown extends PureComponent<DrillDownProps, DrillDownState> {
  constructor(props) {
    super(props);
    this.state = { showToolTip: false };
  }

  setHoverState(state) {
    this.setState(prev => ({ ...prev, showToolTip: state }));
  }

  DrilldownAnchor = legendState => {
    const { drillDownUrl, newWindow, getLinkContent, drilldown, getVariableValue, series } = legendState;
    const getValueOfVariable = () => (drilldown.linkName ? getVariableValue(drilldown, series.label) : undefined);

    const anchorProps = {
      drillDownUrl,
      newWindow,
      showToolTip: this.state.showToolTip,
      asTable: this.props.asTable,
      drillDownTitle: getValueOfVariable(),
    };

    const urlProps = {
      newWindow: legendState.newWindow,
      drillDownUrl: getLinkContent(this.props.series.alias, drilldown),
    };

    return (
      <div onMouseEnter={() => this.setHoverState(true)} onMouseLeave={() => this.setHoverState(false)}>
        <Anchor {...urlProps} />
        {drilldown.linkName && <DrillDownToolTip {...anchorProps} />}
      </div>
    );
  };

  DrillDownUI = legendState => {
    const { showDrillDown, drillDownType } = legendState;

    if (drillDownType === 'disabled') {
      return <></>;
    }

    if (showDrillDown) {
      const DrillDown = () => (
        <DrillDownContainer className="graph-legend-value">
          <this.DrilldownAnchor {...legendState} />
        </DrillDownContainer>
      );
      return this.props.asTable ? (
        <td>
          <DrillDown />
        </td>
      ) : (
        <DrillDown />
      );
    }

    return <></>;
  };
  render() {
    return <this.DrillDownUI {...this.props} />;
  }
}

export default GraphDrillDown;
