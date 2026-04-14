import coreModule from 'app/core/core_module';

import { DashboardListCtrl } from './DashboardListCtrl';
import { SnapshotListCtrl } from './SnapshotListCtrl';
import { TemplateListCtrl  } from './TemplateListCtrl';

coreModule.controller('DashboardListCtrl', DashboardListCtrl);
coreModule.controller('SnapshotListCtrl', SnapshotListCtrl);
coreModule.controller('TemplateListCtrl', TemplateListCtrl);
