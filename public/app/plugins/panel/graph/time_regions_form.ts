import coreModule from 'app/core/core_module';
import { getColorModes } from './time_region_manager';

export class TimeRegionFormCtrl {
  panelCtrl: any;
  panel: any;
  disabled: boolean;
  colorModes: any;
  $scope: any;

  /** @ngInject */
  constructor($scope) {
    this.$scope = $scope;
  }

  $onInit() {
    const unbindDestroy = this.$scope.$on('$destroy', () => {
      this.panelCtrl.editingTimeRegions = false;
      this.panelCtrl.render();
      unbindDestroy();
    });

    this.panel = this.panelCtrl.panel;
    this.colorModes = getColorModes();
    this.panelCtrl.editingTimeRegions = true;
  }

  render() {
    this.panelCtrl.render();
  }

  addTimeRegion() {
    this.panel.timeRegions.push({
      op: 'time',
      fromDayOfWeek: undefined,
      from: undefined,
      toDayOfWeek: undefined,
      to: undefined,
      colorMode: 'background6',
      fill: true,
      line: false,
    });
    this.panelCtrl.render();
  }

  removeTimeRegion(index) {
    this.panel.timeRegions.splice(index, 1);
    this.panelCtrl.render();
  }

  onFillColorChange(index) {
    return newColor => {
      this.panel.timeRegions[index].fillColor = newColor;
      this.render();
    };
  }

  onLineColorChange(index) {
    return newColor => {
      this.panel.timeRegions[index].lineColor = newColor;
      this.render();
    };
  }
}

coreModule.directive('graphTimeRegionForm', () => {
  return {
    restrict: 'E',
    templateUrl: 'public/app/plugins/panel/graph/time_regions_form.html',
    controller: TimeRegionFormCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      panelCtrl: '=',
    },
  };
});
