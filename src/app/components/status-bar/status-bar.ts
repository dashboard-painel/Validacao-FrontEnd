import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type StatusBarItem } from '../../models/shared/dashboard.model';

@Component({
  selector: 'app-status-bar',
  templateUrl: './status-bar.html',
  styleUrl: './status-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBar {
  items = input<StatusBarItem[]>([]);
}
