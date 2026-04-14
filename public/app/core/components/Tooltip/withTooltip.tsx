import { Arrow, Manager, Popper } from 'react-popper';
import React, { ReactNode } from 'react';

interface IwithTooltipProps {
  placement?: string;
  content: string | ((props: any) => JSX.Element);
  className?: string;
  children: ReactNode;
}

export default function withTooltip(WrappedComponent) {
  return class extends React.Component<IwithTooltipProps, any> {
    constructor(props) {
      super(props);

      this.setState = this.setState.bind(this);
      this.state = {
        placement: this.props.placement || 'auto',
        show: false,
      };
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.placement && nextProps.placement !== this.state.placement) {
        this.setState(prevState => {
          return {
            ...prevState,
            placement: nextProps.placement,
          };
        });
      }
    }

    renderContent(content) {
      if (typeof content === 'function') {
        // If it's a function we assume it's a React component
        const ReactComponent = content;
        return <ReactComponent />;
      }
      return content;
    }

    render() {
      const { content, className } = this.props;

      return (
        <Manager className={`popper__manager ${className || ''}`}>
          <WrappedComponent {...this.props} tooltipSetState={this.setState} />
          {this.state.show ? (
            <Popper placement={this.state.placement} className="popper">
              {this.renderContent(content)}
              <Arrow className="popper__arrow" />
            </Popper>
          ) : null}
        </Manager>
      );
    }
  };
}
