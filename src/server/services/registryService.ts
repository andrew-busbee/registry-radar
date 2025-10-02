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
  // Token cache to reduce API calls
  private static tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

  // Registry-specific delays to handle rate limiting
  private static readonly REGISTRY_DELAYS = {
    'registry-1.docker.io': 500,   // 500ms for Docker Hub (reduced from 2s)
    'ghcr.io': 200,                // 200ms for GHCR (reduced from 1s)
    'lscr.io': 200,                // 200ms for LSCR (reduced from 1s)
  } as const;

  // Registry-specific max retries
  private static readonly REGISTRY_MAX_RETRIES = {
    'registry-1.docker.io': 0,     // 0 retries for Docker Hub (fail fast to reduce API calls)
    'ghcr.io': 1,                  // 1 retry for GHCR (reduced from 3)
    'lscr.io': 1,                  // 1 retry for LSCR (reduced from 3)
  } as const;

  // Helper method to get delay for a specific registry
  private static getRegistryDelay(host: string): number {
    return this.REGISTRY_DELAYS[host as keyof typeof this.REGISTRY_DELAYS] || 200;
  }

  // Helper method to get max retries for a specific registry
  private static getRegistryMaxRetries(host: string): number {
    return this.REGISTRY_MAX_RETRIES[host as keyof typeof this.REGISTRY_MAX_RETRIES] || 1;
  }

  // Helper method to sleep for a specified duration
  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to get cached token
  private static getCachedToken(cacheKey: string): string | null {
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Registry] Using cached token`, { cacheKey, expiresIn: Math.round((cached.expiresAt - Date.now()) / 1000) + 's' });
      return cached.token;
    }
    if (cached) {
      this.tokenCache.delete(cacheKey); // Clean up expired token
    }
    return null;
  }

  // Helper method to cache token
  private static cacheToken(cacheKey: string, token: string, expiresIn: number = 300): void {
    const expiresAt = Date.now() + (expiresIn * 1000); // Default 5 minutes
    this.tokenCache.set(cacheKey, { token, expiresAt });
    console.log(`[Registry] Cached token`, { cacheKey, expiresIn: expiresIn + 's' });
  }

  // Helper method to get Docker Hub credentials from environment variables
  private static getDockerHubCredentials(): { username: string; password: string } | null {
    const username = process.env.DOCKERHUB_USERNAME;
    const password = process.env.DOCKERHUB_PASSWORD;
    
    if (username && password) {
      console.log(`[DockerHub] Using authenticated access`, { username });
      return { username, password };
    }
    
    return null;
  }

  // Helper method to normalize SHA values for consistent comparison
  static normalizeSha(sha: string): string {
    if (!sha || sha === '') {
      return '';
    }
    
    // Remove common prefixes and normalize format
    let normalized = sha.trim().toLowerCase();
    
    // Remove 'sha256:' prefix if present
    if (normalized.startsWith('sha256:')) {
      normalized = normalized.substring(7);
    }
    
    // Remove 'sha1:' prefix if present
    if (normalized.startsWith('sha1:')) {
      normalized = normalized.substring(5);
    }
    
    // Ensure we have a valid hex string (basic validation)
    if (!/^[a-f0-9]+$/.test(normalized)) {
      console.warn(`Invalid SHA format detected: ${sha}, returning original`);
      return sha;
    }
    
    return normalized;
  }

  // Helper method to compare two SHA values consistently
  static compareShas(sha1: string, sha2: string): boolean {
    const normalized1 = this.normalizeSha(sha1);
    const normalized2 = this.normalizeSha(sha2);
    
    // If either is empty, they're only equal if both are empty
    if (!normalized1 || !normalized2) {
      return normalized1 === normalized2;
    }
    
    const areEqual = normalized1 === normalized2;
    
    // Log SHA comparison for debugging (only when they differ)
    if (!areEqual) {
      console.log(`SHA comparison - Original: "${sha1}" vs "${sha2}" | Normalized: "${normalized1}" vs "${normalized2}" | Equal: ${areEqual}`);
    }
    
    return areEqual;
  }

  // Helper method to extract digest and timestamp from a manifest response
  private static async extractDigestAndTimestamp(
    response: any,
    baseUrl: string,
    repository: string,
    tag: string,
    platform?: string,
    token?: string
  ): Promise<{ sha: string; lastUpdated?: string; platform?: string }> {
      const digest = response.headers['docker-content-digest'] || response.data?.config?.digest || response.data?.digest || '';
      const sha = String(digest || '').replace('sha256:', '');

      let lastUpdated: string | undefined = undefined;
      try {
        const configDigest = response.data?.config?.digest;
        if (configDigest) {
          const blobUrl = `${baseUrl}/v2/${repository}/blobs/${configDigest}`;
          const headers: Record<string, string> = { 'Accept': 'application/octet-stream' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const blobResp = await axios.get(blobUrl, {
            headers,
            timeout: 10000,
            validateStatus: () => true,
          });
        console.log(`[Registry] Blob fetch`, { host: baseUrl.replace('https://', ''), repository, tag, status: blobResp.status, hasAuth: !!token });
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
            return this.extractDigestAndTimestamp(platformResponse, baseUrl, repository, tag, platformString, undefined);
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
        return this.extractDigestAndTimestamp(response, baseUrl, repository, tag, undefined, undefined);
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
      return this.extractDigestAndTimestamp(response, baseUrl, repository, tag, undefined, undefined);
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

      // Check token cache first
      const tokenCacheKey = `${host}:${service}:${scope}`;
      let token = this.getCachedToken(tokenCacheKey);
      
      if (!token) {
        // Check if Docker Hub credentials are available for authenticated requests
        const credentials = host === 'registry-1.docker.io' ? this.getDockerHubCredentials() : null;
        const isAuthenticated = !!credentials;
        
        console.log(`[Registry] Token request ${isAuthenticated ? '(authenticated)' : '(anonymous)'}`, { realm, service, scope });
        
        // Prepare request headers with Basic Auth if credentials available
        const headers: Record<string, string> = {};
        if (credentials) {
          const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${authString}`;
        }
        
        const tokenResp = await axios.get(realm, {
          params: { service, scope },
          headers: headers,
          timeout: 15000, // Increased timeout for token requests
          validateStatus: () => true,
        });
        
        // Parse rate limit headers if available
        const rateLimitRemaining = tokenResp.headers['ratelimit-remaining'];
        const rateLimitLimit = tokenResp.headers['ratelimit-limit'];
        const rateLimitReset = tokenResp.headers['ratelimit-reset'];
        
        console.log(`[Registry] Token response`, { 
          status: tokenResp.status, 
          hasToken: !!tokenResp.data?.token,
          authenticated: isAuthenticated,
          rateLimit: rateLimitLimit ? `${rateLimitRemaining}/${rateLimitLimit}` : undefined,
          resetTime: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : undefined
        });
        
        if (tokenResp.status !== 200 || !tokenResp.data?.token) {
          console.warn(`[Registry] Token request failed`, { status: tokenResp.status, data: tokenResp.data });
          throw new Error(`Token service failed with status ${tokenResp.status}: ${JSON.stringify(tokenResp.data)}`);
        }

        token = tokenResp.data.token as string;
        
        // Cache the token (Docker tokens typically expire in 5 minutes)
        this.cacheToken(tokenCacheKey, token, 300);
      }
      
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
              return this.extractDigestAndTimestamp(platformResponse, baseUrl, repository, tag, platformString, token);
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
          return this.extractDigestAndTimestamp(authResponse, baseUrl, repository, tag, undefined, token);
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
        return this.extractDigestAndTimestamp(authResponse, baseUrl, repository, tag, undefined, token);
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

  // Helper function to check if a tag should be treated like a v-prefixed version (skip version resolution)
  private static isVersionSpecificTag(tag: string): boolean {
    // Match v-prefixed versions like v1.2.3
    const vPrefixedPattern = /^v\d+\.\d+\.\d+/;
    // Match versions with additional characters after semantic version like 0.1.0-beta.4, 1.2.3-rc.1, etc.
    const extendedVersionPattern = /^\d+\.\d+\.\d+[^0-9]/;
    return vPrefixedPattern.test(tag) || extendedVersionPattern.test(tag);
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

  private static async getLatestSemverVersionForGHCR(namespace: string, image: string, currentTag: string): Promise<{latestTag: string, latestUpdated?: string}> {
    try {
      // Try to get package versions from GitHub API
      // Note: This may require authentication for some repositories
      const response = await axios.get(`https://api.github.com/orgs/${namespace}/packages/container/${image}/versions`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'registry-radar',
        },
        timeout: 30000, // 30 second timeout for this expensive operation
      });

      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const versions = response.data || [];
      console.log(`[GHCR] Found ${versions.length} total versions for ${namespace}/${image}`);

      // Extract tags from versions and filter to only semver tags
      const allTags: string[] = [];
      versions.forEach((version: any) => {
        if (version.metadata?.container?.tags) {
          allTags.push(...version.metadata.container.tags);
        }
      });

      const semverTags = allTags
        .filter((tagName: string) => this.parseSemver(tagName))
        .sort((a: string, b: string) => {
          const aParsed = this.parseSemver(a)!;
          const bParsed = this.parseSemver(b)!;
          return this.compareSemver(bParsed, aParsed); // Descending order (newest first)
        });

      console.log(`[GHCR] Found ${semverTags.length} semver tags for ${namespace}/${image}`);

      if (semverTags.length === 0) {
        return { latestTag: currentTag }; // No semver tags found, return current tag
      }

      // Return the highest semver version
      const latestTag = semverTags[0];
      return {
        latestTag: latestTag,
        latestUpdated: undefined // GitHub API doesn't provide last updated info in versions list
      };

    } catch (error) {
      // If authentication is required or API fails, gracefully fall back
      console.warn(`[GHCR] Version checking not available for ${namespace}/${image} (authentication required or API unavailable):`, error instanceof Error ? error.message : String(error));
      
      // Return the current tag to indicate no newer version was found
      // This ensures the check doesn't fail and maintains existing functionality
      return { latestTag: currentTag };
    }
  }

  private static async getLatestSemverVersion(image: string, currentTag: string): Promise<{latestTag: string, latestUpdated?: string}> {
    try {
      // Fetch all tags for the image
      const response = await axios.get(`https://hub.docker.com/v2/repositories/${image}/tags/?page_size=100`, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 30000, // 30 second timeout for this expensive operation
      });

      if (response.status !== 200) {
        throw new Error(`Docker Hub tags API returned status ${response.status}`);
      }

      const tags = response.data.results || [];
      console.log(`[DockerHub] Found ${tags.length} total tags for ${image}`);

      // Filter to only semver tags and parse them
      const semverTags = tags
        .map((t: any) => ({ name: t.name, updated: t.last_updated || t.tag_last_pushed }))
        .filter((t: any) => this.parseSemver(t.name))
        .sort((a: any, b: any) => {
          const aParsed = this.parseSemver(a.name)!;
          const bParsed = this.parseSemver(b.name)!;
          return this.compareSemver(bParsed, aParsed); // Descending order (newest first)
        });

      console.log(`[DockerHub] Found ${semverTags.length} semver tags for ${image}`);

      if (semverTags.length === 0) {
        return { latestTag: currentTag }; // No semver tags found, return current tag
      }

      // Return the highest semver version
      const latestTag = semverTags[0];
      return {
        latestTag: latestTag.name,
        latestUpdated: latestTag.updated
      };

    } catch (error) {
      console.error(`[DockerHub] Error fetching latest semver version for ${image}:`, error);
      throw error;
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
        
        // Only do expensive version resolution for clean semver tags (e.g., 1.2.1)
        // Skip version checking for version-specific tags (e.g., v1.2.1, 0.1.0-beta.4) as they're typically static release tags
        const monitoredSemver = this.parseSemver(tag);
        const isVersionSpecific = this.isVersionSpecificTag(tag);
        
        if (monitoredSemver && !isVersionSpecific) {
          console.log(`[Check] Tag "${tag}" is clean semver format, checking for newer versions...`);
          try {
            const latestInfo = await this.getLatestSemverVersion(fullImagePath, tag);
            latestAvailableTag = latestInfo.latestTag;
            latestAvailableUpdated = latestInfo.latestUpdated;
            console.log(`[Check] Latest semver version found`, { 
              current: tag, 
              latest: latestAvailableTag,
              hasNewer: latestAvailableTag !== tag 
            });
          } catch (versionError) {
            console.warn(`[Check] Failed to get latest semver version for ${fullImagePath}:${tag}`, versionError);
            // Don't fail the entire check, just skip version resolution
          }
        } else if (monitoredSemver && isVersionSpecific) {
          console.log(`[Check] Tag "${tag}" is version-specific format, skipping version resolution (typically static release tag)`);
        } else {
          console.log(`[Check] Tag "${tag}" is not semver format, skipping version resolution`);
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
        
        // Only do expensive version resolution for clean semver tags (e.g., 1.2.1)
        // Skip version checking for version-specific tags (e.g., v1.2.1, 0.1.0-beta.4) as they're typically static release tags
        const monitoredSemver = this.parseSemver(tag);
        const isVersionSpecific = this.isVersionSpecificTag(tag);
        
        if (monitoredSemver && !isVersionSpecific) {
          console.log(`[Check] Tag "${tag}" is clean semver format, checking for newer versions...`);
          try {
            const latestInfo = await this.getLatestSemverVersionForGHCR(parsed.namespace, parsed.image, tag);
            latestAvailableTag = latestInfo.latestTag;
            latestAvailableUpdated = latestInfo.latestUpdated;
            console.log(`[Check] Latest semver version found`, { 
              current: tag, 
              latest: latestAvailableTag,
              hasNewer: latestAvailableTag !== tag 
            });
          } catch (versionError) {
            console.warn(`[Check] Failed to get latest semver version for ${parsed.namespace}/${parsed.image}:${tag}`, versionError);
            // Don't fail the entire check, just skip version resolution
          }
        } else if (monitoredSemver && isVersionSpecific) {
          console.log(`[Check] Tag "${tag}" is version-specific format, skipping version resolution (typically static release tag)`);
        } else {
          console.log(`[Check] Tag "${tag}" is not semver format, skipping version resolution`);
        }
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
        let delay = 200; // Default delay (reduced from 1000ms)
        
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
      let updateAcknowledged: boolean = false;
      let updateAcknowledgedAt: string | undefined = undefined;
      
      if (!result.error) {
        if (existingStateIndex >= 0) {
          const existingState = updatedStates[existingStateIndex];
          const isFirstCheck = !existingState.currentSha || existingState.currentSha === '';
          if (isFirstCheck) {
            hasUpdate = false;
            updateAcknowledged = true; // First check is always acknowledged
          } else {
            // Use normalized SHA comparison to handle different formats
            const shaChanged = !this.compareShas(existingState.currentSha, result.latestSha);
            
            if (shaChanged) {
              // SHA changed - this is a new update
              hasUpdate = true;
              updateAcknowledged = false; // User needs to acknowledge this new update
              updateAcknowledgedAt = undefined;
            } else {
              // SHA hasn't changed - check if there's a pending unacknowledged update
              if (existingState.hasUpdate && !existingState.updateAcknowledged) {
                // There's a pending update that user hasn't acknowledged yet
                hasUpdate = true;
                updateAcknowledged = false;
                updateAcknowledgedAt = existingState.updateAcknowledgedAt;
              } else {
                // No update or update was acknowledged
                hasUpdate = false;
                updateAcknowledged = true;
                updateAcknowledgedAt = existingState.updateAcknowledgedAt;
              }
            }
          }
        } else {
          hasUpdate = false;
          updateAcknowledged = true; // New container is always acknowledged
        }
      } else {
        // On error, preserve existing state
        const existingState = existingStateIndex >= 0 ? updatedStates[existingStateIndex] : undefined;
        hasUpdate = existingState?.hasUpdate || false;
        updateAcknowledged = existingState?.updateAcknowledged || true;
        updateAcknowledgedAt = existingState?.updateAcknowledgedAt;
      }
      
      const isFirstTime = existingStateIndex < 0;
      const existingState = existingStateIndex >= 0 ? updatedStates[existingStateIndex] : undefined;
      const wasNeverChecked = existingState ? (!existingState.currentSha || existingState.currentSha === '') : false;
      
      // A container is "new" ONLY if we're establishing the baseline SHA for the first time
      // Once we have a SHA, it's no longer "new" even if it was marked as such before
      const isNewContainer = (isFirstTime || wasNeverChecked) && !result.error;
      
      // Important: If we're successfully getting a SHA now, we're establishing the baseline,
      // so after this update isNew should be false on subsequent checks
      
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

      // If a newer tag is available, require explicit user acknowledgment
      if (!result.error && hasNewerTag) {
        updateAcknowledged = false;
        updateAcknowledgedAt = undefined;
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
        isNew: result.error ? false : isNewContainer,
        statusMessage: result.error ? 'check image and tag and try again' : undefined,
        error: result.error ? true : false,
        platform: result.error ? existingState?.platform : result.platform,
        latestAvailableTag: result.error ? existingState?.latestAvailableTag : result.latestAvailableTag,
        latestAvailableUpdated: result.error ? existingState?.latestAvailableUpdated : result.latestAvailableUpdated,
        updateAcknowledged: result.error ? (existingState?.updateAcknowledged || true) : updateAcknowledged,
        updateAcknowledgedAt: result.error ? existingState?.updateAcknowledgedAt : updateAcknowledgedAt,
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
