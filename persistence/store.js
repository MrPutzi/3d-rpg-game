'use strict';
const { mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const { randomUUID, randomBytes, scrypt: rawScrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { character } = require('../game/world');
const scrypt = promisify(rawScrypt);
const digest = token => createHash('sha256').update(token).digest('hex');
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
async function verify(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = (await hashPassword(password, salt)).split(':')[1];
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
class Store {
  async init({ databaseUrl, filename = 'data/miniscape.sqlite' } = {}) {
    if (databaseUrl) {
      const { Pool } = require('pg');
      this.pool = new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000 });
      this.pool.on('error', err => console.error('Idle database connection failed', err));
      this.query = async (sql, params = []) => (await (this.transactionClient || this.pool).query(sql, params)).rows;
    } else {
      const { DatabaseSync } = require('node:sqlite');
      if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
      this.db = new DatabaseSync(filename);
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
      this.query = async (sql, params = []) => {
        const args = [];
        const prepared = sql.replace(/\$(\d+)/g, (_, i) => { args.push(params[Number(i) - 1]); return '?'; });
        const statement = this.db.prepare(prepared);
        return /^\s*(SELECT|WITH)/i.test(sql) ? statement.all(...args) : (statement.run(...args), []);
      };
    }
    this.tail = Promise.resolve();
    await this.query('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)');
    await this.query('CREATE TABLE IF NOT EXISTS characters (account_id TEXT PRIMARY KEY REFERENCES accounts(id), data TEXT NOT NULL)');
    await this.query('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), expires_at BIGINT NOT NULL)');
    this.dummyHash = await hashPassword(randomBytes(24).toString('hex'));
    return this;
  }
  serial(fn) { const job = this.tail.then(fn); this.tail = job.catch(() => {}); return job; }
  async transaction(fn) {
    const client = this.pool ? await this.pool.connect() : null;
    this.transactionClient = client;
    let failed;
    try {
      await this.query('BEGIN');
      const value = await fn(); await this.query('COMMIT'); return value;
    } catch (err) {
      failed = err;
      try { await this.query('ROLLBACK'); } catch { /* Discard failed PostgreSQL connections below. */ }
      throw err;
    } finally {
      this.transactionClient = null;
      if (client) client.release(failed);
    }
  }
  async authenticate(username, password, register) {
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username) || typeof password !== 'string' || password.length < 10 || password.length > 128) throw new Error('Meno: 3–20 písmen/číslic/_. Heslo: 10–128 znakov.');
    username = username.toLowerCase();
    // Password hashing happens outside database transactions.
    const newHash = register ? await hashPassword(password) : null;
    return this.serial(async () => {
      let account = (await this.query('SELECT * FROM accounts WHERE username=$1', [username]))[0];
      if (register) {
        if (account) throw new Error('Toto meno je už obsadené.');
        account = { id: randomUUID(), username };
        await this.transaction(async () => {
          await this.query('INSERT INTO accounts(id,username,password_hash) VALUES($1,$2,$3)', [account.id, username, newHash]);
          await this.query('INSERT INTO characters(account_id,data) VALUES($1,$2)', [account.id, JSON.stringify(character(account.id, username))]);
        });
      } else {
        const valid = await verify(password, account?.password_hash || this.dummyHash);
        if (!account || !valid) throw new Error('Nesprávne meno alebo heslo.');
      }
      const token = randomBytes(32).toString('hex');
      await this.transaction(async () => {
        await this.query('DELETE FROM sessions WHERE expires_at <= $1', [Date.now()]);
        // One active login per account; a new login invalidates older cookies.
        await this.query('DELETE FROM sessions WHERE account_id=$1', [account.id]);
        await this.query('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)', [digest(token), account.id, Date.now() + SESSION_MS]);
      });
      return { token, id: account.id, name: username };
    });
  }
  session(token) {
    return this.serial(async () => {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
      return (await this.query('SELECT s.account_id AS id, a.username AS name, s.expires_at FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>$2', [digest(token), Date.now()]))[0] || null;
    });
  }
  load(id) { return this.serial(async () => {
    const row = (await this.query('SELECT data FROM characters WHERE account_id=$1', [id]))[0];
    if (!row) throw new Error('Postavu sa nepodarilo načítať.');
    return JSON.parse(row.data);
  }); }
  save(players) {
    const snapshots = players.map(p => [p.id, JSON.stringify(p)]);
    return this.serial(() => this.transaction(async () => {
      for (const [id, data] of snapshots) await this.query('UPDATE characters SET data=$2 WHERE account_id=$1', [id, data]);
    }));
  }
  logout(token) { return this.serial(() => this.query('DELETE FROM sessions WHERE token_hash=$1', [digest(token)])); }
  async close() { await this.tail; if (this.pool) await this.pool.end(); else this.db.close(); }
}
module.exports = { Store, SESSION_MS };
