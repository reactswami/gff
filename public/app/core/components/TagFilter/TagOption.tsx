// @ts-nocheck
import { OptionProps } from 'react-select/lib/components/Option';
import React from 'react';
import { TagBadge } from './TagBadge';
import { components } from 'react-select';

// https://github.com/JedWatson/react-select/issues/3038
interface ExtendedOptionProps extends OptionProps<any> {
  data: any;
  className?: string;
  label: string;
}

export const TagOption = (props: ExtendedOptionProps) => {
  const { data, className, label } = props;
  return (
    <components.Option {...props}>
      <div className={`tag-filter-option btn btn-link ${className || ''}`}>
        <TagBadge label={label} removeIcon={false} count={data.count} />
      </div>
    </components.Option>
  );
};

export default TagOption;
