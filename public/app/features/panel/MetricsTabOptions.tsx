// Replaces: the Options section (ctrl.optionsOpen) of
//           public/app/features/panel/partials/metrics_tab.html
//
// USAGE: registered as 'metricsTabOptions', used via:
//   <metrics-tab-options panel-ctrl="ctrl.panelCtrl" ctrl="ctrl">
//
// Directives converted in this section:
//   ng-model-onblur → BlurInput  (interval, cacheTimeout, maxDataPoints)
//   info-popover    → InfoPopover
//
// The rebuild-on-change + plugin-component section and query editor rows
// are left as Angular — they depend deeply on Angular's $compile and
// the plugin registry. This component only covers the Options collapsible.

import React, { useState, useEffect } from 'react';
import { BlurInput } from 'app/core/components/Forms/BlurInput';
import { InfoPopover } from 'app/core/components/InfoPopover';

interface QueryOptions {
  minInterval?: boolean;
  cacheTimeout?: boolean;
  maxDataPoints?: boolean;
}

interface Panel {
  interval?: string;
  cacheTimeout?: string;
  maxDataPoints?: string | number;
}

interface PanelCtrl {
  interval?: string;
  refresh: () => void;
}

interface MetricsTabOptionsProps {
  /** MetricsTabCtrl — owns queryOptions, panel, panelCtrl */
  ctrl: {
    queryOptions: QueryOptions;
    panel: Panel;
    panelCtrl: PanelCtrl;
    optionsOpen: boolean;
    hasQueryHelp: boolean;
    helpOpen: boolean;
    helpHtml: string;
    queryTroubleshooterOpen: boolean;
    toggleOptions: () => void;
    toggleHelp: () => void;
    toggleQueryTroubleshooter: () => void;
  };
}

export const MetricsTabOptions: React.FC<MetricsTabOptionsProps> = ({ ctrl }) => {
  // Mirror the Angular ctrl state locally so React re-renders on toggle
  const [optionsOpen, setOptionsOpen] = useState(ctrl.optionsOpen);
  const [helpOpen, setHelpOpen] = useState(ctrl.helpOpen);
  const [troubleshooterOpen, setTroubleshooterOpen] = useState(ctrl.queryTroubleshooterOpen);

  // Interval input — replaces ng-model-onblur on ctrl.panel.interval
  const [interval, setInterval] = useState(ctrl.panel.interval || '');
  const [cacheTimeout, setCacheTimeout] = useState(ctrl.panel.cacheTimeout || '');
  const [maxDataPoints, setMaxDataPoints] = useState(
    ctrl.panel.maxDataPoints != null ? String(ctrl.panel.maxDataPoints) : ''
  );

  useEffect(() => {
    setInterval(ctrl.panel.interval || '');
    setCacheTimeout(ctrl.panel.cacheTimeout || '');
    setMaxDataPoints(ctrl.panel.maxDataPoints != null ? String(ctrl.panel.maxDataPoints) : '');
  }, [ctrl.panel]);

  const handleIntervalCommit = (val: string) => {
    ctrl.panel.interval = val;
    ctrl.panelCtrl.refresh();
  };

  const handleCacheTimeoutCommit = (val: string) => {
    ctrl.panel.cacheTimeout = val;
    ctrl.panelCtrl.refresh();
  };

  const handleMaxDataPointsCommit = (val: string) => {
    ctrl.panel.maxDataPoints = val;
    ctrl.panelCtrl.refresh();
  };

  const toggleOptions = () => {
    ctrl.toggleOptions();
    setOptionsOpen(!optionsOpen);
  };

  const toggleHelp = () => {
    ctrl.toggleHelp();
    setHelpOpen(!helpOpen);
  };

  const toggleTroubleshooter = () => {
    ctrl.toggleQueryTroubleshooter();
    setTroubleshooterOpen(!troubleshooterOpen);
  };

  const qo = ctrl.queryOptions || {};

  return (
    <div className="gf-form-group">
      <div className="gf-form-inline">
        <div className="gf-form gf-form--grow" />

        {qo.minInterval !== undefined && (
          <div className="gf-form">
            <a className="gf-form-label" onClick={toggleOptions}>
              <i className={`fa fa-fw fa-caret-${optionsOpen ? 'down' : 'right'}`} />
              Options
            </a>
          </div>
        )}

        {ctrl.hasQueryHelp && (
          <div className="gf-form">
            <button className="gf-form-label" onClick={toggleHelp}>
              <i className={`fa fa-fw fa-caret-${helpOpen ? 'down' : 'right'}`} />
              Help
            </button>
          </div>
        )}

        <div className="gf-form">
          <button
            className="gf-form-label"
            onClick={toggleTroubleshooter}
            title="Display query request & response"
          >
            <i className={`fa fa-fw fa-caret-${troubleshooterOpen ? 'down' : 'right'}`} />
            Query Inspector
          </button>
        </div>
      </div>

      <div>
        {optionsOpen && (
          <>
            {qo.minInterval && (
              <div className="gf-form gf-form--flex-end">
                <label className="gf-form-label">Min time interval</label>
                <BlurInput
                  className="gf-form-input width-6"
                  placeholder={ctrl.panelCtrl.interval || ''}
                  value={interval}
                  onChange={val => { setInterval(val); handleIntervalCommit(val); }}
                  spellCheck={false}
                />
                <InfoPopover mode="right-absolute">
                  A lower limit for the auto group by time interval. Recommended to be set
                  to write frequency, for example <code>1m</code> if your data is written
                  every minute. Access auto interval via variable <code>$__interval</code>{' '}
                  for time range string and <code>$__interval_ms</code> for numeric variable
                  that can be used in math expressions.
                </InfoPopover>
              </div>
            )}

            {qo.cacheTimeout && (
              <div className="gf-form gf-form--flex-end">
                <label className="gf-form-label width-9">Cache timeout</label>
                <BlurInput
                  className="gf-form-input width-6"
                  placeholder="60"
                  value={cacheTimeout}
                  onChange={val => { setCacheTimeout(val); handleCacheTimeoutCommit(val); }}
                  spellCheck={false}
                />
                <InfoPopover mode="right-absolute">
                  If your time series store has a query cache this option can override
                  the default cache timeout. Specify a numeric value in seconds.
                </InfoPopover>
              </div>
            )}

            {qo.maxDataPoints && (
              <div className="gf-form gf-form--flex-end">
                <label className="gf-form-label width-9">Max data points</label>
                <BlurInput
                  className="gf-form-input width-6"
                  placeholder="auto"
                  value={maxDataPoints}
                  onChange={val => { setMaxDataPoints(val); handleMaxDataPointsCommit(val); }}
                  spellCheck={false}
                />
                <InfoPopover mode="right-absolute">
                  The maximum data points the query should return. For graphs this is
                  automatically set to one data point per pixel.
                </InfoPopover>
              </div>
            )}
          </>
        )}

        {helpOpen && (
          <div className="grafana-info-box">
            <div
              className="markdown-html"
              dangerouslySetInnerHTML={{ __html: ctrl.helpHtml }}
            />
            <a className="grafana-info-box__close" onClick={toggleHelp}>
              <i className="fa fa-chevron-up" />
            </a>
          </div>
        )}

        {/* query-troubleshooter is an Angular directive — rendered by the parent
            Angular template (metrics_tab.html) outside this React component */}
      </div>
    </div>
  );
};
