// Replaces: public/app/core/directives/metric_segment.ts
// Covers: metricSegment, metricSegmentModel
//
// USAGE SITES:
//   features/dashboard/ad_hoc_filters.ts:160-161 (inline template string)
//     <metric-segment segment="segment" get-options="ctrl.getOptions(segment, $index)"
//                     on-change="ctrl.segmentChanged(segment, $index)">
//
//   plugins/panel/graph/axes_editor.html:118    (metricSegmentModel)
//     <metric-segment-model property="ctrl.panel.xaxis.values[0]"
//                           options="ctrl.xAxisStatOptions"
//                           on-change="ctrl.xAxisValueChanged()"
//                           custom="false" css-class="width-10" select-mode="true">
//
// ALSO USED INTERNALLY by metricSegmentModel which generates its own
//   <metric-segment ...> template — fully replaced by MetricSegmentModel below.
//
// WHAT IT DID:
//   Rendered a clickable label button that, when clicked, became a typeahead
//   input. The user typed to filter options (fetched async via getOptions()),
//   selected one, and it committed back via onChange(). Supported:
//   - Custom values (free-text entry)
//   - Template variable highlighting via templateSrv
//   - Debounced lookups
//   - A "select mode" which rendered a dropdown-style button instead of plain label
//
// IMPORTANT: metric_segment.ts uses `give-focus="segment.focus"` in its internal
//   templates. The useFocus hook (useFocus.ts) handles that.
//
// Migration pattern (metricSegment):
//   Before:
//     <metric-segment segment="segment" get-options="ctrl.getOptions(segment, $index)"
//                     on-change="ctrl.segmentChanged(segment, $index)">
//   After:
//     <MetricSegment
//       segment={segment}
//       getOptions={(query) => ctrl.getOptions(segment, index, query)}
//       onChange={() => ctrl.segmentChanged(segment, index)}
//     />
//
// Migration pattern (metricSegmentModel):
//   Before:
//     <metric-segment-model property="ctrl.panel.xaxis.values[0]"
//                           options="ctrl.xAxisStatOptions"
//                           on-change="ctrl.xAxisValueChanged()"
//                           custom="false" css-class="width-10" select-mode="true">
//   After:
//     <MetricSegmentModel
//       value={panel.xaxis.values[0]}
//       options={xAxisStatOptions}
//       onChange={(val) => { panel.xaxis.values[0] = val; xAxisValueChanged(); }}
//       allowCustom={false}
//       cssClass="width-10"
//       selectMode={true}
//     />

import React, { useState, useRef, useEffect, useCallback } from 'react';
import _ from 'lodash';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Segment {
  value: string;
  html?: string;
  fake?: boolean;
  expandable?: boolean;
  focus?: boolean;
  cssClass?: string;
  selectMode?: boolean;
  custom?: string;
  type?: string;
}

export interface SegmentOption {
  value: string;
  text?: string;
  html?: string;
  expandable?: boolean;
  type?: string;
}

interface MetricSegmentProps {
  segment: Segment;
  getOptions: (query: string) => Promise<SegmentOption[]>;
  onChange: (segment: Segment) => void;
  debounce?: boolean;
  cssClass?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricSegment — replaces the metricSegment Angular directive
// ─────────────────────────────────────────────────────────────────────────────
export const MetricSegment: React.FC<MetricSegmentProps> = ({
  segment,
  getOptions,
  onChange,
  debounce = false,
  cssClass = '',
}) => {
  const [linkMode, setLinkMode] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [options, setOptions] = useState<SegmentOption[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when transitioning from link → input mode
  useEffect(() => {
    if (!linkMode) {
      inputRef.current?.focus();
    }
  }, [linkMode]);

  const fetchOptions = useCallback(
    _.debounce(async (query: string) => {
      const results = await getOptions(query);
      setOptions(results);
      setShowOptions(true);
    }, debounce ? 500 : 0),
    [getOptions, debounce]
  );

  const switchToLink = useCallback(
    (value?: string) => {
      if (cancelBlurRef.current) {
        clearTimeout(cancelBlurRef.current);
        cancelBlurRef.current = null;
      }
      setLinkMode(true);
      setShowOptions(false);
      if (value !== undefined && value !== '' && value !== segment.value) {
        const selected = options.find(o => _.escape(o.value) === value || o.value === value);
        if (selected) {
          onChange({
            ...segment,
            value: selected.value,
            html: selected.html,
            fake: false,
            expandable: selected.expandable,
            type: selected.type ?? segment.type,
          });
        } else if (segment.custom !== 'false') {
          onChange({ ...segment, value, fake: false, expandable: true });
        }
      }
    },
    [segment, options, onChange]
  );

  const handleButtonClick = async () => {
    setLinkMode(false);
    setInputVal('');
    await fetchOptions('');
  };

  const handleInputBlur = () => {
    cancelBlurRef.current = setTimeout(() => switchToLink(inputVal), 200);
  };

  const handleOptionMouseDown = (opt: SegmentOption) => {
    if (cancelBlurRef.current) {
      clearTimeout(cancelBlurRef.current);
    }
    const escaped = _.escape(opt.value);
    setInputVal(escaped);
    switchToLink(escaped);
  };

  const displayLabel = segment.html
    ? segment.value  // html is for Angular $sce trusted — in React just show value
    : segment.value;

  const buttonClass = segment.selectMode
    ? `gf-form-input gf-form-input--dropdown ${segment.cssClass || cssClass}`
    : `gf-form-label ${segment.cssClass || cssClass}`;

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {linkMode ? (
        <a
          className={buttonClass}
          tabIndex={1}
          onClick={handleButtonClick}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
              handleButtonClick();
            }
          }}
        >
          {displayLabel}
        </a>
      ) : (
        <input
          ref={inputRef}
          type="text"
          className="gf-form-input input-medium"
          spellCheck={false}
          value={inputVal}
          onChange={e => {
            setInputVal(e.target.value);
            fetchOptions(e.target.value);
          }}
          onBlur={handleInputBlur}
        />
      )}

      {!linkMode && showOptions && options.length > 0 && (
        <ul
          className="typeahead dropdown-menu"
          style={{ display: 'block', position: 'absolute', zIndex: 1000, maxHeight: 300, overflowY: 'auto' }}
        >
          {options.slice(0, 10000).map((opt, idx) => (
            <li key={idx}>
              <a onMouseDown={() => handleOptionMouseDown(opt)}>
                {opt.text ?? opt.value}
              </a>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MetricSegmentModel — replaces the metricSegmentModel Angular directive
// Bridges between a simple string property and MetricSegment
// ─────────────────────────────────────────────────────────────────────────────
interface MetricSegmentModelProps {
  value: string;
  options?: Array<{ text: string; value: string }>;
  getOptions?: () => Promise<Array<{ text: string; value: string }>>;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  cssClass?: string;
  selectMode?: boolean;
}

export const MetricSegmentModel: React.FC<MetricSegmentModelProps> = ({
  value,
  options: staticOptions,
  getOptions,
  onChange,
  allowCustom = true,
  cssClass = '',
  selectMode = false,
}) => {
  const [cachedOptions, setCachedOptions] = useState<SegmentOption[]>([]);

  const segment: Segment = {
    value,
    cssClass,
    selectMode,
    custom: allowCustom ? 'true' : 'false',
  };

  const fetchOptions = async (_query: string): Promise<SegmentOption[]> => {
    if (staticOptions) {
      const mapped = staticOptions.map(o => ({ value: o.text }));
      setCachedOptions(staticOptions.map(o => ({ value: o.value, text: o.text })));
      return mapped;
    }
    if (getOptions) {
      const results = await getOptions();
      setCachedOptions(results.map(o => ({ value: o.value, text: o.text })));
      return results.map(o => ({ value: o.text }));
    }
    return [];
  };

  const handleChange = (seg: Segment) => {
    const matched = cachedOptions.find(o => o.text === seg.value);
    const finalValue = matched ? matched.value : (allowCustom ? seg.value : value);
    onChange(finalValue);
  };

  return (
    <MetricSegment
      segment={segment}
      getOptions={fetchOptions}
      onChange={handleChange}
      cssClass={cssClass}
    />
  );
};
