import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

interface Migration {
  version: number;
  name: string;
  up: (db: sqlite3.Database) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db) => {
      return new Promise((resolve, reject) => {
        // Container registries table
        db.exec(`
          CREATE TABLE IF NOT EXISTS containers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_path TEXT NOT NULL,
            tag TEXT DEFAULT 'latest',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `, (err) => {
          if (err) return reject(err);
          
          // Container states table
          db.exec(`
            CREATE TABLE IF NOT EXISTS container_states (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              image TEXT NOT NULL,
              tag TEXT NOT NULL,
              current_sha TEXT NOT NULL,
              last_checked DATETIME NOT NULL,
              has_update BOOLEAN DEFAULT 0,
              has_newer_tag BOOLEAN DEFAULT 0,
              latest_sha TEXT,
              last_updated DATETIME,
              is_new BOOLEAN DEFAULT 0,
              status_message TEXT,
              error BOOLEAN DEFAULT 0,
              platform TEXT,
              latest_available_tag TEXT,
              latest_available_updated DATETIME,
              update_acknowledged BOOLEAN DEFAULT 0,
              update_acknowledged_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(image, tag)
            );
          `, (err) => {
            if (err) return reject(err);
            
            // Notifications table
            db.exec(`
              CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('update', 'error')),
                message TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                container TEXT,
                read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );
            `, (err) => {
              if (err) return reject(err);
              
              // Cron configuration table
              db.exec(`
                CREATE TABLE IF NOT EXISTS cron_config (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  schedule TEXT NOT NULL DEFAULT '0 9 * * *',
                  enabled BOOLEAN DEFAULT 1,
                  timezone TEXT,
                  is_running BOOLEAN DEFAULT 0,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
              `, (err) => {
                if (err) return reject(err);
                
                // Notification configuration table
                db.exec(`
                  CREATE TABLE IF NOT EXISTS notification_config (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    config_json TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                  );
                `, (err) => {
                  if (err) return reject(err);
                  
                  // Schema version tracking
                  db.exec(`
                    CREATE TABLE IF NOT EXISTS schema_version (
                      version INTEGER PRIMARY KEY
                    );
                  `, (err) => {
                    if (err) return reject(err);
                    
                    // Insert default cron config
                    db.exec(`
                      INSERT OR IGNORE INTO cron_config (id, schedule, enabled, timezone) 
                      VALUES (1, '0 9 * * *', 1, 'America/Chicago');
                    `, (err) => {
                      if (err) return reject(err);
                      
                      // Insert default notification config
                      const defaultNotificationConfig = {
                        triggers: {
                          sendSummaryOnScheduledRun: true,
                          sendIndividualReportsOnScheduledRun: false,
                          sendReportsWhenUpdatesFound: true,
                          sendReportsOnErrors: true,
                        }
                      };
                      
                      db.exec(`
                        INSERT OR IGNORE INTO notification_config (id, config_json) 
                        VALUES (1, '${JSON.stringify(defaultNotificationConfig)}');
                      `, (err) => {
                        if (err) return reject(err);
                        
                        // Set schema version
                        db.exec(`
                          INSERT OR IGNORE INTO schema_version (version) VALUES (1);
                        `, (err) => {
                          if (err) return reject(err);
                          resolve();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }
  },
  {
    version: 2,
    name: 'remove_manual_check_toggle',
    up: async (db) => {
      return new Promise((resolve, reject) => {
        // Update existing notification configs to remove sendReportsOnManualCheck
        db.all('SELECT id, config_json FROM notification_config', (err, rows) => {
          if (err) return reject(err);
          
          for (const row of rows as any[]) {
            try {
              const config = JSON.parse(row.config_json);
              if (config.triggers && config.triggers.sendReportsOnManualCheck !== undefined) {
                delete config.triggers.sendReportsOnManualCheck;
                
                db.run(
                  'UPDATE notification_config SET config_json = ? WHERE id = ?',
                  [JSON.stringify(config), row.id],
                  (updateErr) => {
                    if (updateErr) return reject(updateErr);
                  }
                );
              }
            } catch (parseErr) {
              console.warn('Failed to parse notification config:', parseErr);
            }
          }
          
          resolve();
        });
      });
    }
  },
  {
    version: 3,
    name: 'agent_tables_v1',
    up: async (db) => {
      return new Promise((resolve, reject) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tags TEXT,
            host TEXT,
            version TEXT,
            status TEXT NOT NULL DEFAULT 'offline',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen_at DATETIME
          );
        `, (err) => {
          if (err) return reject(err);
          db.exec(`
            CREATE TABLE IF NOT EXISTS agent_secrets (
              agent_id TEXT NOT NULL,
              enroll_secret_hash TEXT,
              refresh_secret_hash TEXT,
              revoked BOOLEAN DEFAULT 0,
              rotated_at DATETIME,
              PRIMARY KEY (agent_id),
              FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
            );
          `, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      });
    }
  },
  {
    version: 4,
    name: 'agent_containers_v1',
    up: async (db) => {
      return new Promise((resolve, reject) => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS agent_containers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            container_id TEXT NOT NULL,
            name TEXT NOT NULL,
            image TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
            UNIQUE(agent_id, container_id)
          );
        `, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
  },
  {
    version: 5,
    name: 'container_source_tracking',
    up: async (db) => {
      return new Promise((resolve, reject) => {
        // Add source tracking to containers table
        db.run('ALTER TABLE containers ADD COLUMN source_agent_id TEXT', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            return reject(err);
          }
          resolve();
        });
      });
    }
  }
];

export class DatabaseService {
  private static db: sqlite3.Database | null = null;
  private static readonly DB_PATH = path.join(process.cwd(), 'data', 'registry-radar.db');

  static async initialize(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    // Ensure data directory exists
    const dataDir = path.dirname(this.DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    this.db = new sqlite3.Database(this.DB_PATH);

    // Apply PRAGMA settings immediately after connection
    await this.runQuery('PRAGMA journal_mode=WAL');
    await this.runQuery('PRAGMA synchronous=NORMAL');     // Balanced performance and safety
    await this.runQuery('PRAGMA cache_size=10000');     // 10MB cache
    await this.runQuery('PRAGMA temp_store=MEMORY');    // Store temp tables in memory
    await this.runQuery('PRAGMA mmap_size=268435456');  // 256MB memory-mapped I/O
    await this.runQuery('PRAGMA foreign_keys=ON');      // Enable foreign key constraints
    await this.runQuery('PRAGMA optimize');             // Optimize database
    
    console.log('✅ SQLite WAL mode enabled with NORMAL safety and optimizations');
    
    // Run migrations
    await this.runMigrations();
  }

  static getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private static async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get current schema version (handle case where table doesn't exist yet)
    let currentVersion = 0;
    try {
      const versionResult = await this.runQuery('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1') as { version: number }[] | undefined;
      currentVersion = versionResult?.[0]?.version || 0;
    } catch (error: any) {
      // If schema_version table doesn't exist, start from version 0
      if (error.code === 'SQLITE_ERROR' && error.message.includes('no such table')) {
        currentVersion = 0;
      } else {
        throw error;
      }
    }

    // Run pending migrations
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await migration.up(this.db);
      
      // Update schema version
      await this.runQuery('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [migration.version]);
    }

    if (pendingMigrations.length > 0) {
      console.log(`Applied ${pendingMigrations.length} database migrations`);
    }
  }

  // Helper method to run queries
  private static runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Helper method to run single queries
  private static runSingleQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  // Helper method to run commands
  private static runCommand(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Container operations
  static async getContainers() {
    return this.runQuery('SELECT * FROM containers ORDER BY created_at DESC');
  }

  static async addContainer(container: { name: string; image_path: string; tag?: string; source_agent_id?: string }) {
    return this.runCommand(
      'INSERT INTO containers (name, image_path, tag, source_agent_id) VALUES (?, ?, ?, ?)',
      [container.name, container.image_path, container.tag || 'latest', container.source_agent_id || null]
    );
  }

  static async updateContainer(id: number, container: { name: string; image_path: string; tag?: string }) {
    return this.runCommand(
      'UPDATE containers SET name = ?, image_path = ?, tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [container.name, container.image_path, container.tag || 'latest', id]
    );
  }

  static async deleteContainer(id: number) {
    return this.runCommand('DELETE FROM containers WHERE id = ?', [id]);
  }

  // Container state operations
  static async getContainerStates() {
    return this.runQuery('SELECT * FROM container_states ORDER BY last_checked DESC');
  }

  static async getContainerState(image: string, tag: string) {
    return this.runSingleQuery('SELECT * FROM container_states WHERE image = ? AND tag = ?', [image, tag]);
  }

  static async upsertContainerState(state: {
    image: string;
    tag: string;
    current_sha: string;
    last_checked: string;
    has_update?: boolean;
    has_newer_tag?: boolean;
    latest_sha?: string;
    last_updated?: string;
    is_new?: boolean;
    status_message?: string;
    error?: boolean;
    platform?: string;
    latest_available_tag?: string;
    latest_available_updated?: string;
    update_acknowledged?: boolean;
    update_acknowledged_at?: string;
  }) {
    return this.runCommand(`
      INSERT INTO container_states (
        image, tag, current_sha, last_checked, has_update, has_newer_tag, 
        latest_sha, last_updated, is_new, status_message, error, platform,
        latest_available_tag, latest_available_updated, update_acknowledged, update_acknowledged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(image, tag) DO UPDATE SET
        current_sha = excluded.current_sha,
        last_checked = excluded.last_checked,
        has_update = excluded.has_update,
        has_newer_tag = excluded.has_newer_tag,
        latest_sha = excluded.latest_sha,
        last_updated = excluded.last_updated,
        is_new = excluded.is_new,
        status_message = excluded.status_message,
        error = excluded.error,
        platform = excluded.platform,
        latest_available_tag = excluded.latest_available_tag,
        latest_available_updated = excluded.latest_available_updated,
        update_acknowledged = excluded.update_acknowledged,
        update_acknowledged_at = excluded.update_acknowledged_at,
        updated_at = CURRENT_TIMESTAMP
    `, [
      state.image,
      state.tag,
      state.current_sha,
      state.last_checked,
      state.has_update || false,
      state.has_newer_tag || false,
      state.latest_sha || null,
      state.last_updated || null,
      state.is_new || false,
      state.status_message || null,
      state.error || false,
      state.platform || null,
      state.latest_available_tag || null,
      state.latest_available_updated || null,
      state.update_acknowledged || false,
      state.update_acknowledged_at || null
    ]);
  }

  static async clearContainerStates() {
    return this.runCommand('DELETE FROM container_states');
  }

  // Notification operations
  static async getNotifications() {
    return this.runQuery('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100');
  }

  static async addNotification(notification: {
    id: string;
    type: 'update' | 'error';
    message: string;
    timestamp: string;
    container?: string;
    read?: boolean;
  }) {
    return this.runCommand(
      'INSERT INTO notifications (id, type, message, timestamp, container, read) VALUES (?, ?, ?, ?, ?, ?)',
      [
        notification.id,
        notification.type,
        notification.message,
        notification.timestamp,
        notification.container || null,
        notification.read || false
      ]
    );
  }

  static async markNotificationAsRead(id: string) {
    return this.runCommand('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
  }

  static async markAllNotificationsAsRead() {
    return this.runCommand('UPDATE notifications SET read = 1');
  }

  static async clearNotifications() {
    return this.runCommand('DELETE FROM notifications');
  }

  // Cron configuration operations
  static async getCronConfig() {
    const result = await this.runSingleQuery('SELECT * FROM cron_config WHERE id = 1') as any;
    if (!result) {
      return { schedule: '0 9 * * *', enabled: true };
    }
    return {
      schedule: result.schedule,
      enabled: Boolean(result.enabled),
      timezone: result.timezone,
      isRunning: Boolean(result.is_running)
    };
  }

  static async updateCronConfig(config: {
    schedule: string;
    enabled: boolean;
    timezone?: string;
    isRunning?: boolean;
  }) {
    return this.runCommand(
      'UPDATE cron_config SET schedule = ?, enabled = ?, timezone = ?, is_running = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [
        config.schedule,
        config.enabled ? 1 : 0,
        config.timezone || null,
        config.isRunning ? 1 : 0
      ]
    );
  }

  // Notification configuration operations
  static async getNotificationConfig() {
    const result = await this.runSingleQuery('SELECT config_json FROM notification_config WHERE id = 1') as { config_json: string } | undefined;
    if (!result) {
      return {
        triggers: {
          sendSummaryOnScheduledRun: true,
          sendIndividualReportsOnScheduledRun: false,
          sendReportsWhenUpdatesFound: true,
          sendReportsOnErrors: true,
        }
      };
    }
    return JSON.parse(result.config_json);
  }

  static async updateNotificationConfig(config: any) {
    return this.runCommand(
      'UPDATE notification_config SET config_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [JSON.stringify(config)]
    );
  }

  // Agents operations
  static async listAgents() {
    return this.runQuery('SELECT * FROM agents ORDER BY created_at DESC');
  }

  static async getAgent(agentId: string) {
    return this.runSingleQuery('SELECT * FROM agents WHERE id = ?', [agentId]);
  }

  static async createAgent(agent: { id: string; name: string; tags?: string | null }) {
    return this.runCommand(
      'INSERT INTO agents (id, name, tags, status) VALUES (?, ?, ?, ?)',
      [agent.id, agent.name, agent.tags || null, 'offline']
    );
  }

  static async upsertAgentSecrets(agentId: string, enrollHash?: string | null, refreshHash?: string | null) {
    const existing = await this.runSingleQuery('SELECT agent_id FROM agent_secrets WHERE agent_id = ?', [agentId]);
    if (existing) {
      await this.runCommand(
        'UPDATE agent_secrets SET enroll_secret_hash = COALESCE(?, enroll_secret_hash), refresh_secret_hash = COALESCE(?, refresh_secret_hash), rotated_at = CURRENT_TIMESTAMP WHERE agent_id = ?',
        [enrollHash || null, refreshHash || null, agentId]
      );
      return;
    }
    await this.runCommand(
      'INSERT INTO agent_secrets (agent_id, enroll_secret_hash, refresh_secret_hash) VALUES (?, ?, ?)',
      [agentId, enrollHash || null, refreshHash || null]
    );
  }

  static async getAgentSecrets(agentId: string) {
    return this.runSingleQuery('SELECT * FROM agent_secrets WHERE agent_id = ?', [agentId]);
  }

  static async setAgentStatus(agentId: string, status: 'online' | 'offline' | 'disabled') {
    return this.runCommand('UPDATE agents SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [status, agentId]);
  }

  static async touchAgentLastSeen(agentId: string) {
    return this.runCommand('UPDATE agents SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [agentId]);
  }

  static async deleteAgent(agentId: string) {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise<void>((resolve, reject) => {
      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
          
          // Delete agent containers
          this.db!.run('DELETE FROM agent_containers WHERE agent_id = ?', [agentId], (err) => {
            if (err) return reject(err);
            
            // Delete agent secrets
            this.db!.run('DELETE FROM agent_secrets WHERE agent_id = ?', [agentId], (err) => {
              if (err) return reject(err);
              
              // Delete agent
              this.db!.run('DELETE FROM agents WHERE id = ?', [agentId], (err) => {
                if (err) return reject(err);
                
                this.db!.run('COMMIT', (err) => {
                  if (err) return reject(err);
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  }

  // Agent container methods
  static async updateAgentContainers(agentId: string, containers: any[]) {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise<void>((resolve, reject) => {
      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
          
          // Clear existing containers for this agent
          this.db!.run('DELETE FROM agent_containers WHERE agent_id = ?', [agentId], (err) => {
            if (err) return reject(err);
            
            // Insert new containers
            const stmt = this.db!.prepare(`
              INSERT INTO agent_containers (agent_id, container_id, name, image, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            let completed = 0;
            const total = containers.length;
            
            if (total === 0) {
              this.db!.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve();
              });
              return;
            }
            
            containers.forEach((container) => {
              stmt.run([
                agentId,
                container.id,
                container.name,
                container.image,
                container.status,
                container.created
              ], (err) => {
                if (err) return reject(err);
                completed++;
                if (completed === total) {
                  stmt.finalize((err) => {
                    if (err) return reject(err);
                    this.db!.run('COMMIT', (err) => {
                      if (err) return reject(err);
                      resolve();
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  }

  static async getAgentContainers(agentId: string) {
    return this.runQuery('SELECT * FROM agent_containers WHERE agent_id = ? ORDER BY status, name', [agentId]);
  }

  static async getAllAgentContainers() {
    return this.runQuery(`
      SELECT ac.*, a.name as agent_name, a.host as agent_host 
      FROM agent_containers ac 
      JOIN agents a ON ac.agent_id = a.id 
      ORDER BY a.name, ac.status, ac.name
    `);
  }
}