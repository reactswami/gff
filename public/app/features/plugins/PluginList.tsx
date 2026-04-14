import React, { FC } from 'react';

import { Plugin } from 'app/types';
import PluginListItem from './PluginListItem';
import classNames from 'classnames/bind';

interface Props {
  plugins: Plugin[];
}

const PluginList: FC<Props> = props => {
  const { plugins  } = props;

  // @ts-ignore
  const listStyle = classNames({
    'card-section': true,
  });

  return (
    <section className={listStyle}>
      <ol className="card-list">
        {plugins.map((plugin, index) => {
          return <PluginListItem plugin={plugin} key={`${plugin.name}-${index}`} />;
        })}
      </ol>
    </section>
  );
};

export default PluginList;
