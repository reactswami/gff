// @ts-nocheck
import React, { ReactNode } from 'react';

import { OptionProps } from 'react-select/lib/components/Option';
import { components } from 'react-select';

export interface Props {
  children: ReactNode;
  className: string;
}

export const PickerOption = (props: OptionProps<any>) => {
  const { children, className } = props;
  return (
    <components.Option {...props}>
      <div className={`description-picker-option__button btn btn-link ${className}`}>{children}</div>
    </components.Option>
  );
};

export default PickerOption;
