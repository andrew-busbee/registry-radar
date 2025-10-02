import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
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
      `);

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
      `);

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
      `);

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
      `);

      // Notification configuration table (stored as JSON for flexibility)
      db.exec(`
        CREATE TABLE IF NOT EXISTS notification_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          config_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Schema version tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY
        );
      `);

      // Insert default cron config
      db.exec(`
        INSERT OR IGNORE INTO cron_config (id, schedule, enabled, timezone) 
        VALUES (1, '0 9 * * *', 1, 'America/Chicago');
      `);

      // Insert default notification config
      const defaultNotificationConfig = {
        triggers: {
          sendSummaryOnScheduledRun: true,
          sendIndividualReportsOnScheduledRun: false,
          sendReportsWhenUpdatesFound: true,
          sendReportsOnErrors: true,
          sendReportsOnManualCheck: false,
        }
      };
      
      db.exec(`
        INSERT OR IGNORE INTO notification_config (id, config_json) 
        VALUES (1, '${JSON.stringify(defaultNotificationConfig)}');
      `);

      // Set schema version
      db.exec(`
        INSERT OR IGNORE INTO schema_version (version) VALUES (1);
      `);
    }
  }
];

export class DatabaseService {
  private static db: Database.Database | null = null;
  private static readonly DB_PATH = path.join(process.cwd(), 'data', 'registry-radar.db');

  static initialize(): void {
    if (this.db) {
      return; // Already initialized
    }

    // Ensure data directory exists
    const dataDir = path.dirname(this.DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.DB_PATH);
    this.db.pragma('journal_mode = WAL'); // Enable WAL mode for better concurrency
    this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints

    // Run migrations
    this.runMigrations();
  }

  static getDatabase(): Database.Database {
    if (!this.db) {
      this.initialize();
    }
    return this.db!;
  }

  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private static runMigrations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get current schema version
    const versionResult = this.db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    const currentVersion = versionResult?.version || 0;

    // Run pending migrations
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      migration.up(this.db!);
      
      // Update schema version
      this.db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(migration.version);
    }

    if (pendingMigrations.length > 0) {
      console.log(`Applied ${pendingMigrations.length} database migrations`);
    }
  }

  // Container operations
  static getContainers() {
    const db = this.getDatabase();
    return db.prepare('SELECT * FROM containers ORDER BY created_at DESC').all();
  }

  static addContainer(container: { name: string; image_path: string; tag?: string }) {
    const db = this.getDatabase();
    return db.prepare(`
      INSERT INTO containers (name, image_path, tag) 
      VALUES (?, ?, ?)
    `).run(container.name, container.image_path, container.tag || 'latest');
  }

  static updateContainer(id: number, container: { name: string; image_path: string; tag?: string }) {
    const db = this.getDatabase();
    return db.prepare(`
      UPDATE containers 
      SET name = ?, image_path = ?, tag = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(container.name, container.image_path, container.tag || 'latest', id);
  }

  static deleteContainer(id: number) {
    const db = this.getDatabase();
    return db.prepare('DELETE FROM containers WHERE id = ?').run(id);
  }

  // Container state operations
  static getContainerStates() {
    const db = this.getDatabase();
    return db.prepare('SELECT * FROM container_states ORDER BY last_checked DESC').all();
  }

  static getContainerState(image: string, tag: string) {
    const db = this.getDatabase();
    return db.prepare('SELECT * FROM container_states WHERE image = ? AND tag = ?').get(image, tag);
  }

  static upsertContainerState(state: {
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
    const db = this.getDatabase();
    return db.prepare(`
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
    `).run(
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
    );
  }

  static clearContainerStates() {
    const db = this.getDatabase();
    return db.prepare('DELETE FROM container_states').run();
  }

  // Notification operations
  static getNotifications() {
    const db = this.getDatabase();
    return db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all();
  }

  static addNotification(notification: {
    id: string;
    type: 'update' | 'error';
    message: string;
    timestamp: string;
    container?: string;
    read?: boolean;
  }) {
    const db = this.getDatabase();
    return db.prepare(`
      INSERT INTO notifications (id, type, message, timestamp, container, read)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      notification.id,
      notification.type,
      notification.message,
      notification.timestamp,
      notification.container || null,
      notification.read || false
    );
  }

  static markNotificationAsRead(id: string) {
    const db = this.getDatabase();
    return db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  }

  static markAllNotificationsAsRead() {
    const db = this.getDatabase();
    return db.prepare('UPDATE notifications SET read = 1').run();
  }

  static clearNotifications() {
    const db = this.getDatabase();
    return db.prepare('DELETE FROM notifications').run();
  }

  // Cron configuration operations
  static getCronConfig() {
    const db = this.getDatabase();
    const result = db.prepare('SELECT * FROM cron_config WHERE id = 1').get() as any;
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

  static updateCronConfig(config: {
    schedule: string;
    enabled: boolean;
    timezone?: string;
    isRunning?: boolean;
  }) {
    const db = this.getDatabase();
    return db.prepare(`
      UPDATE cron_config 
      SET schedule = ?, enabled = ?, timezone = ?, is_running = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(
      config.schedule,
      config.enabled ? 1 : 0,
      config.timezone || null,
      config.isRunning ? 1 : 0
    );
  }

  // Notification configuration operations
  static getNotificationConfig() {
    const db = this.getDatabase();
    const result = db.prepare('SELECT config_json FROM notification_config WHERE id = 1').get() as { config_json: string } | undefined;
    if (!result) {
      return {
        triggers: {
          sendSummaryOnScheduledRun: true,
          sendIndividualReportsOnScheduledRun: false,
          sendReportsWhenUpdatesFound: true,
          sendReportsOnErrors: true,
          sendReportsOnManualCheck: false,
        }
      };
    }
    return JSON.parse(result.config_json);
  }

  static updateNotificationConfig(config: any) {
    const db = this.getDatabase();
    return db.prepare(`
      UPDATE notification_config 
      SET config_json = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(JSON.stringify(config));
  }
}
