import {
  Activity,
  AlertTriangle,
  Globe2,
  LayoutDashboard,
  Siren,
  Settings,
} from 'lucide-react';

export const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'monitors', label: 'Monitors', icon: Activity },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'alerts', label: 'Alerts', icon: Siren },
  { id: 'status', label: 'Status Pages', icon: Globe2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const emptyMonitorForm = {
  url: '',
  method: 'GET',
  interval: '60000',
  active: true,
};

export const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

export const intervalOptions = [
  { value: '30000', label: '30s' },
  { value: '60000', label: '1m' },
  { value: '120000', label: '2m' },
];
