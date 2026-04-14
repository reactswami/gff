// @ts-nocheck
import React, { ReactNode } from 'react';

import { OptionProps } from 'react-select/lib/components/Option';
import { components } from 'react-select';

// https://github.com/JedWatson/react-select/issues/3038
interface ExtendedOptionProps extends Partial<OptionProps<any>> {
  data: any;
  children: ReactNode;
  className?: string;
}

export const PickerOption = (props: ExtendedOptionProps) => {
  const { children, className } = props;
  return (
    <components.Option {...props}>
      <div className={`description-picker-option__button btn btn-link ${className}`}>
        {children}
      </div>
    </components.Option>
  );
};

export default PickerOption;
