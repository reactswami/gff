export interface DashboardSearchHit {
  id: number;
  tags: string[];
  title: string;
  type: string;
  uid: string;
  uri: string;
  url: string;
}

export type SearchOptions = {
  starred: boolean;
  tag: any[];
  folderIds?: number[];
  skipRecent?: boolean;
  skipStarred?: boolean;
  query: any;
};
