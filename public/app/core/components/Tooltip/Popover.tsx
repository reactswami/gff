import React, { ReactNode } from 'react';

import { Target } from 'react-popper';
import withTooltip from './withTooltip';

interface PopoverProps {
  tooltipSetState: (prevState: object) => void;
  children: ReactNode;
}

class Popover extends React.Component<PopoverProps, any> {
  constructor(props) {
    super(props);
    this.toggleTooltip = this.toggleTooltip.bind(this);
  }

  toggleTooltip() {
    const { tooltipSetState } = this.props;
    tooltipSetState(prevState => {
      return {
        ...prevState,
        show: !prevState.show,
      };
    });
  }

  render() {
    return (
      <Target className="popper__target" onClick={this.toggleTooltip}>
        {this.props.children}
      </Target>
    );
  }
}

export default withTooltip(Popover);
