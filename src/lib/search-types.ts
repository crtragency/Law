export interface DashboardSearchResult {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  meta?: string;
}

export interface DashboardSearchGroup {
  title: string;
  results: DashboardSearchResult[];
}

export interface DashboardSearchResponse {
  query: string;
  total: number;
  groups: DashboardSearchGroup[];
}
