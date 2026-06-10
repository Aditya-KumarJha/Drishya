import {
  Activity,
  AlertTriangle,
  Globe2,
  LayoutDashboard,
  Siren,
  Settings,
  FileText,
} from 'lucide-react';

export const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'monitors', label: 'Monitors', icon: Activity },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'alerts', label: 'Alerts', icon: Siren },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'status', label: 'Status Pages', icon: Globe2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const emptyMonitorForm = {
  url: '',
  method: 'GET',
  interval: '60000',
  timeoutMs: '10000',
  expectedStatusCodes: '200',
  headersText: '',
  body: '',
  responseKeyword: '',
  notificationEmailsText: '',
  publicStatusEnabled: true,
  active: true,
};

export const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
];

export const intervalOptions = [
  { value: '30000', label: '30s' },
  { value: '60000', label: '1m' },
  { value: '120000', label: '2m' },
  { value: '300000', label: '5m' },
  { value: '900000', label: '15m' },
];
