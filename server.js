import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

function startWave(room) {
    room.waveState = 'WAVE_ACTIVE';
    room.isBossWave = (room.wave % 5 === 0);
    const playerCount = Math.max(1, room.players.size);
    room.totalWaveEnemies = Math.min(180, 15 + room.wave * 8 + (playerCount - 1) * 12);
    room.enemiesSpawned = 0;
    room.enemiesKilled = 0;
    room.bossSpawned = false;
    room.waveTimer = 0;

    const startMsg = JSON.stringify({
        type: 'WAVE_START',
        wave: room.wave,
        isBossWave: room.isBossWave,
        totalEnemies: room.totalWaveEnemies
    });
    for (const p of room.players.values()) {
        if (p.ws.readyState === 1) p.ws.send(startMsg);
    }
}

function getRoom(id) {
    if (!rooms.has(id)) {
        const room = {
            id,
            players: new Map(),
            enemies: new Map(),
            items: new Map(),
            wave: 1,
            waveState: 'PREPARING',
            waveTimer: 5,
            totalWaveEnemies: 20,
            enemiesSpawned: 0,
            enemiesKilled: 0,
            isBossWave: false,
            bossSpawned: false
        };
        rooms.set(id, room);
    }
    return rooms.get(id);
}

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('room') || 'lobby';
    const room = getRoom(roomId);
    const playerId = 'p_' + Math.random().toString(36).substr(2, 9);
    
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) { return; }

        if (data.type === 'JOIN') {
            // Find a spawn position near existing players
            let spawnX = 0;
            let spawnZ = 0;
            let livingPlayers = [];
            for (const p of room.players.values()) {
                if (p.hp > 0) livingPlayers.push(p);
            }

            if (livingPlayers.length > 0) {
                const anchor = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = 4 + Math.random() * 4; // 4 to 8 units away
                spawnX = anchor.x + Math.cos(angle) * dist;
                spawnZ = anchor.z + Math.sin(angle) * dist;
            } else {
                spawnX = (Math.random() - 0.5) * 6;
                spawnZ = (Math.random() - 0.5) * 6;
            }

            room.players.set(playerId, { 
                id: playerId, 
                ws, 
                class: data.class || 'Warrior', 
                x: spawnX, z: spawnZ, lookX: spawnX, lookZ: spawnZ + 1, 
                hp: data.hp, maxHp: data.maxHp,
                level: data.level || 1,
                isDowned: false,
                reviveProgress: 0
            });

            ws.send(JSON.stringify({ 
                type: 'INIT', 
                id: playerId,
                spawnX,
                spawnZ,
                wave: room.wave,
                waveState: room.waveState,
                waveTimer: Math.ceil(room.waveTimer),
                isBossWave: room.isBossWave,
                totalEnemies: room.totalWaveEnemies,
                enemiesKilled: room.enemiesKilled
            }));
        }
        else if (data.type === 'UPDATE') {
            const p = room.players.get(playerId);
            if (p) {
                p.x = data.x; p.z = data.z;
                p.lookX = data.lookX; p.lookZ = data.lookZ;
                p.hp = data.hp; p.maxHp = data.maxHp;
                p.level = data.level;
                p.isDowned = data.isDowned || false;
            }
        }
        else if (data.type === 'HIT_ENEMY') {
            const enemy = room.enemies.get(data.enemyId);
            if (enemy) {
                enemy.hp -= data.damage;
                if (enemy.hp <= 0) {
                    room.enemies.delete(data.enemyId);
                    room.enemiesKilled++;

                    // Drop item
                    if (Math.random() < (enemy.isBoss ? 1.0 : 0.28)) {
                        const itemId = 'i_' + Math.random().toString(36).substr(2, 9);
                        const r = Math.random();
                        let type = 'gold';
                        if (enemy.isBoss) {
                            type = 'maxhp';
                        } else if (r < 0.20) type = 'health';
                        else if (r < 0.35) type = 'mana';
                        else if (r < 0.60) type = 'gold';
                        else if (r < 0.70) type = 'maxhp';
                        else if (r < 0.80) type = 'magnet';
                        else if (r < 0.90) type = 'bomb';
                        room.items.set(itemId, { id: itemId, x: enemy.x, z: enemy.z, type });
                    }

                    // Boss death bonus extra items
                    if (enemy.isBoss) {
                        for (let b = 0; b < 3; b++) {
                            const bId = 'i_' + Math.random().toString(36).substr(2, 9);
                            const bOffset = (Math.random() - 0.5) * 4;
                            room.items.set(bId, { id: bId, x: enemy.x + bOffset, z: enemy.z + bOffset, type: 'gold' });
                        }
                    }

                    // Check wave completion
                    if (room.waveState === 'WAVE_ACTIVE' && room.enemiesSpawned >= room.totalWaveEnemies && room.enemies.size === 0) {
                        room.waveState = 'WAVE_CLEAR';
                        room.waveTimer = 12; // 12s shop & rest break

                        // Auto-revive all downed teammates
                        for (const pl of room.players.values()) {
                            if (pl.isDowned || pl.hp <= 0) {
                                pl.isDowned = false;
                                pl.hp = Math.floor(pl.maxHp * 0.5);
                            }
                        }

                        const clearMsg = JSON.stringify({
                            type: 'WAVE_CLEARED',
                            wave: room.wave,
                            bonusGold: 50 + room.wave * 25,
                            bonusExp: 40 + room.wave * 20
                        });
                        for (const pl of room.players.values()) {
                            if (pl.ws.readyState === 1) pl.ws.send(clearMsg);
                        }
                    }
                }
            }
        }
        else if (data.type === 'COLLECT_ITEM') {
            if (room.items.has(data.itemId)) {
                const item = room.items.get(data.itemId);
                room.items.delete(data.itemId);
                ws.send(JSON.stringify({ type: 'ITEM_COLLECTED', itemId: data.itemId, itemType: item.type }));
            }
        }
        else if (data.type === 'BOMB') {
            // Bomb wipes regular enemies and deals heavy damage to bosses
            for (const [eId, enemy] of room.enemies.entries()) {
                if (enemy.isBoss) {
                    enemy.hp -= 400;
                    if (enemy.hp <= 0) room.enemies.delete(eId);
                } else {
                    room.enemies.delete(eId);
                    room.enemiesKilled++;
                }
            }
        }
        else if (data.type === 'PLAYER_ULT') {
            const ultMsg = JSON.stringify({
                type: 'TEAMMATE_ULT',
                playerId: playerId,
                class: data.class,
                x: data.x,
                z: data.z
            });
            for (const pl of room.players.values()) {
                if (pl.id !== playerId && pl.ws.readyState === 1) pl.ws.send(ultMsg);
            }
        }
        else if (data.type === 'SKIP_PREP') {
            if (room.waveState === 'PREPARING' || room.waveState === 'WAVE_CLEAR') {
                room.waveTimer = 0;
            }
        }
        else if (data.type === 'REVIVE_TEAMMATE') {
            const target = room.players.get(data.targetId);
            if (target && target.isDowned) {
                target.isDowned = false;
                target.hp = Math.floor(target.maxHp * 0.5);
                const revMsg = JSON.stringify({ type: 'PLAYER_REVIVED', id: target.id, hp: target.hp });
                for (const pl of room.players.values()) {
                    if (pl.ws.readyState === 1) pl.ws.send(revMsg);
                }
            }
        }
    });

    ws.on('close', () => {
        room.players.delete(playerId);
        if (room.players.size === 0) {
            rooms.delete(roomId);
        }
    });
});

setInterval(() => {
    const dt = 0.05;
    for (const room of rooms.values()) {
        if (room.players.size === 0) continue;

        // Wave State Machine
        if (room.waveState === 'PREPARING') {
            room.waveTimer -= dt;
            if (room.waveTimer <= 0) {
                startWave(room);
            }
        } else if (room.waveState === 'WAVE_CLEAR') {
            room.waveTimer -= dt;
            if (room.waveTimer <= 0) {
                room.wave++;
                startWave(room);
            }
        } else if (room.waveState === 'WAVE_ACTIVE') {
            // Spawn Wave Enemies
            let totalLevel = 0;
            for (const p of room.players.values()) totalLevel += (p.level || 1);
            const avgLevel = totalLevel / room.players.size;

            const maxActiveAtOnce = Math.min(80, 20 + room.wave * 5 + room.players.size * 10);

            if (room.enemies.size < maxActiveAtOnce && room.enemiesSpawned < room.totalWaveEnemies && Math.random() < 0.35) {
                const livingPlayers = Array.from(room.players.values()).filter(p => !p.isDowned && p.hp > 0);
                if (livingPlayers.length > 0) {
                    const target = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 45 + Math.random() * 35;
                    const eid = 'e_' + Math.random().toString(36).substr(2, 9);
                    
                    // Boss Spawn check
                    if (room.isBossWave && !room.bossSpawned && room.enemiesSpawned >= Math.floor(room.totalWaveEnemies * 0.4)) {
                        room.bossSpawned = true;
                        let bossType = 'boss_warlord';
                        let bossName = 'Gorgar the Orc Warlord';
                        let bossHp = 400 + room.wave * 120 + room.players.size * 200;
                        if (room.wave === 10) {
                            bossType = 'boss_slimeking';
                            bossName = 'King Slime';
                            bossHp = 700 + room.players.size * 300;
                        } else if (room.wave >= 15) {
                            bossType = 'boss_necromancer';
                            bossName = 'Malakar the Void Lich';
                            bossHp = 1000 + room.players.size * 400;
                        }

                        room.enemies.set(eid, {
                            id: eid,
                            type: bossType,
                            name: bossName,
                            hp: bossHp,
                            maxHp: bossHp,
                            speed: 9,
                            hitRadius: 3.0,
                            height: 5.0,
                            damage: 25 + room.wave * 2,
                            x: target.x + Math.cos(angle) * dist,
                            z: target.z + Math.sin(angle) * dist,
                            isBoss: true
                        });
                        room.enemiesSpawned++;
                    } else {
                        // Regular Wave Mob
                        const r = Math.random();
                        let type = 'bluecube', hp = 15 + room.wave * 6 + avgLevel * 3, speed = 15 + Math.random() * 4, hitRadius = 0.8, damage = 6 + room.wave * 1.5;
                        if (room.wave >= 2 && r < 0.35) {
                            type = 'slime'; hp = 35 + room.wave * 10 + avgLevel * 5; speed = 11 + Math.random() * 3; hitRadius = 1.3; damage = 12 + room.wave * 2;
                        } else if (room.wave >= 3 && r < 0.70) {
                            type = 'orc'; hp = 75 + room.wave * 18 + avgLevel * 8; speed = 8.5 + Math.random() * 3; hitRadius = 1.6; damage = 18 + room.wave * 3;
                        } else if (room.wave >= 4 && r < 0.85) {
                            type = 'skitterer'; hp = 25 + room.wave * 7; speed = 20 + Math.random() * 4; hitRadius = 0.9; damage = 10 + room.wave * 2;
                        }

                        room.enemies.set(eid, {
                            id: eid,
                            type,
                            hp,
                            maxHp: hp,
                            speed,
                            hitRadius,
                            damage,
                            x: target.x + Math.cos(angle) * dist,
                            z: target.z + Math.sin(angle) * dist,
                            isBoss: false
                        });
                        room.enemiesSpawned++;
                    }
                }
            }

            // Check if wave is complete (all spawned and all dead)
            if (room.enemiesSpawned >= room.totalWaveEnemies && room.enemies.size === 0) {
                room.waveState = 'WAVE_CLEAR';
                room.waveTimer = 12;

                for (const pl of room.players.values()) {
                    if (pl.isDowned || pl.hp <= 0) {
                        pl.isDowned = false;
                        pl.hp = Math.floor(pl.maxHp * 0.5);
                    }
                }

                const clearMsg = JSON.stringify({
                    type: 'WAVE_CLEARED',
                    wave: room.wave,
                    bonusGold: 50 + room.wave * 25,
                    bonusExp: 40 + room.wave * 20
                });
                for (const pl of room.players.values()) {
                    if (pl.ws.readyState === 1) pl.ws.send(clearMsg);
                }
            }
        }

        // Enemy movement towards closest living player
        for (const enemy of room.enemies.values()) {
            let nearest = null;
            let minDist = Infinity;
            for (const p of room.players.values()) {
                if (p.hp <= 0 || p.isDowned) continue;
                const d = Math.hypot(p.x - enemy.x, p.z - enemy.z);
                if (d < minDist) { minDist = d; nearest = p; }
            }
            if (nearest) {
                const dx = nearest.x - enemy.x;
                const dz = nearest.z - enemy.z;
                const dist = Math.hypot(dx, dz);
                if (dist > enemy.hitRadius + 1.0) {
                    enemy.x += (dx / dist) * enemy.speed * dt;
                    enemy.z += (dz / dist) * enemy.speed * dt;
                }
            }
        }

        const state = {
            type: 'TICK',
            wave: room.wave,
            waveState: room.waveState,
            waveTimer: Math.ceil(room.waveTimer),
            isBossWave: room.isBossWave,
            totalWaveEnemies: room.totalWaveEnemies,
            enemiesKilled: room.enemiesKilled,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                class: p.class,
                x: p.x,
                z: p.z,
                lookX: p.lookX,
                lookZ: p.lookZ,
                hp: p.hp,
                maxHp: p.maxHp,
                level: p.level,
                isDowned: p.isDowned
            })),
            enemies: Array.from(room.enemies.values()),
            items: Array.from(room.items.values())
        };
        const stateStr = JSON.stringify(state);
        for (const p of room.players.values()) {
            if (p.ws.readyState === 1) p.ws.send(stateStr);
        }
    }
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`WebSocket + HTTP Server running on port ${PORT}`));

