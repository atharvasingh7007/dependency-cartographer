export function parseGitHubUser(repoUrl: string): string | null {
  if (!repoUrl) return null;
  const match = repoUrl.match(/github\.com[/:]([^/]+)/);
  return match ? match[1] : null;
}
