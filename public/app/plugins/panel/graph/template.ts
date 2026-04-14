const template = `
<div class="graph-panel" ng-class="{'graph-panel--legend-right': ctrl.panel.legend.rightSide}">
  <div class="graph-panel__chart" grafana-graph ng-dblclick="ctrl.zoomOut()">
  </div>

  <div class="graph-legend" ng-class="{'graph-legend--show': ctrl.panel.legend.show}">
    <div class="graph-legend-content" graph-legend></div>
  </div>
</div>
`;

export default template;
