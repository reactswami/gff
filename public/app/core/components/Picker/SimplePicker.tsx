// @ts-nocheck
import React, { FC } from 'react';

import DescriptionOption from './DescriptionOption';
import ResetStyles from './ResetStyles';
import Select from 'react-select';

interface Props {
  className?: string;
  defaultValue?: any;
  getOptionLabel: (item: any) => string;
  getOptionValue: (item: any) => string;
  onSelected: (item: any) => object | void;
  options: any[];
  placeholder?: string;
  width: number;
  value: any;
}

const SimplePicker: FC<Props> = ({
  className,
  defaultValue,
  getOptionLabel,
  getOptionValue,
  onSelected,
  options,
  placeholder,
  width,
  value,
}) => {
  return (
    <Select
      classNamePrefix={`gf-form-select-box`}
      className={`width-${width} gf-form-input gf-form-input--form-dropdown ${className || ''}`}
      components={{
        Option: DescriptionOption,
      }}
      defaultValue={defaultValue}
      value={value}
      getOptionLabel={getOptionLabel}
      getOptionValue={getOptionValue}
      isSearchable={false}
      onChange={onSelected}
      options={options}
      placeholder={placeholder || 'Choose'}
      styles={ResetStyles}
    />
  );
};

export default SimplePicker;
