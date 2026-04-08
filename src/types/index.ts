export type Marker = {
  id: string;
  coordinates: [number, number]; // [lon, lat]
  location: string;
  packages: string[];
  maintainer: string;
};

export type DepNode = {
  name: string;
  version: string;
  repository?: string;
  maintainers: string[];
  githubUsers: string[];
  location?: string;
  coordinates?: [number, number];
  status: 'pending' | 'fetching' | 'resolved' | 'failed';
};

export type GitHubUser = {
  login: string;
  location?: string;
  avatar_url: string;
  name?: string;
  html_url: string;
};
