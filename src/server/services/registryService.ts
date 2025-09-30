import axios from 'axios';
import { ContainerRegistry, ContainerState, RegistryCheckResult } from '../types';

interface ParsedImage {
  registry: 'dockerhub' | 'github' | 'lscr' | 'unsupported';
  namespace: string;
  image: string;
  fullPath: string;
  registryDomain?: string; // For unsupported registries
}

export class RegistryService {
  // Registry-specific delays to handle rate limiting
  private static readonly REGISTRY_DELAYS = {
    'registry-1.docker.io': 2000,  // 2s for Docker Hub
    'ghcr.io': 1000,               // 1s for GHCR
    'lscr.io': 1000,               // 1s for LSCR
  } as const;

  // Registry-specific max retries
  private static readonly REGISTRY_MAX_RETRIES = {
    'registry-1.docker.io': 5,     // 5 retries for Docker Hub (heavily rate limited)
    'ghcr.io': 3,                  // 3 retries for GHCR
    'lscr.io': 3,                  // 3 retries for LSCR
  } as const;

  // Helper method to get delay for a specific registry
  private static getRegistryDelay(host: string): number {
    return this.REGISTRY_DELAYS[host as keyof typeof this.REGISTRY_DELAYS] || 1000;
  }

  // Helper method to get max retries for a specific registry
  private static getRegistryMaxRetries(host: string): number {
    return this.REGISTRY_MAX_RETRIES[host as keyof typeof this.REGISTRY_MAX_RETRIES] || 3;
  }

  // Helper method to sleep for a specified duration
  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to extract digest and timestamp from a manifest response
  private static async extractDigestAndTimestamp(
    response: any,
    baseUrl: string,
    repository: string,
    tag: string,
    platform?: string
  ): Promise<{ sha: string; lastUpdated?: string; platform?: string }> {
      const digest = response.headers['docker-content-digest'] || response.data?.config?.digest || response.data?.digest || '';
      const sha = String(digest || '').replace('sha256:', '');

      let lastUpdated: string | undefined = undefined;
      try {
        const configDigest = response.data?.config?.digest;
        if (configDigest) {
          const blobUrl = `${baseUrl}/v2/${repository}/blobs/${configDigest}`;
          const blobResp = await axios.get(blobUrl, {
            headers: { 'Accept': 'application/octet-stream' },
            timeout: 10000,
            validateStatus: () => true,
          });
        console.log(`[Registry] Blob fetch`, { host: baseUrl.replace('https://', ''), repository, tag, status: blobResp.status });
          if (blobResp.status === 200 && blobResp.data && typeof blobResp.data === 'object') {
            if (blobResp.data.created) {
              lastUpdated = blobResp.data.created;
            }
          }
        }
      } catch (e) {
      console.warn(`[Registry] Blob fetch failed`, { host: baseUrl.replace('https://', ''), repository, tag, error: (e as any)?.message });
        // Ignore errors deriving created timestamp
      }

    if (sha) return { sha, lastUpdated, platform };
      throw new Error('No digest in manifest response');
  }

  // Fetch a registry manifest digest, handling Docker Registry v2 Bearer token flow (anonymous)
  private static async fetchDigestWithAuth(
    host: string,
    repository: string,
    tag: string,
    retryCount: number = 0
  ): Promise<{ sha: string; lastUpdated?: string; platform?: string }> {
    console.log(`[Registry] Fetch manifest start`, { host, repository, tag });
    
    // Debug logging for registry requests
    if (host !== 'registry-1.docker.io' && host !== 'ghcr.io' && host !== 'lscr.io') {
      console.log(`[DEBUG] Attempting to fetch from registry: ${host}/${repository}:${tag}`);
    }
    const baseUrl = `https://${host}`;
    const manifestUrl = `${baseUrl}/v2/${repository}/manifests/${tag}`;

    // Try manifest list first (most common for modern images), then fall back to single manifests
    const manifestListHeaders = {
      'Accept': 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
    } as const;

    const singleManifestHeaders = {
      'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
    } as const;

    // Try manifest list first (most common for modern images)
    console.log(`[Registry] Trying manifest list first`, { host, repository, tag });
    let response = await axios.get(manifestUrl, {
      headers: manifestListHeaders,
      timeout: 10000,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      const contentType = response.headers['content-type'] || '';
      console.log(`[Registry] Manifest list OK`, { host, repository, tag, status: response.status, contentType });
      
      // Check if this is actually a manifest list
      if (contentType.includes('manifest.list') || contentType.includes('image.index') || 
          (response.data && (response.data.manifests || response.data.mediaType?.includes('manifest.list')))) {
        console.log(`[Registry] Processing manifest list`, { host, repository, tag });
        
        // Find a suitable platform manifest (prefer linux/amd64)
        const manifests = response.data?.manifests || [];
        const preferredPlatform = manifests.find((m: any) => 
          m.platform?.architecture === 'amd64' && m.platform?.os === 'linux'
        );
        const selectedManifest = preferredPlatform || manifests[0];
        
        if (selectedManifest?.digest) {
          console.log(`[Registry] Selected platform manifest`, { 
            host, repository, tag, 
            platform: selectedManifest.platform,
            digest: selectedManifest.digest 
          });
          
          // Fetch the specific platform manifest
          const platformManifestUrl = `${baseUrl}/v2/${repository}/manifests/${selectedManifest.digest}`;
          const platformResponse = await axios.get(platformManifestUrl, {
            headers: singleManifestHeaders,
            timeout: 10000,
            validateStatus: () => true,
          });
          
          if (platformResponse.status === 200) {
            console.log(`[Registry] Platform manifest OK`, { host, repository, tag, status: platformResponse.status });
            const platformString = `${selectedManifest.platform?.os || 'unknown'}/${selectedManifest.platform?.architecture || 'unknown'}`;
            return this.extractDigestAndTimestamp(platformResponse, baseUrl, repository, tag, platformString);
          } else {
            console.warn(`[Registry] Platform manifest failed`, { 
              host, repository, tag, 
              status: platformResponse.status,
              error: platformResponse.data 
            });
          }
        } else {
          console.warn(`[Registry] No suitable platform found in manifest list`, { 
            host, repository, tag, 
            availableManifests: manifests.length 
          });
        }
      } else {
        // Not a manifest list, treat as single manifest
        console.log(`[Registry] Single manifest (not list)`, { host, repository, tag });
        return this.extractDigestAndTimestamp(response, baseUrl, repository, tag);
      }
    } else if (response.status === 404) {
      console.log(`[Registry] Manifest list not found, trying single manifest`, { host, repository, tag });
    } else if (response.status === 429) {
      // Rate limited - retry with exponential backoff
      const maxRetries = this.getRegistryMaxRetries(host);
      if (retryCount < maxRetries) {
        const delay = this.getRegistryDelay(host) * Math.pow(2, retryCount);
        console.log(`[Registry] Rate limited, retrying in ${delay}ms`, { host, repository, tag, retryCount: retryCount + 1, maxRetries });
        await this.sleep(delay);
        return this.fetchDigestWithAuth(host, repository, tag, retryCount + 1);
      } else {
        console.warn(`[Registry] Max retries exceeded for rate limiting`, { host, repository, tag, retryCount, maxRetries });
        throw new Error(`Rate limited after ${maxRetries} retries`);
      }
    } else {
      console.log(`[Registry] Manifest list request failed`, { 
        host, repository, tag, 
        status: response.status, 
        error: response.data 
      });
    }

    // Fallback to single manifest if manifest list failed
    console.log(`[Registry] Trying single manifest`, { host, repository, tag });
    response = await axios.get(manifestUrl, {
      headers: singleManifestHeaders,
      timeout: 10000,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      console.log(`[Registry] Single manifest OK`, { host, repository, tag, status: response.status, contentType: response.headers['content-type'] });
      return this.extractDigestAndTimestamp(response, baseUrl, repository, tag);
    }

    if (response.status === 404) {
      console.warn(`[Registry] Manifest not found`, { host, repository, tag, status: response.status });
      throw new Error(`Image not found: ${repository}:${tag} (404 - Image may not exist or be private)`);
    }

    if (response.status === 429) {
      // Rate limited - retry with exponential backoff
      const maxRetries = this.getRegistryMaxRetries(host);
      if (retryCount < maxRetries) {
        const delay = this.getRegistryDelay(host) * Math.pow(2, retryCount);
        console.log(`[Registry] Rate limited on single manifest, retrying in ${delay}ms`, { host, repository, tag, retryCount: retryCount + 1, maxRetries });
        await this.sleep(delay);
        return this.fetchDigestWithAuth(host, repository, tag, retryCount + 1);
      } else {
        console.warn(`[Registry] Max retries exceeded for rate limiting on single manifest`, { host, repository, tag, retryCount, maxRetries });
        throw new Error(`Rate limited after ${maxRetries} retries`);
      }
    }

    if (response.status === 401) {
      const wwwAuth = response.headers['www-authenticate'] as string | undefined;
      console.warn(`[Registry] Manifest unauthorized`, { host, repository, tag, status: response.status, wwwAuth });
      if (!wwwAuth) throw new Error(`Unauthorized and no WWW-Authenticate header from ${host}`);

      // Parse Bearer realm,service,scope
      const realmMatch = /realm="([^"]+)"/.exec(wwwAuth);
      const serviceMatch = /service="([^"]+)"/.exec(wwwAuth);
      const scopeMatch = /scope="([^"]+)"/.exec(wwwAuth);

      const realm = realmMatch?.[1];
      const service = serviceMatch?.[1];
      // Ensure we have pull scope
      const scope = scopeMatch?.[1] || `repository:${repository}:pull`;
      if (!realm || !service) throw new Error(`Malformed WWW-Authenticate header from ${host}`);

      console.log(`[Registry] Token request`, { realm, service, scope });
      const tokenResp = await axios.get(realm, {
        params: { service, scope },
        timeout: 15000, // Increased timeout for token requests
        validateStatus: () => true,
      });
      
      console.log(`[Registry] Token response`, { status: tokenResp.status, hasToken: !!tokenResp.data?.token });
      if (tokenResp.status !== 200 || !tokenResp.data?.token) {
        console.warn(`[Registry] Token request failed`, { status: tokenResp.status, data: tokenResp.data });
        throw new Error(`Token service failed with status ${tokenResp.status}: ${JSON.stringify(tokenResp.data)}`);
      }

      const token = tokenResp.data.token as string;
      
      // Retry with authentication - try manifest list first, then single manifest
      console.log(`[Registry] Retrying with Bearer token - trying manifest list first`);
      let authResponse = await axios.get(manifestUrl, {
        headers: { ...manifestListHeaders, Authorization: `Bearer ${token}` },
        timeout: 15000,
        validateStatus: () => true,
      });
      
      if (authResponse.status === 200) {
        const contentType = authResponse.headers['content-type'] || '';
        console.log(`[Registry] Authenticated manifest list OK`, { host, repository, tag, status: authResponse.status, contentType });
        
        // Check if this is actually a manifest list
        if (contentType.includes('manifest.list') || contentType.includes('image.index') || 
            (authResponse.data && (authResponse.data.manifests || authResponse.data.mediaType?.includes('manifest.list')))) {
          console.log(`[Registry] Processing authenticated manifest list`, { host, repository, tag });
          
          // Find a suitable platform manifest (prefer linux/amd64)
          const manifests = authResponse.data?.manifests || [];
          const preferredPlatform = manifests.find((m: any) => 
            m.platform?.architecture === 'amd64' && m.platform?.os === 'linux'
          );
          const selectedManifest = preferredPlatform || manifests[0];
          
          if (selectedManifest?.digest) {
            console.log(`[Registry] Selected authenticated platform manifest`, { 
              host, repository, tag, 
              platform: selectedManifest.platform,
              digest: selectedManifest.digest 
            });
            
            // Fetch the specific platform manifest
            const platformManifestUrl = `${baseUrl}/v2/${repository}/manifests/${selectedManifest.digest}`;
            const platformResponse = await axios.get(platformManifestUrl, {
              headers: { ...singleManifestHeaders, Authorization: `Bearer ${token}` },
              timeout: 15000,
            validateStatus: () => true,
          });
            
            if (platformResponse.status === 200) {
              console.log(`[Registry] Authenticated platform manifest OK`, { host, repository, tag, status: platformResponse.status });
              const platformString = `${selectedManifest.platform?.os || 'unknown'}/${selectedManifest.platform?.architecture || 'unknown'}`;
              return this.extractDigestAndTimestamp(platformResponse, baseUrl, repository, tag, platformString);
            } else {
              console.warn(`[Registry] Authenticated platform manifest failed`, { 
                host, repository, tag, 
                status: platformResponse.status,
                error: platformResponse.data 
              });
            }
          } else {
            console.warn(`[Registry] No suitable platform found in authenticated manifest list`, { 
              host, repository, tag, 
              availableManifests: manifests.length 
            });
          }
        } else {
          // Not a manifest list, treat as single manifest
          console.log(`[Registry] Authenticated single manifest (not list)`, { host, repository, tag });
          return this.extractDigestAndTimestamp(authResponse, baseUrl, repository, tag);
        }
      } else if (authResponse.status === 404) {
        console.log(`[Registry] Authenticated manifest list not found, trying single manifest`);
      } else if (authResponse.status === 429) {
        // Rate limited on authenticated manifest list - retry with exponential backoff
        const maxRetries = this.getRegistryMaxRetries(host);
        if (retryCount < maxRetries) {
          const delay = this.getRegistryDelay(host) * Math.pow(2, retryCount);
          console.log(`[Registry] Rate limited on authenticated manifest list, retrying in ${delay}ms`, { host, repository, tag, retryCount: retryCount + 1, maxRetries });
          await this.sleep(delay);
          return this.fetchDigestWithAuth(host, repository, tag, retryCount + 1);
        } else {
          console.warn(`[Registry] Max retries exceeded for rate limiting on authenticated manifest list`, { host, repository, tag, retryCount, maxRetries });
          throw new Error(`Rate limited after ${maxRetries} retries`);
        }
      } else {
        console.log(`[Registry] Authenticated manifest list request failed`, { 
          host, repository, tag, 
          status: authResponse.status, 
          error: authResponse.data 
        });
      }

      // Fallback to single manifest with auth
      console.log(`[Registry] Retrying single manifest with Bearer token`);
      authResponse = await axios.get(manifestUrl, {
        headers: { ...singleManifestHeaders, Authorization: `Bearer ${token}` },
        timeout: 15000,
        validateStatus: () => true,
      });
      
      console.log(`[Registry] Authenticated manifest response`, { status: authResponse.status });

      if (authResponse.status === 200) {
        console.log(`[Registry] Authenticated single manifest OK`, { host, repository, tag, status: authResponse.status, contentType: authResponse.headers['content-type'] });
        return this.extractDigestAndTimestamp(authResponse, baseUrl, repository, tag);
      } else if (authResponse.status === 429) {
        // Rate limited on authenticated single manifest - retry with exponential backoff
        const maxRetries = this.getRegistryMaxRetries(host);
        if (retryCount < maxRetries) {
          const delay = this.getRegistryDelay(host) * Math.pow(2, retryCount);
          console.log(`[Registry] Rate limited on authenticated single manifest, retrying in ${delay}ms`, { host, repository, tag, retryCount: retryCount + 1, maxRetries });
          await this.sleep(delay);
          return this.fetchDigestWithAuth(host, repository, tag, retryCount + 1);
        } else {
          console.warn(`[Registry] Max retries exceeded for rate limiting on authenticated single manifest`, { host, repository, tag, retryCount, maxRetries });
          throw new Error(`Rate limited after ${maxRetries} retries`);
        }
      } else {
        console.warn(`[Registry] Authenticated manifest failed`, { host, repository, tag, status: authResponse.status, data: authResponse.data });
        throw new Error(`Manifest fetch failed after auth with status ${authResponse.status}`);
      }
    }

    console.warn(`[Registry] Manifest unexpected status`, { host, repository, tag, status: response.status, headers: response.headers, data: response.data });
    throw new Error(`Registry responded with status ${response.status}`);
  }
  // Helper method to determine if a string looks like a registry domain
  private static isRegistryDomain(domain: string): boolean {
    return domain.includes('.');
  }


  private static parseImagePath(imagePath: string): ParsedImage {
    // Remove tag from imagePath for parsing (e.g., "nginx:latest" -> "nginx")
    const [imageWithoutTag] = imagePath.split(':');
    
    console.log(`[ParseImage] Parsing image path: "${imagePath}" -> "${imageWithoutTag}"`);
    
    // Handle known registries first
    if (imageWithoutTag.startsWith('ghcr.io/')) {
      const path = imageWithoutTag.replace('ghcr.io/', '');
      const parts = path.split('/');
      if (parts.length >= 2) {
        return {
          registry: 'github',
          namespace: parts[0],
          image: parts[1],
          fullPath: imagePath
        };
      }
    }
    
    if (imageWithoutTag.startsWith('lscr.io/')) {
      const path = imageWithoutTag.replace('lscr.io/', '');
      const parts = path.split('/');
      if (parts.length >= 2) {
        return {
          registry: 'lscr',
          namespace: parts[0],
          image: parts[1],
          fullPath: imagePath
        };
      }
    }
    
    if (imageWithoutTag.startsWith('docker.io/') || imageWithoutTag.startsWith('registry.hub.docker.com/')) {
      const path = imageWithoutTag.replace(/^(docker\.io\/|registry\.hub\.docker\.com\/)/, '');
      const parts = path.split('/');
      if (parts.length >= 2) {
        return {
          registry: 'dockerhub',
          namespace: parts[0],
          image: parts[1],
          fullPath: imagePath
        };
      } else if (parts.length === 1) {
        // Official image like docker.io/nginx
        return {
          registry: 'dockerhub',
          namespace: 'library',
          image: parts[0],
          fullPath: imagePath
        };
      }
    }
    
    // For MVP, any other registry domain is unsupported
    const parts = imageWithoutTag.split('/');
    if (parts.length >= 2 && this.isRegistryDomain(parts[0])) {
      return {
        registry: 'unsupported',
        namespace: parts[1],
        image: parts.slice(2).join('/') || parts[1],
        fullPath: imagePath,
        registryDomain: parts[0]
      }
    }
    
    // Handle short paths (most common case) - assume Docker Hub
    if (parts.length === 2) {
      // user/image format - assume Docker Hub
      const result = {
        registry: 'dockerhub' as const,
        namespace: parts[0],
        image: parts[1],
        fullPath: imagePath
      };
      console.log(`[ParseImage] Parsed as Docker Hub:`, result);
      return result;
    } else if (parts.length === 1) {
      // Single name like "nginx" - assume Docker Hub official image
      return {
        registry: 'dockerhub',
        namespace: 'library',
        image: parts[0],
        fullPath: imagePath
      };
    }
    
    // Default to Docker Hub for single name images
    return {
      registry: 'dockerhub',
      namespace: 'library',
      image: imageWithoutTag,
      fullPath: imagePath
    };
  }
  // Utilities for semver handling without external deps
  private static parseSemver(tag: string): { major: number, minor: number, patch: number } | null {
    const match = tag.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
  }

  private static compareSemver(a: { major: number, minor: number, patch: number }, b: { major: number, minor: number, patch: number }): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  private static async listDockerHubTags(image: string, pageSize: number = 100, maxPages: number = 3): Promise<Array<{ name: string, last_updated?: string }>> {
    const tags: Array<{ name: string, last_updated?: string }> = [];
    let url = `https://hub.docker.com/v2/repositories/${image}/tags?page_size=${pageSize}&ordering=-last_updated`;
    for (let page = 0; page < maxPages && url; page++) {
      const response = await axios.get(url, {
        headers: { 'Accept': 'application/json' },
        timeout: 5000,
        validateStatus: () => true,
      });
      if (response.status === 429) throw new Error('Docker Hub API rate limited');
      if (response.status === 404) throw new Error(`Repository not found: ${image}`);
      if (response.status !== 200) throw new Error(`Docker Hub API failed with status ${response.status}`);
      const data = response.data;
      if (Array.isArray(data.results)) {
        for (const r of data.results) {
          tags.push({ name: r.name, last_updated: r.last_updated });
        }
      }
      url = data.next || '';
    }
    return tags;
  }

  private static async resolveDockerHubLatestByDigest(image: string): Promise<{ tag: string, lastUpdated?: string } | undefined> {
    try {
      console.log(`[DockerHub] Resolving latest version by digest for ${image}`);
      // First get the digest for the 'latest' tag
      const latestManifest = await this.getDockerHubManifest(image, 'latest');
      const latestDigest = latestManifest.sha;
      console.log(`[DockerHub] Latest digest: ${latestDigest.substring(0, 12)}...`);
      
      // List tags and find semver tags matching the latest digest
      const tags = await this.listDockerHubTags(image);
      console.log(`[DockerHub] Found ${tags.length} tags to check`);
      
      let bestTag: { name: string, last_updated?: string } | null = null;
      let bestSemver: { major: number, minor: number, patch: number } | null = null;
      let matchingTags: string[] = [];
      let allMatchingTags: string[] = [];
      
      for (const t of tags) {
        try {
          const manifest = await this.fetchDigestWithAuth('registry-1.docker.io', image.includes('/') ? image : `library/${image}`, t.name);
          if (manifest.sha === latestDigest) {
            allMatchingTags.push(t.name);
            const parsed = this.parseSemver(t.name);
            if (parsed) {
              matchingTags.push(t.name);
              if (!bestSemver || this.compareSemver(parsed, bestSemver) > 0) {
                bestSemver = parsed;
                bestTag = t;
              }
            }
          }
        } catch {
          // Ignore individual tag fetch failures
        }
      }
      
      console.log(`[DockerHub] All tags matching latest digest: [${allMatchingTags.join(', ')}]`);
      console.log(`[DockerHub] Semver tags matching latest digest: [${matchingTags.join(', ')}]`);
      
      if (bestTag) {
        // Sort all matching tags: semver tags first (highest to lowest), then non-semver tags
        const semverTags = allMatchingTags.filter(t => this.parseSemver(t)).sort((a, b) => {
          const aParsed = this.parseSemver(a)!;
          const bParsed = this.parseSemver(b)!;
          return this.compareSemver(bParsed, aParsed); // Descending order
        });
        const nonSemverTags = allMatchingTags.filter(t => !this.parseSemver(t)).sort();
        const sortedTags = [...semverTags, ...nonSemverTags];
        
        const displayTag = sortedTags.join(', ');
        console.log(`[DockerHub] Selected tags: ${displayTag}`);
        return { tag: displayTag, lastUpdated: bestTag.last_updated };
      }
      
      // Fallback: if no semver tag matches, return 'latest'
      console.log(`[DockerHub] No semver tags match latest digest, falling back to 'latest'`);
      return { tag: 'latest', lastUpdated: latestManifest.lastUpdated };
    } catch (e) {
      console.warn('[DockerHub] Failed to resolve latest by digest', e);
      return undefined;
    }
  }

  private static async getDockerHubManifest(image: string, tag: string, retryCount: number = 0): Promise<{sha: string, lastUpdated?: string, platform?: string}> {
    // Prefer Docker Registry v2 token flow via registry-1.docker.io to avoid Hub API 429s
    try {
      const repository = image.includes('/') ? image : `library/${image}`;
      console.log(`[DockerHub] Using registry v2 for manifest`, { repository, tag });
      
      
      return await this.fetchDigestWithAuth('registry-1.docker.io', repository, tag);
    } catch (primaryError) {
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.warn(`[DockerHub] Registry v2 manifest fetch failed, falling back to Hub API`, { image, tag, error: primaryMsg });
      try {
        console.log(`Attempting Docker Hub API for: ${image}:${tag}`);
        
        
        const response = await axios.get(
          `https://hub.docker.com/v2/repositories/${image}/tags/${tag}`,
          {
            headers: { 'Accept': 'application/json' },
            timeout: 5000,
            validateStatus: () => true, // Don't throw on 404
          }
        );
        
        if (response.status === 404) {
          throw new Error(`Image not found: ${image}:${tag} (404 - Image may not exist or be private)`);
        }
        
        if (response.status === 429) {
          // Rate limited on Docker Hub API - retry with exponential backoff
          const maxRetries = this.getRegistryMaxRetries('registry-1.docker.io');
          if (retryCount < maxRetries) {
            const delay = this.getRegistryDelay('registry-1.docker.io') * Math.pow(2, retryCount);
            console.log(`[DockerHub] Rate limited on Hub API, retrying in ${delay}ms`, { image, tag, retryCount: retryCount + 1, maxRetries });
            await this.sleep(delay);
            return this.getDockerHubManifest(image, tag, retryCount + 1);
          } else {
            console.warn(`[DockerHub] Max retries exceeded for rate limiting on Hub API`, { image, tag, retryCount, maxRetries });
            throw new Error(`Docker Hub API rate limited after ${maxRetries} retries`);
          }
        }
        
        if (response.status !== 200) {
          throw new Error(`Docker Hub API returned status ${response.status}: ${response.statusText}`);
        }
        console.log(`[DockerHub] tag API response`, { status: response.status, rateLimit: response.headers['ratelimit-remaining'], reset: response.headers['ratelimit-reset'] });
        const sha = response.data.images?.[0]?.digest || response.data.id || '';
        const lastUpdated = response.data.last_updated || response.data.tag_last_pushed || response.data.last_pushed;
        if (sha) {
          return { sha, lastUpdated };
        }
        throw new Error('No SHA found in Docker Hub response');
      } catch (fallbackError) {
        const err: any = fallbackError;
        const status = err?.response?.status;
        const data = err?.response?.data;
        const headers = err?.response?.headers;
        const errorMessage = err?.message || 'Unknown error';
        
        console.warn(`[DockerHub] tag API failed`, { 
          image, 
          tag, 
          status, 
          data, 
          errorMessage,
          headers: headers ? { 
            'ratelimit-remaining': headers['ratelimit-remaining'], 
            'ratelimit-reset': headers['ratelimit-reset'] 
          } : undefined 
        });
        
        // Provide more specific error message based on the error type
        if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') {
          throw new Error(`Docker Hub API connection failed: ${errorMessage}`);
        } else if (err?.code === 'ETIMEDOUT') {
          throw new Error(`Docker Hub API timeout: ${errorMessage}`);
        } else if (status === 404) {
          throw new Error(`Image not found: ${image}:${tag} (404 - Image may not exist or be private)`);
        } else if (status === 429) {
          throw new Error(`Docker Hub API rate limited: ${errorMessage}`);
        } else {
          throw new Error(`Docker Hub API failed: ${errorMessage}`);
        }
      }
    }
  }

  private static async getGitHubManifest(namespace: string, image: string, tag: string): Promise<{sha: string, lastUpdated?: string, platform?: string}> {
    // Use generic Docker Registry v2 flow
    return this.fetchDigestWithAuth('ghcr.io', `${namespace}/${image}`, tag);
  }

  private static async getLscrManifest(namespace: string, image: string, tag: string): Promise<{sha: string, lastUpdated?: string, platform?: string}> {
    // Use generic Docker Registry v2 flow
    return this.fetchDigestWithAuth('lscr.io', `${namespace}/${image}`, tag);
  }


  static async checkRegistry(container: ContainerRegistry): Promise<RegistryCheckResult> {
    const now = new Date().toISOString();
    const tag = container.tag || 'latest'; // Default to 'latest' if no tag specified
    
    // Parse the image path to detect registry type
    const parsed = this.parseImagePath(container.imagePath);
    
    console.log(`[Check] Starting check`, { imagePath: container.imagePath, tag, parsed });
    let latestSha: string = '';
    let lastUpdated: string | undefined = undefined;
    let errorMessage: string | undefined = undefined;
    let platform: string | undefined = undefined;
    let latestAvailableTag: string | undefined = undefined;
    let latestAvailableUpdated: string | undefined = undefined;
      
      if (parsed.registry === 'dockerhub') {
      const fullImagePath = parsed.namespace === 'library' ? parsed.image : `${parsed.namespace}/${parsed.image}`;
      try {
          const result = await this.getDockerHubManifest(fullImagePath, tag);
          latestSha = result.sha;
          lastUpdated = result.lastUpdated;
        platform = result.platform;
        console.log(`[Check] Docker Hub OK`, { image: fullImagePath, tag, sha: latestSha.substring(0, 12), platform });
        
        // Also resolve Latest Version by matching 'latest' digest to highest semver tag
        try {
          const latestResolved = await this.resolveDockerHubLatestByDigest(fullImagePath);
          if (latestResolved) {
            latestAvailableTag = latestResolved.tag;
            latestAvailableUpdated = latestResolved.lastUpdated;
            console.log(`[Check] Resolved latest version`, { image: fullImagePath, latestAvailableTag });
          }
        } catch (latestError) {
          console.warn(`[Check] Could not resolve latest version for ${fullImagePath}:`, latestError);
          // Don't fail the whole check if we can't get latest info
        }
        } catch (e) {
        errorMessage = 'check image and tag and try again';
        console.error(`[Check] Docker Hub error`, { image: fullImagePath, tag, error: e instanceof Error ? e.message : String(e) });
        }
      } else if (parsed.registry === 'github') {
        try {
          const result = await this.getGitHubManifest(parsed.namespace, parsed.image, tag);
          latestSha = result.sha;
          lastUpdated = result.lastUpdated;
        platform = result.platform;
        console.log(`[Check] GHCR OK`, { image: `${parsed.namespace}/${parsed.image}`, tag, sha: latestSha.substring(0, 12), platform });
        } catch (e) {
        errorMessage = 'check image and tag and try again';
        console.error(`[Check] GHCR error`, { image: `${parsed.namespace}/${parsed.image}`, tag, error: e instanceof Error ? e.message : String(e) });
        }
      } else if (parsed.registry === 'lscr') {
        try {
          const result = await this.getLscrManifest(parsed.namespace, parsed.image, tag);
          latestSha = result.sha;
          lastUpdated = result.lastUpdated;
        platform = result.platform;
        console.log(`[Check] LSCR OK`, { image: `${parsed.namespace}/${parsed.image}`, tag, sha: latestSha.substring(0, 12), platform });
        } catch (e) {
        errorMessage = 'check image and tag and try again';
        console.error(`[Check] LSCR error`, { image: `${parsed.namespace}/${parsed.image}`, tag, error: e instanceof Error ? e.message : String(e) });
      }
    } else if (parsed.registry === 'unsupported') {
      errorMessage = 'check image and tag and try again';
      console.warn(`[Check] Unsupported registry`, { imagePath: container.imagePath, registryDomain: parsed.registryDomain });
      }

      return {
        image: parsed.fullPath,
      tag,
      currentSha: '',
        latestSha,
      hasUpdate: false,
        lastChecked: now,
        lastUpdated,
      statusMessage: errorMessage,
      error: Boolean(errorMessage),
      platform,
      latestAvailableTag,
      latestAvailableUpdated,
    };
  }

  static async checkAllRegistries(containers: ContainerRegistry[]): Promise<RegistryCheckResult[]> {
    const results: RegistryCheckResult[] = [];
    
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
        const result = await this.checkRegistry(container);
        results.push(result);
      
      // Add delay between images (except for the last one)
      if (i < containers.length - 1) {
        const parsed = this.parseImagePath(container.imagePath);
        let delay = 1000; // Default delay
        
        if (parsed.registry === 'dockerhub') {
          delay = this.getRegistryDelay('registry-1.docker.io');
        } else if (parsed.registry === 'github') {
          delay = this.getRegistryDelay('ghcr.io');
        } else if (parsed.registry === 'lscr') {
          delay = this.getRegistryDelay('lscr.io');
        }
        
        console.log(`[Check] Waiting ${delay}ms before next image check`);
        await this.sleep(delay);
      }
    }
    
    return results;
  }

  static async updateContainerStates(
    checkResults: RegistryCheckResult[],
    currentStates: ContainerState[]
  ): Promise<ContainerState[]> {
    const updatedStates: ContainerState[] = [...currentStates];
    
    for (const result of checkResults) {
      const existingStateIndex = updatedStates.findIndex(
        state => state.image === result.image && state.tag === result.tag
      );
      
      let hasUpdate: boolean = false;
      
      if (!result.error) {
      if (existingStateIndex >= 0) {
        const existingState = updatedStates[existingStateIndex];
        const isFirstCheck = !existingState.currentSha || existingState.currentSha === '';
        if (isFirstCheck) {
          hasUpdate = false;
          } else {
            hasUpdate = existingState.currentSha !== result.latestSha;
          }
        } else {
          hasUpdate = false;
        }
      }
      
      const isFirstTime = existingStateIndex < 0;
      const existingState = existingStateIndex >= 0 ? updatedStates[existingStateIndex] : undefined;
      const wasNeverChecked = existingState ? (!existingState.currentSha || existingState.currentSha === '') : false;
      
      // Determine if a newer semver tag exists compared to the monitored tag
      let hasNewerTag: boolean = false;
      const monitoredSemver = this.parseSemver(result.tag);
      if (monitoredSemver && result.latestAvailableTag) {
        // latestAvailableTag may contain multiple tags (e.g., "1.2.2, latest")
        const candidateTags = result.latestAvailableTag.split(',').map(s => s.trim());
        let bestSemver: { major: number; minor: number; patch: number } | null = null;
        for (const t of candidateTags) {
          const parsed = this.parseSemver(t);
          if (!parsed) continue;
          if (!bestSemver || this.compareSemver(parsed, bestSemver) > 0) {
            bestSemver = parsed;
          }
        }
        if (bestSemver && this.compareSemver(bestSemver, monitoredSemver) > 0) {
          hasNewerTag = true;
        }
      }

      const newState: ContainerState = {
        image: result.image,
        tag: result.tag,
        currentSha: result.error ? (existingState?.currentSha || '') : result.latestSha,
        lastChecked: result.lastChecked,
        hasUpdate: result.error ? (existingState?.hasUpdate || false) : hasUpdate,
        hasNewerTag: result.error ? existingState?.hasNewerTag : hasNewerTag,
        latestSha: result.error ? existingState?.latestSha : result.latestSha,
        lastUpdated: result.error ? existingState?.lastUpdated : result.lastUpdated,
        isNew: result.error ? false : (isFirstTime || wasNeverChecked),
        statusMessage: result.error ? 'check image and tag and try again' : undefined,
        error: result.error ? true : false,
        platform: result.error ? existingState?.platform : result.platform,
        latestAvailableTag: result.error ? existingState?.latestAvailableTag : result.latestAvailableTag,
        latestAvailableUpdated: result.error ? existingState?.latestAvailableUpdated : result.latestAvailableUpdated,
      };
      
      if (existingStateIndex >= 0) {
        updatedStates[existingStateIndex] = newState;
      } else {
        updatedStates.push(newState);
      }
    }
    
    return updatedStates;
  }
}
