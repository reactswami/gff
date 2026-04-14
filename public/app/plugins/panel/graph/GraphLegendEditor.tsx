// Replaces: public/app/plugins/panel/graph/tab_legend.html
//
// Loaded by: graph/module.ts via addEditorTab('Legend', 'tab_legend.html', 3)
// Registered as: 'graphLegendEditor' → used via <graph-legend-editor ctrl="ctrl">
//
// Directives converted:
//   gf-form-switch  → GfFormSwitch (already React via angular_wrappers)
//   ng-model-onblur → BlurInput    (already React)
//
// All ctrl.render() / ctrl.refresh() / ctrl.legendValuesOptionChanged() calls
// go through the Angular PanelCtrl on the mutable panel object — no Redux needed.
// gf-dashboard-link stays Angular (complex, not yet migrated).

import React, { useState, useEffect } from 'react';
import { GfFormSwitch } from 'app/core/components/Switch/GfFormSwitch';
import { BlurInput } from 'app/core/components/Forms/BlurInput';

interface Legend {
  show: boolean;
  alignAsTable: boolean;
  rightSide: boolean;
  sideWidth?: number;
  minCharacters?: number;
  min: boolean;
  max: boolean;
  avg: boolean;
  current: boolean;
  total: boolean;
  minHeader?: string;
  maxHeader?: string;
  avgHeader?: string;
  currentHeader?: string;
  totalHeader?: string;
  hideEmpty: boolean;
  hideZero: boolean;
}

interface GraphLegendEditorProps {
  ctrl: {
    panel: {
      legend: Legend;
      decimals?: number;
      drilldown?: any;
    };
    render: () => void;
    refresh: () => void;
    legendValuesOptionChanged: () => void;
  };
}

export const GraphLegendEditor: React.FC<GraphLegendEditorProps> = ({ ctrl }) => {
  const legend = ctrl.panel.legend;

  // Mirror legend state locally so toggles re-render immediately
  const [show, setShow] = useState(legend.show);
  const [alignAsTable, setAlignAsTable] = useState(legend.alignAsTable);
  const [rightSide, setRightSide] = useState(legend.rightSide);
  const [sideWidth, setSideWidth] = useState(legend.sideWidth != null ? String(legend.sideWidth) : '');
  const [minCharacters, setMinCharacters] = useState(legend.minCharacters != null ? String(legend.minCharacters) : '');
  const [min, setMin] = useState(legend.min);
  const [max, setMax] = useState(legend.max);
  const [avg, setAvg] = useState(legend.avg);
  const [current, setCurrent] = useState(legend.current);
  const [total, setTotal] = useState(legend.total);
  const [minHeader, setMinHeader] = useState(legend.minHeader || '');
  const [maxHeader, setMaxHeader] = useState(legend.maxHeader || '');
  const [avgHeader, setAvgHeader] = useState(legend.avgHeader || '');
  const [currentHeader, setCurrentHeader] = useState(legend.currentHeader || '');
  const [totalHeader, setTotalHeader] = useState(legend.totalHeader || '');
  const [decimals, setDecimals] = useState(ctrl.panel.decimals != null ? String(ctrl.panel.decimals) : '');
  const [hideEmpty, setHideEmpty] = useState(legend.hideEmpty);
  const [hideZero, setHideZero] = useState(legend.hideZero);

  useEffect(() => {
    setShow(legend.show);
    setAlignAsTable(legend.alignAsTable);
    setRightSide(legend.rightSide);
    setSideWidth(legend.sideWidth != null ? String(legend.sideWidth) : '');
    setMinCharacters(legend.minCharacters != null ? String(legend.minCharacters) : '');
    setMin(legend.min); setMax(legend.max); setAvg(legend.avg);
    setCurrent(legend.current); setTotal(legend.total);
    setMinHeader(legend.minHeader || ''); setMaxHeader(legend.maxHeader || '');
    setAvgHeader(legend.avgHeader || ''); setCurrentHeader(legend.currentHeader || '');
    setTotalHeader(legend.totalHeader || '');
    setDecimals(ctrl.panel.decimals != null ? String(ctrl.panel.decimals) : '');
    setHideEmpty(legend.hideEmpty); setHideZero(legend.hideZero);
  }, [legend, ctrl.panel]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggle = <T extends boolean>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    field: keyof Legend,
    callback: () => void
  ) => () => {
    const next = !legend[field] as T;
    (legend as any)[field] = next;
    setter(next);
    callback();
  };

  const commitNumber = (
    field: keyof Legend | 'decimals',
    setter: React.Dispatch<React.SetStateAction<string>>,
    callback: () => void
  ) => (val: string) => {
    setter(val);
    if (field === 'decimals') {
      ctrl.panel.decimals = val === '' ? undefined : Number(val);
    } else {
      (legend as any)[field] = val === '' ? undefined : Number(val);
    }
    callback();
  };

  const commitString = (
    field: keyof Legend,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => (val: string) => {
    setter(val);
    (legend as any)[field] = val;
    ctrl.render();
  };

  const handleValuesChange = (field: keyof Legend) => () => {
    (legend as any)[field] = !(legend as any)[field];
    ctrl.legendValuesOptionChanged();
    // re-read from legend after legendValuesOptionChanged mutates it
    setMin(legend.min); setMax(legend.max); setAvg(legend.avg);
    setCurrent(legend.current); setTotal(legend.total);
  };

  return (
    <div className="editor-row">
      {/* Options */}
      <div className="section gf-form-group">
        <h5 className="section-heading">Options</h5>
        <GfFormSwitch className="gf-form" label="Show" labelClass="width-8"
          checked={show} onChange={toggle(setShow, 'show', ctrl.refresh)} />
        <GfFormSwitch className="gf-form" label="As Table" labelClass="width-8"
          checked={alignAsTable} onChange={toggle(setAlignAsTable, 'alignAsTable', ctrl.render)} />
        <GfFormSwitch className="gf-form" label="To the right" labelClass="width-8"
          checked={rightSide} onChange={toggle(setRightSide, 'rightSide', ctrl.render)} />

        {rightSide && !alignAsTable && (
          <div className="gf-form">
            <label className="gf-form-label width-8">Width</label>
            <BlurInput
              type="number"
              className="gf-form-input max-width-5"
              placeholder="250"
              title="Set a min-width for the legend side table/block"
              value={sideWidth}
              onChange={commitNumber('sideWidth', setSideWidth, ctrl.render)}
            />
          </div>
        )}
        {rightSide && alignAsTable && (
          <div className="gf-form">
            <label className="gf-form-label width-8">Min.characters</label>
            <BlurInput
              type="number"
              className="gf-form-input max-width-5"
              placeholder="auto"
              title="Set the minimum characters visible on the legend"
              value={minCharacters}
              onChange={commitNumber('minCharacters', setMinCharacters, ctrl.render)}
            />
          </div>
        )}
      </div>

      {/* Values */}
      <div className="section gf-form-group">
        <h5 className="section-heading">Values</h5>

        {([
          ['min', 'Min', min, setMin, minHeader, setMinHeader],
          ['max', 'Max', max, setMax, maxHeader, setMaxHeader],
          ['avg', 'Avg', avg, setAvg, avgHeader, setAvgHeader],
          ['current', 'Current', current, setCurrent, currentHeader, setCurrentHeader],
          ['total', 'Total', total, setTotal, totalHeader, setTotalHeader],
        ] as const).map(([field, label, checked, , header, setHeader]) => (
          <div key={field} className="gf-form-inline">
            <GfFormSwitch className="gf-form" label={label} labelClass="width-4"
              checked={checked as boolean}
              onChange={handleValuesChange(field as keyof Legend)} />
            <div className="gf-form">
              <BlurInput
                className="gf-form-input width-5"
                placeholder="header"
                title="Add custom legend header"
                value={header as string}
                onChange={commitString((`${field}Header`) as keyof Legend, setHeader as any)}
              />
            </div>
          </div>
        ))}

        <div className="gf-form-inline">
          <div className="gf-form">
            <label className="gf-form-label width-6">Decimals</label>
            <BlurInput
              type="number"
              className="gf-form-input width-5"
              placeholder="auto"
              title="Override automatic decimal precision for legend and tooltips"
              value={decimals}
              onChange={commitNumber('decimals', setDecimals, ctrl.render)}
            />
          </div>
        </div>
      </div>

      {/* Hide series */}
      <div className="section gf-form-group">
        <h5 className="section-heading">Hide series</h5>
        <GfFormSwitch className="gf-form" label="With only nulls" labelClass="width-10"
          checked={hideEmpty} onChange={toggle(setHideEmpty, 'hideEmpty', ctrl.render)} />
        <GfFormSwitch className="gf-form" label="With only zeros" labelClass="width-10"
          checked={hideZero} onChange={toggle(setHideZero, 'hideZero', ctrl.render)} />
      </div>

      {/* Drilldown/Link — stays Angular */}
      <div className="section gf-form-group">
        <h5 className="section-heading">Drilldown/Link</h5>
        <div className="gf-form">
          <gf-dashboard-link
            dashboard={ctrl.panel.drilldown?.dashboard}
            type={ctrl.panel.drilldown?.type}
            link-name={ctrl.panel.drilldown?.linkName}
            url={ctrl.panel.drilldown?.url}
            keep-time={ctrl.panel.drilldown?.keepTime}
            include-vars={ctrl.panel.drilldown?.includeVars}
            target-blank={ctrl.panel.drilldown?.targetBlank}
            report={ctrl.panel.drilldown?.report}
            plugin="graph-chart"
            var-name={ctrl.panel.drilldown?.varName}
            params={ctrl.panel.drilldown?.params}
            on-change="ctrl.refresh()"
          />
        </div>
      </div>
    </div>
  );
};
