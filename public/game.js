// ==========================================
// 3D RPG Horde Survivor - Co-op Multiplayer
// ==========================================

// --- AUDIO SYNTHESIZER (Web Audio API) ---
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

const SFX = {
    playTone(freq, type, duration, gainStart = 0.15, gainEnd = 0.001) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(gainStart, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(gainEnd, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { /* ignore audio error */ }
    },
    shoot(className) {
        if (className === 'Mage') {
            this.playTone(520, 'sine', 0.15, 0.2);
            setTimeout(() => this.playTone(780, 'sine', 0.1, 0.15), 30);
        } else if (className === 'Archer') {
            this.playTone(400, 'triangle', 0.08, 0.2);
            setTimeout(() => this.playTone(200, 'triangle', 0.12, 0.15), 20);
        } else {
            this.playTone(180, 'sawtooth', 0.18, 0.25);
            setTimeout(() => this.playTone(120, 'sawtooth', 0.15, 0.2), 40);
        }
    },
    hit() {
        this.playTone(120, 'square', 0.08, 0.15);
    },
    coin() {
        this.playTone(987, 'sine', 0.08, 0.15);
        setTimeout(() => this.playTone(1318, 'sine', 0.12, 0.15), 50);
    },
    item() {
        this.playTone(659, 'sine', 0.1, 0.15);
        setTimeout(() => this.playTone(880, 'sine', 0.1, 0.15), 60);
        setTimeout(() => this.playTone(1046, 'sine', 0.15, 0.2), 120);
    },
    levelUp() {
        [523, 659, 783, 1046].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.25), i * 80);
        });
    },
    waveStart() {
        [330, 440, 550].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.35, 0.2), i * 120);
        });
    },
    waveClear() {
        [523, 659, 783, 1046, 1318].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.3, 0.2), i * 90);
        });
    },
    bossRoar() {
        this.playTone(80, 'sawtooth', 0.8, 0.4);
        setTimeout(() => this.playTone(65, 'square', 0.9, 0.4), 100);
    },
    bomb() {
        this.playTone(90, 'square', 0.5, 0.4);
        setTimeout(() => this.playTone(50, 'sawtooth', 0.6, 0.4), 100);
    },
    earthquake() {
        this.playTone(60, 'sawtooth', 0.6, 0.45);
        setTimeout(() => this.playTone(45, 'square', 0.7, 0.4), 80);
        setTimeout(() => this.playTone(35, 'sawtooth', 0.8, 0.35), 180);
    },
    frostNova() {
        this.playTone(784, 'sine', 0.2, 0.25);
        setTimeout(() => this.playTone(1046, 'triangle', 0.25, 0.3), 60);
        setTimeout(() => this.playTone(1318, 'sine', 0.3, 0.35), 120);
    },
    arrowStorm() {
        [440, 660, 880, 1100].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.08, 0.15), i * 30);
        });
    },
    shrine() {
        [440, 554, 659, 880, 1108].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.3, 0.25), i * 70);
        });
    },
    chestOpen() {
        [523, 659, 783, 1046, 1318].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.15, 0.2), i * 50);
        });
    },
    crit() {
        this.playTone(1200, 'sawtooth', 0.1, 0.25);
    },
    aggro() {
        this.playTone(320, 'sawtooth', 0.15, 0.25);
        setTimeout(() => this.playTone(480, 'sawtooth', 0.2, 0.3), 60);
    },
    gateOpen() {
        this.playTone(90, 'sawtooth', 0.8, 0.35);
        setTimeout(() => this.playTone(70, 'square', 1.0, 0.3), 150);
        setTimeout(() => this.playTone(110, 'triangle', 0.6, 0.25), 400);
    },
    equip() {
        this.playTone(880, 'triangle', 0.08, 0.2);
        setTimeout(() => this.playTone(1320, 'sine', 0.12, 0.25), 40);
    },
    scrap() {
        this.playTone(520, 'sine', 0.08, 0.15);
        setTimeout(() => this.playTone(780, 'triangle', 0.1, 0.18), 50);
    },
    lootLegendary() {
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.35, 0.3), i * 70);
        });
    },
    healSpell() {
        [600, 800, 1000, 1200].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.2, 0.2), i * 50);
        });
    }
};

window.toggleAudio = function() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('audio-toggle-btn');
    if (btn) btn.innerText = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) initAudio();
};

// --- GAME STATE ---
const GAME = {
    state: 'START', // START, PLAYING, PAUSED, LEVEL_UP, GAME_OVER, DUNGEON_VICTORY
    mode: 'horde', // 'horde' or 'dungeon'
    score: 0,
    gold: 0,
    kills: 0,
    time: 0,
    wave: 1,
    waveState: 'PREPARING', // PREPARING, WAVE_ACTIVE, WAVE_CLEAR
    waveTimer: 5,
    totalWaveEnemies: 20,
    enemiesSpawned: 0,
    enemiesKilled: 0,
    isBossWave: false,
    bossSpawned: false,
    isDowned: false,
    reviveTokens: 0,
    shield: 0,
    maxShield: 0,
    // Dungeon Mode Tracking
    dungeonRoom: 0,
    dungeonTotalRooms: 5,
    dungeonRoomKills: 0,
    dungeonRoomTotal: 4,
    dungeonCleared: false
};

const INRUN = {
    damageMult: 1.0,
    fireRateMult: 1.0,
    speedMult: 1.0
};

const BUFFS = {
    swiftness: 0,
    wrath: 0
};

let cameraShakeTimer = 0;

const PLAYER = {
    class: 'Warrior',
    hp: 100, maxHp: 100,
    mana: 50, maxMana: 50,
    level: 1, exp: 0, expNeeded: 100,
    speed: 18,
    damage: 25,
    fireCooldown: 0,
    ultCooldown: 0,
    ultMaxCooldown: 20,
    invulnerableTimer: 0,
    skills: [], // { id, level }
    activeSkillIds: [] // max 3
};

const EFFECTS = {
    projCount: 1,
    projPierce: 1,
    projRadius: 1,
    fireRateMult: 1.0,
    moveSpeedMult: 1.0,
    auraDamage: 0,
    lifesteal: 0,
    homing: 0
};

const shrines = [];
const chests = [];
const floatingTexts = [];
const vfxObjects = [];

// --- PERSISTENT META-PROGRESSION & EQUIPMENT (SHOP & INVENTORY) ---
const SAVE_KEY = 'rpg_horde_survivor_save_v2';
let SAVE = { essence: 0, upgrades: {}, equipped: null, inventory: null };

// --- COMPLETE MMORPG EQUIPMENT DATABASE (CLASS-RESTRICTED) ---
const ITEM_DATABASE = {
    // --- WARRIOR WEAPONS (Swords / Axes / Hammers) ---
    war_wep_1: { id: 'war_wep_1', name: 'Iron Claymore', slot: 'weapon', classReq: 'Warrior', rarity: 'common', icon: '⚔️', stats: { damage: 8, maxHp: 15 }, desc: 'A sturdy iron blade forged in the bastion barracks.' },
    war_wep_2: { id: 'war_wep_2', name: 'Sun-Forged Broadsword', slot: 'weapon', classReq: 'Warrior', rarity: 'rare', icon: '🗡️', stats: { damage: 18, maxHp: 30, crit: 5 }, desc: 'Tempered in holy sunlight, dealing heavy cleaving strikes.' },
    war_wep_3: { id: 'war_wep_3', name: 'Bloodthorn Battleaxe', slot: 'weapon', classReq: 'Warrior', rarity: 'rare', icon: '🪓', stats: { damage: 25, lifesteal: 2 }, desc: 'Jagged axe that hungers for the blood of fallen foes.' },
    war_wep_4: { id: 'war_wep_4', name: 'Obsidian Cleaver', slot: 'weapon', classReq: 'Warrior', rarity: 'epic', icon: '🔪', stats: { damage: 38, maxHp: 50, armor: 4 }, desc: 'Carved from volcanic rock, shatter-resistant and brutal.' },
    war_wep_5: { id: 'war_wep_5', name: 'Doomhammer of the Titan', slot: 'weapon', classReq: 'Warrior', rarity: 'epic', icon: '🔨', stats: { damage: 48, maxHp: 75, crit: 8 }, desc: 'Colossal warhammer that cracks the earth with every swing.' },
    war_wep_6: { id: 'war_wep_6', name: 'Excalibur of Light', slot: 'weapon', classReq: 'Warrior', rarity: 'legendary', icon: '✨', stats: { damage: 70, maxHp: 110, crit: 12, lifesteal: 4, startingShield: 50 }, desc: 'Legendary holy blade of ancient kings radiating radiant fury.' },

    // --- WARRIOR OFFHANDS (Shields) ---
    war_off_1: { id: 'war_off_1', name: 'Oak Buckler', slot: 'offhand', classReq: 'Warrior', rarity: 'common', icon: '🛡️', stats: { armor: 3, maxHp: 20 }, desc: 'Simple reinforced wooden buckler.' },
    war_off_2: { id: 'war_off_2', name: 'Spiked Bulwark', slot: 'offhand', classReq: 'Warrior', rarity: 'rare', icon: '🛡️', stats: { armor: 6, maxHp: 45, damage: 6 }, desc: 'Spiked steel shield that punishes melee attackers.' },
    war_off_3: { id: 'war_off_3', name: 'Tower Shield of Aegis', slot: 'offhand', classReq: 'Warrior', rarity: 'epic', icon: '🏰', stats: { armor: 11, maxHp: 85, startingShield: 45 }, desc: 'Full-body bulwark impervious to physical assault.' },
    war_off_4: { id: 'war_off_4', name: 'Sun-Crested Pavise', slot: 'offhand', classReq: 'Warrior', rarity: 'legendary', icon: '🌟', stats: { armor: 18, maxHp: 135, startingShield: 85, lifesteal: 2 }, desc: 'Legendary divine shield blessed by ancient solar deities.' },

    // --- WARRIOR ARMOR (Plate / Hauberks) ---
    war_arm_1: { id: 'war_arm_1', name: 'Chainmail Hauberk', slot: 'armor', classReq: 'Warrior', rarity: 'common', icon: '🦺', stats: { armor: 4, maxHp: 25 }, desc: 'Interlocked steel rings offering dependable defense.' },
    war_arm_2: { id: 'war_arm_2', name: 'Ironclad Plate', slot: 'armor', classReq: 'Warrior', rarity: 'rare', icon: '🛡️', stats: { armor: 8, maxHp: 55 }, desc: 'Solid forged iron plate worn by vanguard champions.' },
    war_arm_3: { id: 'war_arm_3', name: 'Dragonplate Cuirass', slot: 'armor', classReq: 'Warrior', rarity: 'epic', icon: '🐉', stats: { armor: 14, maxHp: 100, damage: 10 }, desc: 'Scales of an ancient red drake forged into impervious armor.' },
    war_arm_4: { id: 'war_arm_4', name: 'Dreadnought Juggernaut Suit', slot: 'armor', classReq: 'Warrior', rarity: 'legendary', icon: '👑', stats: { armor: 22, maxHp: 180, startingShield: 80, lifesteal: 3 }, desc: 'Titanium dreadnought shell making the warrior an unstoppable fortress.' },

    // --- WARRIOR HELMETS (Greathelms / Visors) ---
    war_helm_1: { id: 'war_helm_1', name: 'Steel Greathelm', slot: 'helmet', classReq: 'Warrior', rarity: 'common', icon: '🪖', stats: { armor: 2, maxHp: 15 }, desc: 'Heavy full-face steel helmet.' },
    war_helm_2: { id: 'war_helm_2', name: "Warlord's Horned Visor", slot: 'helmet', classReq: 'Warrior', rarity: 'rare', icon: '👑', stats: { armor: 5, maxHp: 35, crit: 4 }, desc: 'Menacing horned helm inspiring terror in enemy ranks.' },
    war_helm_3: { id: 'war_helm_3', name: 'Crown of the Crusader', slot: 'helmet', classReq: 'Warrior', rarity: 'epic', icon: '👑', stats: { armor: 9, maxHp: 65, damage: 12 }, desc: 'Embossed gold crest blessed by cathedral priests.' },
    war_helm_4: { id: 'war_helm_4', name: 'Titan Warcrest', slot: 'helmet', classReq: 'Warrior', rarity: 'legendary', icon: '🔥', stats: { armor: 15, maxHp: 105, crit: 8, damage: 18 }, desc: 'Crown of the mountain giants pulsing with seismic power.' },

    // --- MAGE WEAPONS (Staves / Wands / Scepters) ---
    mag_wep_1: { id: 'mag_wep_1', name: 'Apprentice Wand', slot: 'weapon', classReq: 'Mage', rarity: 'common', icon: '🪄', stats: { damage: 10, maxMana: 20 }, desc: 'Simple yew wand focusing arcane energy.' },
    mag_wep_2: { id: 'mag_wep_2', name: 'Glacial Staff', slot: 'weapon', classReq: 'Mage', rarity: 'rare', icon: '❄️', stats: { damage: 24, maxMana: 45, crit: 5 }, desc: 'Infused with permafrost, chilling enemy targets.' },
    mag_wep_3: { id: 'mag_wep_3', name: "Pyromancer's Flame Rod", slot: 'weapon', classReq: 'Mage', rarity: 'rare', icon: '🔥', stats: { damage: 30, maxMana: 50, crit: 7 }, desc: 'Pulsing ruby tip channels explosive flame burst.' },
    mag_wep_4: { id: 'mag_wep_4', name: "Archmage's Astral Scepter", slot: 'weapon', classReq: 'Mage', rarity: 'epic', icon: '🔮', stats: { damage: 45, maxMana: 80, crit: 10 }, desc: 'Forged from celestial meteor metal and arcane crystals.' },
    mag_wep_5: { id: 'mag_wep_5', name: 'Nether Void Staff', slot: 'weapon', classReq: 'Mage', rarity: 'epic', icon: '🌌', stats: { damage: 56, maxMana: 100, lifesteal: 3 }, desc: 'Draws raw nether energy tearing through magic resistances.' },
    mag_wep_6: { id: 'mag_wep_6', name: 'Staff of the World Tree', slot: 'weapon', classReq: 'Mage', rarity: 'legendary', icon: '🌳', stats: { damage: 78, maxMana: 150, maxHp: 60, crit: 14, lifesteal: 4 }, desc: 'Living branch of the cosmos granting boundless arcane mastery.' },

    // --- MAGE OFFHANDS (Tomes / Orbs / Grimoires) ---
    mag_off_1: { id: 'mag_off_1', name: 'Mystic Tome', slot: 'offhand', classReq: 'Mage', rarity: 'common', icon: '📖', stats: { maxMana: 25, damage: 5 }, desc: 'Leatherbound grimoire of fundamental runes.' },
    mag_off_2: { id: 'mag_off_2', name: 'Arcane Orb of Power', slot: 'offhand', classReq: 'Mage', rarity: 'rare', icon: '🔮', stats: { maxMana: 48, damage: 12, crit: 5 }, desc: 'Swirling glass orb containing trapped lightning.' },
    mag_off_3: { id: 'mag_off_3', name: 'Grimoire of the Cosmos', slot: 'offhand', classReq: 'Mage', rarity: 'epic', icon: '📜', stats: { maxMana: 90, damage: 22, speed: 6 }, desc: 'Ancient astrological star charts amplifying casting cadence.' },
    mag_off_4: { id: 'mag_off_4', name: 'Eye of the Nether Void', slot: 'offhand', classReq: 'Mage', rarity: 'legendary', icon: '👁️', stats: { maxMana: 145, damage: 36, crit: 12, lifesteal: 2 }, desc: 'Beholding the infinite void, doubling mana resurgence.' },

    // --- MAGE ARMOR (Robes / Silks) ---
    mag_arm_1: { id: 'mag_arm_1', name: 'Apprentice Robes', slot: 'armor', classReq: 'Mage', rarity: 'common', icon: '🥋', stats: { maxMana: 20, maxHp: 18 }, desc: 'Woven cotton robes with warding runes.' },
    mag_arm_2: { id: 'mag_arm_2', name: 'Spellweaver Silk', slot: 'armor', classReq: 'Mage', rarity: 'rare', icon: '👘', stats: { maxMana: 40, maxHp: 36, armor: 3 }, desc: 'Infused with mana-resistant silken fibers.' },
    mag_arm_3: { id: 'mag_arm_3', name: 'Archmage Vestments', slot: 'armor', classReq: 'Mage', rarity: 'epic', icon: '🧙', stats: { maxMana: 85, maxHp: 70, armor: 6, startingShield: 45 }, desc: 'Gilded robes worn by high council grand arcanists.' },
    mag_arm_4: { id: 'mag_arm_4', name: 'Celestial Robes of Nether', slot: 'armor', classReq: 'Mage', rarity: 'legendary', icon: '🌌', stats: { maxMana: 140, maxHp: 105, armor: 10, startingShield: 90, damage: 16 }, desc: 'Star-woven fabric reflecting ethereal starlight.' },

    // --- MAGE HELMETS (Wizard Hats / Cowls / Diadems) ---
    mag_helm_1: { id: 'mag_helm_1', name: "Scholar's Cowl", slot: 'helmet', classReq: 'Mage', rarity: 'common', icon: '🧢', stats: { maxMana: 15, damage: 4 }, desc: 'Simple fabric hood keeping focus sharp.' },
    mag_helm_2: { id: 'mag_helm_2', name: "Sorcerer's Wizard Hat", slot: 'helmet', classReq: 'Mage', rarity: 'rare', icon: '🧙', stats: { maxMana: 30, damage: 9, crit: 4 }, desc: 'Pointed star hat worn by guild sorcerers.' },
    mag_helm_3: { id: 'mag_helm_3', name: 'Diadem of the Star-Seeker', slot: 'helmet', classReq: 'Mage', rarity: 'epic', icon: '👑', stats: { maxMana: 60, damage: 18, crit: 8 }, desc: 'Circlet adorned with glowing blue stellar shards.' },
    mag_helm_4: { id: 'mag_helm_4', name: 'Arcane Crown of Eternity', slot: 'helmet', classReq: 'Mage', rarity: 'legendary', icon: '👑', stats: { maxMana: 105, damage: 28, crit: 14, maxHp: 45 }, desc: 'Legendary floating crown humming with cosmic power.' },

    // --- ARCHER WEAPONS (Bows / Crossbows) ---
    arc_wep_1: { id: 'arc_wep_1', name: "Hunter's Recurve", slot: 'weapon', classReq: 'Archer', rarity: 'common', icon: '🏹', stats: { damage: 8, speed: 5 }, desc: 'Lightweight wooden bow with snappy string action.' },
    arc_wep_2: { id: 'arc_wep_2', name: 'Swiftwind Longbow', slot: 'weapon', classReq: 'Archer', rarity: 'rare', icon: '🏹', stats: { damage: 18, speed: 9, crit: 6 }, desc: 'Carved from flexible elder-wood, granting swift draws.' },
    arc_wep_3: { id: 'arc_wep_3', name: 'Shadowstalker Crossbow', slot: 'weapon', classReq: 'Archer', rarity: 'rare', icon: '🎯', stats: { damage: 24, crit: 11 }, desc: 'Heavy bolt action piercing thick enemy hides.' },
    arc_wep_4: { id: 'arc_wep_4', name: 'Phoenix Stormbow', slot: 'weapon', classReq: 'Archer', rarity: 'epic', icon: '🔥', stats: { damage: 36, speed: 14, crit: 13 }, desc: 'Imbued with the speed and fiery feathers of a phoenix.' },
    arc_wep_5: { id: 'arc_wep_5', name: 'Dragonbone Compound Bow', slot: 'weapon', classReq: 'Archer', rarity: 'epic', icon: '🐉', stats: { damage: 46, maxHp: 40, crit: 15 }, desc: 'Crafted from black dragon ribcage with immense draw tension.' },
    arc_wep_6: { id: 'arc_wep_6', name: 'Bow of the Windrunner', slot: 'weapon', classReq: 'Archer', rarity: 'legendary', icon: '💨', stats: { damage: 66, speed: 22, crit: 20, lifesteal: 3 }, desc: 'Legendary bow whispered to shoot arrows faster than sound itself.' },

    // --- ARCHER OFFHANDS (Quivers) ---
    arc_off_1: { id: 'arc_off_1', name: 'Leather Quiver', slot: 'offhand', classReq: 'Archer', rarity: 'common', icon: '🎒', stats: { damage: 4, speed: 4 }, desc: 'Clean leather back-quiver.' },
    arc_off_2: { id: 'arc_off_2', name: 'Swift Quiver of Agility', slot: 'offhand', classReq: 'Archer', rarity: 'rare', icon: '🎒', stats: { damage: 9, speed: 8, crit: 5 }, desc: 'Enchanted slots that replenish arrows seamlessly.' },
    arc_off_3: { id: 'arc_off_3', name: 'Dragonscale Quiver', slot: 'offhand', classReq: 'Archer', rarity: 'epic', icon: '🐉', stats: { damage: 18, speed: 14, crit: 9 }, desc: 'Fireproof scales storing armor-piercing broadhead shafts.' },
    arc_off_4: { id: 'arc_off_4', name: 'Quiver of Infinite Stars', slot: 'offhand', classReq: 'Archer', rarity: 'legendary', icon: '✨', stats: { damage: 30, speed: 20, crit: 15, lifesteal: 2 }, desc: 'Bottomless dimensional quiver imbued with astral starlight.' },

    // --- ARCHER ARMOR (Leather / Garb) ---
    arc_arm_1: { id: 'arc_arm_1', name: 'Padded Tunic', slot: 'armor', classReq: 'Archer', rarity: 'common', icon: '🥋', stats: { maxHp: 20, armor: 2 }, desc: 'Supple stitched leather for agile maneuvering.' },
    arc_arm_2: { id: 'arc_arm_2', name: "Scout's Leather Vest", slot: 'armor', classReq: 'Archer', rarity: 'rare', icon: '🦺', stats: { maxHp: 42, armor: 5, speed: 6 }, desc: 'Reinforced chest piece offering mobility and protection.' },
    arc_arm_3: { id: 'arc_arm_3', name: 'Shadowstalker Garb', slot: 'armor', classReq: 'Archer', rarity: 'epic', icon: '🥋', stats: { maxHp: 80, armor: 9, speed: 11, crit: 7 }, desc: 'Midnight camouflage making the wearer whisper quiet.' },
    arc_arm_4: { id: 'arc_arm_4', name: 'Windrunner Jerkin', slot: 'armor', classReq: 'Archer', rarity: 'legendary', icon: '🍃', stats: { maxHp: 135, armor: 14, speed: 20, crit: 11, startingShield: 55 }, desc: 'Legendary ranger mantle that deflects incoming projectiles.' },

    // --- ARCHER HELMETS (Hoods / Coifs / Goggles) ---
    arc_helm_1: { id: 'arc_helm_1', name: "Ranger's Coif", slot: 'helmet', classReq: 'Archer', rarity: 'common', icon: '🧢', stats: { maxHp: 14, crit: 3 }, desc: 'Fitted leather coif shielding from brush.' },
    arc_helm_2: { id: 'arc_helm_2', name: 'Camouflage Hood', slot: 'helmet', classReq: 'Archer', rarity: 'rare', icon: '🧥', stats: { maxHp: 32, crit: 6, speed: 5 }, desc: 'Deep hood concealing the archer eyes from glare.' },
    arc_helm_3: { id: 'arc_helm_3', name: 'Goggles of the Sniper', slot: 'helmet', classReq: 'Archer', rarity: 'epic', icon: '🥽', stats: { maxHp: 55, crit: 11, damage: 14 }, desc: 'Enchanted lenses highlighting enemy weak points and critical joints.' },
    arc_helm_4: { id: 'arc_helm_4', name: 'Crown of the Windranger', slot: 'helmet', classReq: 'Archer', rarity: 'legendary', icon: '👑', stats: { maxHp: 92, crit: 17, damage: 24, speed: 14 }, desc: 'Silver feather crown blessed by the goddess of winds.' },

    // --- RELICS / ACCESSORIES (All Classes) ---
    acc_1: { id: 'acc_1', name: 'Ring of Vitality', slot: 'accessory', classReq: 'All', rarity: 'common', icon: '💍', stats: { maxHp: 30 }, desc: 'A simple bronze ring pulsing with lively warmth.' },
    acc_2: { id: 'acc_2', name: 'Berserker Band', slot: 'accessory', classReq: 'All', rarity: 'rare', icon: '💍', stats: { damage: 12, crit: 6 }, desc: 'Rings with fierce bloodlust when in combat.' },
    acc_3: { id: 'acc_3', name: 'Ring of Swiftness', slot: 'accessory', classReq: 'All', rarity: 'rare', icon: '💍', stats: { speed: 12, maxHp: 25 }, desc: 'Imbued with wind spirits, making your step featherlight.' },
    acc_4: { id: 'acc_4', name: 'Amulet of the Lich King', slot: 'accessory', classReq: 'All', rarity: 'epic', icon: '📿', stats: { lifesteal: 3, maxHp: 60, damage: 14 }, desc: 'Siphons life essence directly from slaying your enemies.' },
    acc_5: { id: 'acc_5', name: 'Ring of Arcane Surge', slot: 'accessory', classReq: 'All', rarity: 'rare', icon: '💍', stats: { maxMana: 60, damage: 10 }, desc: 'A sapphire ring that constantly expands maximum mana reservoirs.' },
    acc_6: { id: 'acc_6', name: 'Aegis Colossus Ring', slot: 'accessory', classReq: 'All', rarity: 'epic', icon: '💍', stats: { startingShield: 70, armor: 8, maxHp: 45 }, desc: 'Generates a fortified defensive barrier upon battle engagement.' },
    acc_7: { id: 'acc_7', name: 'Heart of the Titan', slot: 'accessory', classReq: 'All', rarity: 'legendary', icon: '❤️', stats: { maxHp: 130, damage: 22, armor: 10, startingShield: 60 }, desc: 'A petrified heart of an ancient colossus radiating vitality.' },
    acc_8: { id: 'acc_8', name: 'Eye of Eternity', slot: 'accessory', classReq: 'All', rarity: 'legendary', icon: '👁️', stats: { damage: 32, crit: 16, speed: 14, lifesteal: 4, maxHp: 90, maxMana: 70 }, desc: 'Cosmic artifact granting mastery across all archetypes and martial arts.' }
};

function loadSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) SAVE = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (!SAVE || typeof SAVE !== 'object') SAVE = { essence: 0, upgrades: {} };
    if (!SAVE.upgrades) SAVE.upgrades = {};
    if (typeof SAVE.essence !== 'number' || isNaN(SAVE.essence)) SAVE.essence = 0;
    
    // Initialize default class equipment paperdolls if not set
    if (!SAVE.equipped || typeof SAVE.equipped !== 'object') {
        SAVE.equipped = {
            Warrior: { weapon: 'war_wep_1', offhand: 'war_off_1', armor: 'war_arm_1', helmet: 'war_helm_1', accessory: 'acc_1' },
            Mage: { weapon: 'mag_wep_1', offhand: 'mag_off_1', armor: 'mag_arm_1', helmet: 'mag_helm_1', accessory: 'acc_5' },
            Archer: { weapon: 'arc_wep_1', offhand: 'arc_off_1', armor: 'arc_arm_1', helmet: 'arc_helm_1', accessory: 'acc_3' }
        };
    }
    // Initialize starter inventory stash if not set
    if (!Array.isArray(SAVE.inventory)) {
        SAVE.inventory = ['war_wep_2', 'mag_wep_2', 'arc_wep_2', 'war_arm_2', 'acc_2', 'acc_6'];
    }
}

function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ }
}
loadSave();

// --- GEAR & INVENTORY MODAL STATE & METHODS ---
let selectedStartHero = 'Warrior';
window.selectedStartHero = 'Warrior';
let currentGearHero = 'Warrior';
let currentInvFilter = 'usable';
let selectedInvItemId = null;
let activeLootDrop = null;

const RARITY_COLORS = {
    common: '#94a3b8',
    rare: '#38bdf8',
    epic: '#c084fc',
    legendary: '#fbbf24'
};

function getRarityBorder(rarity) {
    return RARITY_COLORS[rarity] || '#94a3b8';
}

function getStatString(stats) {
    if (!stats) return '';
    const parts = [];
    if (stats.damage) parts.push(`+${stats.damage} DMG`);
    if (stats.maxHp) parts.push(`+${stats.maxHp} HP`);
    if (stats.maxMana) parts.push(`+${stats.maxMana} Mana`);
    if (stats.armor) parts.push(`+${stats.armor} Armor`);
    if (stats.crit) parts.push(`+${stats.crit}% Crit`);
    if (stats.speed) parts.push(`+${stats.speed}% Spd`);
    if (stats.lifesteal) parts.push(`+${stats.lifesteal} Vamp`);
    if (stats.startingShield) parts.push(`+${stats.startingShield} Barrier`);
    return parts.join(', ');
}

window.selectStartHero = function(heroName) {
    initAudio();
    selectedStartHero = heroName;
    window.selectedStartHero = heroName;
    currentGearHero = heroName;

    ['Warrior', 'Mage', 'Archer'].forEach(h => {
        const card = document.getElementById(`hero-card-${h.toLowerCase()}`);
        const badge = document.getElementById(`badge-${h.toLowerCase()}-selected`);
        const isSel = (h.toLowerCase() === heroName.toLowerCase());
        if (card) card.classList.toggle('selected', isSel);
        if (badge) badge.style.display = isSel ? 'inline-block' : 'none';
    });
    updateStartLaunchButton();
};

function updateStartLaunchButton() {
    const btn = document.getElementById('btn-start-launch');
    if (!btn) return;
    const modeText = (GAME.mode === 'dungeon') ? '🏰 ENTER DUNGEON RAID' : '⚔️ START HORDE SURVIVAL';
    btn.innerText = `${modeText} (${(selectedStartHero || 'WARRIOR').toUpperCase()})`;
}

window.selectGameMode = function(mode) {
    initAudio();
    GAME.mode = mode;
    const btnHorde = document.getElementById('mode-btn-horde');
    const btnDungeon = document.getElementById('mode-btn-dungeon');
    const infoDungeon = document.getElementById('dungeon-info-banner');
    const infoHorde = document.getElementById('horde-info-banner');

    if (btnHorde) btnHorde.classList.toggle('active', mode === 'horde');
    if (btnDungeon) btnDungeon.classList.toggle('active', mode === 'dungeon');
    if (infoDungeon) infoDungeon.style.display = (mode === 'dungeon' ? 'block' : 'none');
    if (infoHorde) infoHorde.style.display = (mode === 'horde' ? 'block' : 'none');
    updateStartLaunchButton();
};

window.openGearModal = function() {
    initAudio();
    currentGearHero = (GAME.state === 'PLAYING' && PLAYER.class) ? PLAYER.class : (selectedStartHero || 'Warrior');
    currentInvFilter = 'usable';
    selectedInvItemId = null;
    const modal = document.getElementById('gear-screen');
    if (modal) modal.style.display = 'flex';
    renderGearModal();
};

window.closeGearModal = function() {
    const modal = document.getElementById('gear-screen');
    if (modal) modal.style.display = 'none';
};

window.toggleGearModal = function() {
    const modal = document.getElementById('gear-screen');
    if (modal && modal.style.display === 'flex') {
        window.closeGearModal();
    } else {
        window.openGearModal();
    }
};

window.filterInventory = function(filterType, btnEl) {
    initAudio();
    currentInvFilter = filterType;
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.inv-filter-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    renderInventoryGrid();
};

function renderGearModal() {
    const activeHero = (GAME.state === 'PLAYING' && PLAYER.class) ? PLAYER.class : (selectedStartHero || 'Warrior');
    currentGearHero = activeHero;

    const classLabel = document.getElementById('gear-class-label');
    const lvlLabel = document.getElementById('gear-level-label');
    const heroBadge = document.getElementById('gear-hero-badge');

    if (classLabel) classLabel.innerText = currentGearHero;
    if (lvlLabel) lvlLabel.innerText = `Lvl ${PLAYER.level || 1}`;
    if (heroBadge) {
        heroBadge.className = `item-class-badge badge-${currentGearHero.toLowerCase()}`;
        heroBadge.innerText = `🛡️ Active: ${currentGearHero}`;
    }

    // Render 5 Equipped Slots for the active character
    const eq = (SAVE.equipped && SAVE.equipped[currentGearHero]) ? SAVE.equipped[currentGearHero] : {};
    const slots = ['weapon', 'offhand', 'armor', 'helmet', 'accessory'];
    
    let sumDmg = 0, sumHp = 0, sumArmor = 0, sumCrit = 0, sumSpd = 0, sumMana = 0;

    slots.forEach(slotKey => {
        const itemId = eq[slotKey];
        const item = itemId ? ITEM_DATABASE[itemId] : null;
        
        const slotEl = document.getElementById(`slot-${slotKey}`);
        const iconEl = document.getElementById(`slot-${slotKey}-icon`);
        const nameEl = document.getElementById(`slot-${slotKey}-name`);
        const classEl = document.getElementById(`slot-${slotKey}-class`);
        const statsEl = document.getElementById(`slot-${slotKey}-stats`);

        if (item) {
            const rColor = getRarityBorder(item.rarity);
            if (slotEl) {
                slotEl.style.borderColor = rColor;
                slotEl.style.background = 'rgba(15, 23, 42, 0.9)';
            }
            if (iconEl) iconEl.innerText = item.icon;
            if (nameEl) {
                nameEl.innerText = item.name;
                nameEl.style.color = rColor;
            }
            if (classEl) {
                classEl.innerText = item.classReq === 'All' ? 'All Classes' : `${item.classReq} Only`;
                classEl.className = `item-class-badge badge-${item.classReq.toLowerCase()}`;
            }
            if (statsEl) statsEl.innerText = getStatString(item.stats);

            if (item.stats) {
                if (item.stats.damage) sumDmg += item.stats.damage;
                if (item.stats.maxHp) sumHp += item.stats.maxHp;
                if (item.stats.armor) sumArmor += item.stats.armor;
                if (item.stats.crit) sumCrit += item.stats.crit;
                if (item.stats.speed) sumSpd += item.stats.speed;
                if (item.stats.maxMana) sumMana += item.stats.maxMana;
            }
        } else {
            if (slotEl) {
                slotEl.style.borderColor = '#334155';
                slotEl.style.background = 'rgba(15, 23, 42, 0.6)';
            }
            if (iconEl) iconEl.innerText = (slotKey === 'weapon' ? '🗡️' : (slotKey === 'offhand' ? '🛡️' : (slotKey === 'armor' ? '🥋' : (slotKey === 'helmet' ? '🪖' : '💍'))));
            if (nameEl) {
                nameEl.innerText = 'Empty Slot';
                nameEl.style.color = '#94a3b8';
            }
            if (classEl) {
                classEl.innerText = currentGearHero;
                classEl.className = `item-class-badge badge-${currentGearHero.toLowerCase()}`;
            }
            if (statsEl) statsEl.innerText = 'Click an item in stash below to equip';
        }
    });

    // Update Gear Stat Summary
    const sumDmgEl = document.getElementById('gear-sum-dmg');
    const sumHpEl = document.getElementById('gear-sum-hp');
    const sumArmEl = document.getElementById('gear-sum-armor');
    const sumCritEl = document.getElementById('gear-sum-crit');
    const sumSpdEl = document.getElementById('gear-sum-spd');
    const sumManaEl = document.getElementById('gear-sum-mana');

    if (sumDmgEl) sumDmgEl.innerText = `+${sumDmg}`;
    if (sumHpEl) sumHpEl.innerText = `+${sumHp}`;
    if (sumArmEl) sumArmEl.innerText = `+${sumArmor}`;
    if (sumCritEl) sumCritEl.innerText = `+${sumCrit}%`;
    if (sumSpdEl) sumSpdEl.innerText = `+${sumSpd}%`;
    if (sumManaEl) sumManaEl.innerText = `+${sumMana}`;

    renderInventoryGrid();
}

function renderInventoryGrid() {
    const container = document.getElementById('inv-grid-container');
    const countEl = document.getElementById('inv-count');
    if (!container) return;
    container.innerHTML = '';

    const inv = SAVE.inventory || [];
    if (countEl) countEl.innerText = inv.length;

    let filtered = inv.filter(itemId => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return false;
        if (currentInvFilter === 'usable' || currentInvFilter === 'myclass') {
            return item.classReq === 'All' || item.classReq === currentGearHero;
        }
        if (currentInvFilter === 'weapon') return item.slot === 'weapon';
        if (currentInvFilter === 'armor') return item.slot === 'armor' || item.slot === 'helmet' || item.slot === 'offhand';
        if (currentInvFilter === 'accessory') return item.slot === 'accessory';
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#64748b; font-size:0.85rem; padding: 25px 0;">No items found matching this filter for ${currentGearHero}.<br>Vanquish dungeon mobs &amp; open chests to gather loot!</div>`;
    }

    filtered.forEach(itemId => {
        const item = ITEM_DATABASE[itemId];
        if (!item) return;

        const isSelected = (selectedInvItemId === itemId);
        const card = document.createElement('div');
        card.className = `inv-item-card rarity-${item.rarity}` + (isSelected ? ' selected' : '');
        card.style.borderColor = getRarityBorder(item.rarity);
        card.onclick = () => window.selectInvItem(itemId);

        const canEquip = (item.classReq === 'All' || item.classReq === currentGearHero);

        card.innerHTML = `
            <div class="inv-item-icon">${item.icon}</div>
            <div class="inv-item-name" style="color:${getRarityBorder(item.rarity)}">${item.name}</div>
            <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase;">${item.slot}</div>
            <span class="item-class-badge badge-${item.classReq.toLowerCase()}" style="font-size:0.6rem; margin-top:2px;">${item.classReq}</span>
            ${!canEquip ? `<span style="color:#ef4444; font-size:0.6rem; font-weight:bold;">Requires ${item.classReq}</span>` : `<span style="color:#34d399; font-size:0.6rem; font-weight:bold;">✓ Usable</span>`}
        `;
        container.appendChild(card);
    });

    // Populate detail panel if an item is selected
    updateInvItemDetail();
}

window.selectInvItem = function(itemId) {
    initAudio();
    selectedInvItemId = itemId;
    renderInventoryGrid();
};

window.handleSlotClick = function(slotName) {
    initAudio();
    const eq = SAVE.equipped && SAVE.equipped[currentGearHero] ? SAVE.equipped[currentGearHero] : {};
    const equippedId = eq[slotName];
    if (equippedId) {
        selectedInvItemId = equippedId;
        updateInvItemDetail();
    }
};

function updateInvItemDetail() {
    const detailCard = document.getElementById('inv-item-detail');
    if (!detailCard) return;

    if (!selectedInvItemId || !ITEM_DATABASE[selectedInvItemId]) {
        detailCard.style.display = 'none';
        return;
    }

    detailCard.style.display = 'block';
    const item = ITEM_DATABASE[selectedInvItemId];
    const rColor = getRarityBorder(item.rarity);

    const iconEl = document.getElementById('detail-item-icon');
    const nameEl = document.getElementById('detail-item-name');
    const slotEl = document.getElementById('detail-item-slot');
    const classEl = document.getElementById('detail-item-class');
    const descEl = document.getElementById('detail-item-desc');
    const compEl = document.getElementById('detail-item-comparison');
    const equipBtn = document.getElementById('btn-equip-item');

    if (iconEl) iconEl.innerText = item.icon;
    if (nameEl) {
        nameEl.innerText = item.name;
        nameEl.style.color = rColor;
    }
    if (slotEl) slotEl.innerText = `${item.rarity.toUpperCase()} ${item.slot.toUpperCase()}`;
    if (classEl) {
        classEl.innerText = item.classReq === 'All' ? 'All Classes' : `${item.classReq} Only`;
        classEl.className = `item-class-badge badge-${item.classReq.toLowerCase()}`;
    }
    if (descEl) descEl.innerText = `${getStatString(item.stats)} • ${item.desc}`;

    // Comparison vs current equipped in slot
    const eq = SAVE.equipped && SAVE.equipped[currentGearHero] ? SAVE.equipped[currentGearHero] : {};
    const currentEqId = eq[item.slot];
    const currentEqItem = currentEqId ? ITEM_DATABASE[currentEqId] : null;

    if (currentEqItem) {
        const dmgDiff = (item.stats.damage || 0) - (currentEqItem.stats.damage || 0);
        const hpDiff = (item.stats.maxHp || 0) - (currentEqItem.stats.maxHp || 0);
        let compText = `Vs Equipped (${currentEqItem.name}): `;
        if (dmgDiff !== 0) compText += `${dmgDiff > 0 ? '+' : ''}${dmgDiff} DMG `;
        if (hpDiff !== 0) compText += `${hpDiff > 0 ? '+' : ''}${hpDiff} HP `;
        if (dmgDiff === 0 && hpDiff === 0) compText += 'Identical stats';
        if (compEl) {
            compEl.innerText = compText;
            compEl.style.color = (dmgDiff >= 0 && hpDiff >= 0) ? '#34d399' : '#fb923c';
        }
    } else {
        if (compEl) {
            compEl.innerText = 'Slot currently empty: Massive upgrade!';
            compEl.style.color = '#34d399';
        }
    }

    const canEquip = (item.classReq === 'All' || item.classReq === currentGearHero);
    if (equipBtn) {
        equipBtn.disabled = !canEquip;
        equipBtn.innerText = canEquip ? `⚔️ Equip to ${currentGearHero}` : `🚫 Requires ${item.classReq}`;
        equipBtn.style.opacity = canEquip ? '1' : '0.6';
    }
}

window.equipSelectedItem = function() {
    if (!selectedInvItemId || !ITEM_DATABASE[selectedInvItemId]) return;
    const item = ITEM_DATABASE[selectedInvItemId];
    if (item.classReq !== 'All' && item.classReq !== currentGearHero) {
        logMessage(`Cannot equip: ${item.name} requires ${item.classReq}!`, '#ef4444');
        return;
    }

    if (!SAVE.equipped) SAVE.equipped = {};
    if (!SAVE.equipped[currentGearHero]) SAVE.equipped[currentGearHero] = {};

    const oldEquippedId = SAVE.equipped[currentGearHero][item.slot];
    SAVE.equipped[currentGearHero][item.slot] = item.id;

    // Remove from inventory
    const idx = SAVE.inventory.indexOf(item.id);
    if (idx !== -1) SAVE.inventory.splice(idx, 1);

    // Return old equipped item to inventory if valid
    if (oldEquippedId && oldEquippedId !== item.id) {
        SAVE.inventory.push(oldEquippedId);
    }

    writeSave();
    SFX.equip();
    logMessage(`Equipped ${item.name} on ${currentGearHero}!`, getRarityBorder(item.rarity));

    applyEquipmentStats(currentGearHero);
    updateGUI();
    renderGearModal();
};

window.scrapSelectedItem = function() {
    if (!selectedInvItemId || !ITEM_DATABASE[selectedInvItemId]) return;
    const item = ITEM_DATABASE[selectedInvItemId];
    const idx = SAVE.inventory.indexOf(selectedInvItemId);
    if (idx === -1) {
        logMessage('Cannot scrap an actively equipped item. Equip another item first!', '#ef4444');
        return;
    }

    const scrapValues = { common: 35, rare: 80, epic: 180, legendary: 450 };
    const goldEarned = scrapValues[item.rarity] || 40;
    const essenceEarned = Math.floor(goldEarned * 0.4);

    SAVE.inventory.splice(idx, 1);
    GAME.gold += goldEarned;
    SAVE.essence += essenceEarned;
    writeSave();

    SFX.scrap();
    logMessage(`Scrapped ${item.name} for +${goldEarned} Gold & +${essenceEarned} Essence!`, '#fde047');

    selectedInvItemId = null;
    updateGUI();
    renderGearModal();
};

window.autoEquipBestGear = function() {
    initAudio();
    if (!SAVE.inventory || SAVE.inventory.length === 0) {
        logMessage(`No items in stash to equip!`, '#94a3b8');
        return;
    }
    const slots = ['weapon', 'offhand', 'armor', 'helmet', 'accessory'];
    let equippedCount = 0;

    slots.forEach(slotKey => {
        const available = SAVE.inventory.map(id => ITEM_DATABASE[id]).filter(it => it && it.slot === slotKey && (it.classReq === 'All' || it.classReq === currentGearHero));
        if (available.length === 0) return;

        // Score items by total stats
        available.sort((a, b) => {
            const scoreA = (a.stats.damage || 0) * 2 + (a.stats.maxHp || 0) + (a.stats.armor || 0) * 3 + (a.stats.crit || 0) * 2 + (a.stats.lifesteal || 0) * 5;
            const scoreB = (b.stats.damage || 0) * 2 + (b.stats.maxHp || 0) + (b.stats.armor || 0) * 3 + (b.stats.crit || 0) * 2 + (b.stats.lifesteal || 0) * 5;
            return scoreB - scoreA;
        });

        const best = available[0];
        const currentId = SAVE.equipped && SAVE.equipped[currentGearHero] ? SAVE.equipped[currentGearHero][slotKey] : null;
        const currentItem = currentId ? ITEM_DATABASE[currentId] : null;

        let shouldEquip = false;
        if (!currentItem) {
            shouldEquip = true;
        } else {
            const currentScore = (currentItem.stats.damage || 0) * 2 + (currentItem.stats.maxHp || 0) + (currentItem.stats.armor || 0) * 3 + (currentItem.stats.crit || 0) * 2 + (currentItem.stats.lifesteal || 0) * 5;
            const bestScore = (best.stats.damage || 0) * 2 + (best.stats.maxHp || 0) + (best.stats.armor || 0) * 3 + (best.stats.crit || 0) * 2 + (best.stats.lifesteal || 0) * 5;
            if (bestScore > currentScore) shouldEquip = true;
        }

        if (shouldEquip) {
            if (!SAVE.equipped[currentGearHero]) SAVE.equipped[currentGearHero] = {};
            const old = SAVE.equipped[currentGearHero][slotKey];
            SAVE.equipped[currentGearHero][slotKey] = best.id;
            
            const invIdx = SAVE.inventory.indexOf(best.id);
            if (invIdx !== -1) SAVE.inventory.splice(invIdx, 1);
            if (old && old !== best.id) SAVE.inventory.push(old);
            equippedCount++;
        }
    });

    if (equippedCount > 0) {
        writeSave();
        SFX.equip();
        logMessage(`Auto-equipped ${equippedCount} Best in Slot upgrades for ${currentGearHero}!`, '#38bdf8');
        applyEquipmentStats(currentGearHero);
        updateGUI();
        renderGearModal();
    } else {
        logMessage(`Already wearing best available gear for ${currentGearHero}!`, '#94a3b8');
    }
};

function applyEquipmentStats(className = (PLAYER.class || selectedStartHero || 'Warrior')) {
    const eq = SAVE.equipped && SAVE.equipped[className] ? SAVE.equipped[className] : {};
    let addHp = 0, addMana = 0, addDmg = 0, addArmor = 0, addCrit = 0, addSpeed = 0, addLifesteal = 0, addShield = 0;

    for (const slot in eq) {
        const itemId = eq[slot];
        if (itemId && ITEM_DATABASE[itemId]) {
            const item = ITEM_DATABASE[itemId];
            const st = item.stats || {};
            if (st.maxHp) addHp += st.maxHp;
            if (st.maxMana) addMana += st.maxMana;
            if (st.damage) addDmg += st.damage;
            if (st.armor) addArmor += st.armor;
            if (st.crit) addCrit += st.crit;
            if (st.speed) addSpeed += st.speed;
            if (st.lifesteal) addLifesteal += st.lifesteal;
            if (st.startingShield) addShield += st.startingShield;
        }
    }

    PLAYER.gearBonus = {
        hp: addHp, mana: addMana, damage: addDmg, armor: addArmor,
        crit: addCrit, speed: addSpeed, lifesteal: addLifesteal, shield: addShield
    };

    const baseData = CLASSES[className] || CLASSES.Warrior;
    PLAYER.maxHp = baseData.baseHp + PERM.hpBonus + addHp;
    PLAYER.maxMana = baseData.baseMana + PERM.manaBonus + addMana;
    PLAYER.damage = Math.round((baseData.baseDamage + addDmg) * PERM.damageMult);
    PLAYER.speed = baseData.baseSpeed + (addSpeed * 0.15);

    PERM.damageReduction = ((SAVE.upgrades.ironSkin || 0) * 2) + addArmor;
    PERM.critChance = ((SAVE.upgrades.criticalStrike || 0) * 0.04) + (addCrit * 0.01);
    PERM.lifesteal = ((SAVE.upgrades.vampirism || 0) * 1.5) + addLifesteal;
    if (addShield > 0 && GAME.shield < (PERM.startingShield + addShield)) {
        GAME.shield = Math.max(GAME.shield, PERM.startingShield + addShield);
    }
}

const PERM = {
    hpBonus: 0, damageMult: 1, speedMult: 1, manaBonus: 0,
    dropBonus: 0, goldMult: 1, lifesteal: 0,
    critChance: 0, critMult: 2.0,
    regenPerSec: 0, pickupRadius: 4.0,
    reviveAvailable: false, reviveUsed: false,
    manaRegenPerSec: 0, spellDamageMult: 1.0,
    startingShield: 0, chestLootBonus: 0, fireRateMult: 1.0
};

const UPGRADES = {
    // Survival & Defense
    vitality:       { name: 'Vitality',        category: 'defense', icon: '❤️', color: '#e74c3c', max: 10, baseCost: 20, growth: 1.25, desc: lvl => `+${lvl * 15} Max Health Points` },
    secondWind:     { name: 'Second Wind',     category: 'defense', icon: '🌱', color: '#1abc9c', max: 6,  baseCost: 35, growth: 1.30, desc: lvl => `Regenerates ${(lvl * 0.6).toFixed(1)}% Max HP per second` },
    ironSkin:       { name: 'Iron Skin',       category: 'defense', icon: '🛡️', color: '#64748b', max: 6,  baseCost: 35, growth: 1.32, desc: lvl => `Reduces incoming enemy damage by ${lvl * 2}` },
    bulwark:        { name: 'Titan Bulwark',   category: 'defense', icon: '🏰', color: '#3b82f6', max: 5,  baseCost: 40, growth: 1.35, desc: lvl => `Gain +${lvl * 30} starting Barrier Shield every wave` },
    vampirism:      { name: 'Vampirism',       category: 'defense', icon: '🩸', color: '#c0392b', max: 6,  baseCost: 40, growth: 1.35, desc: lvl => `+${lvl * 1.5} Lifesteal HP recovery per kill` },
    guardianAngel:  { name: 'Guardian Angel',  category: 'defense', icon: '🕊️', color: '#fceabb', max: 2,  baseCost: 250, growth: 2.0,  desc: lvl => `Revive ${lvl} time${lvl>1?'s':''} per run with 60% HP` },

    // Offense & Power
    power:          { name: 'Power Strike',    category: 'offense', icon: '⚔️', color: '#e67e22', max: 10, baseCost: 25, growth: 1.28, desc: lvl => `+${lvl * 7}% All Weapon Damage` },
    criticalStrike: { name: 'Critical Strike', category: 'offense', icon: '🎯', color: '#ff6b6b', max: 8,  baseCost: 30, growth: 1.30, desc: lvl => `+${lvl * 4}% Crit Chance (${(2 + lvl * 0.15).toFixed(2)}x dmg)` },
    swiftStrikes:   { name: 'Swift Strikes',   category: 'offense', icon: '⚡', color: '#f39c12', max: 8,  baseCost: 30, growth: 1.30, desc: lvl => `+${lvl * 4}% Attack & Cast Speed` },
    spellMastery:   { name: 'Spell Mastery',   category: 'offense', icon: '📖', color: '#a855f7', max: 6,  baseCost: 45, growth: 1.35, desc: lvl => `+${lvl * 8}% Elemental & Secondary Spell Burst Damage` },
    overwhelm:      { name: 'Overwhelm',       category: 'offense', icon: '💥', color: '#d35400', max: 5,  baseCost: 50, growth: 1.38, desc: lvl => `Bosses take +${lvl * 10}% more damage` },

    // Utility & Economy
    swiftness:      { name: 'Fleet Footwork',  category: 'utility', icon: '👟', color: '#2ecc71', max: 8,  baseCost: 20, growth: 1.26, desc: lvl => `+${lvl * 3.5}% Movement Speed` },
    fortune:        { name: 'Treasure Seeker', category: 'utility', icon: '🍀', color: '#9b59b6', max: 6,  baseCost: 35, growth: 1.35, desc: lvl => `+${lvl * 4}% Item & Gem Drop Chance` },
    greed:          { name: 'Bounty Hunter',   category: 'utility', icon: '💰', color: '#f1c40f', max: 8,  baseCost: 25, growth: 1.30, desc: lvl => `+${lvl * 12}% Gold picked up & rewarded` },
    headStart:      { name: 'Head Start',      category: 'utility', icon: '🪙', color: '#f9ca24', max: 5,  baseCost: 30, growth: 1.28, desc: lvl => `Start every run with ${lvl * 120} Gold` },
    magnetism:      { name: 'Magnetism',       category: 'utility', icon: '🧲', color: '#95a5a6', max: 5,  baseCost: 25, growth: 1.28, desc: lvl => `+${lvl * 45}% Loot Pickup Vacuum Radius` },
    arcaneReserve:  { name: 'Arcane Surge',    category: 'utility', icon: '🔮', color: '#3498db', max: 6,  baseCost: 25, growth: 1.28, desc: lvl => `+${lvl * 20} Max Mana & +${lvl * 10}% Ult Charge Rate` },
    manaRegen:      { name: 'Mana Wellspring', category: 'utility', icon: '🌊', color: '#06b6d4', max: 5,  baseCost: 30, growth: 1.30, desc: lvl => `+${lvl * 4} Passive Mana regeneration per second` },
    relicAppraiser: { name: 'Relic Appraiser', category: 'utility', icon: '💎', color: '#ec4899', max: 5,  baseCost: 45, growth: 1.38, desc: lvl => `Treasure Chests drop +${lvl * 25}% extra loot & gems` }
};

// --- RUN MERCHANT ITEMS (Spend Gold In-Run) ---
const RUN_ITEMS = {
    // Healing & Defense
    healthPot:     { name: 'Health Potion',       category: 'consumable', color: '#ef4444', cost: 25,  icon: '🧪', desc: 'Restores 60 HP instantly' },
    maxHpElixir:   { name: 'Vitality Elixir',     category: 'stat_boost', color: '#ec4899', cost: 65,  icon: '🍷', desc: '+30 Max HP permanently and heals 60 HP' },
    aegisShield:   { name: 'Aegis Barrier',       category: 'defense',    color: '#06b6d4', cost: 95,  icon: '🛡️', desc: 'Grants +120 HP Damage-absorbing Barrier' },
    purifyingWard: { name: 'Purifying Ward',      category: 'defense',    color: '#38bdf8', cost: 80,  icon: '💠', desc: 'Grants 4s complete invulnerability' },
    manaFlask:     { name: 'Mana Flask',          category: 'consumable', color: '#3b82f6', cost: 20,  icon: '💧', desc: 'Restores full Mana pool instantly' },
    orbOfWinter:   { name: 'Orb of Winter',       category: 'defense',    color: '#67e8f9', cost: 120, icon: '🔮', desc: 'Surrounds hero with chilling frost aura slowing nearby enemies by 40%' },
    phoenixFeather:{ name: 'Phoenix Feather',     category: 'defense',    color: '#fde047', cost: 200, icon: '🕊️', desc: '+1 In-run Revive upon death (Stores in inventory)' },

    // Combat Enhancements
    dmgInfusion:   { name: 'Damage Infusion',     category: 'stat_boost', color: '#f97316', cost: 80,  icon: '⚔️', desc: '+15% Weapon Damage (Stackable)' },
    atkSpeedPot:   { name: 'Frenzy Potion',       category: 'stat_boost', color: '#eab308', cost: 80,  icon: '🏹', desc: '+20% Attack Fire Rate (Stackable)' },
    bootsSpeed:    { name: 'Boots of Swiftness',  category: 'stat_boost', color: '#10b981', cost: 60,  icon: '👢', desc: '+15% Move Speed (Stackable)' },
    scopeGlass:    { name: 'Crit Lens',           category: 'stat_boost', color: '#fb7185', cost: 90,  icon: '🎯', desc: '+10% Critical Strike Chance' },
    vampiricDagger:{ name: 'Blood Dagger',        category: 'stat_boost', color: '#f43f5e', cost: 110, icon: '🗡️', desc: '+2.0 HP Lifesteal recovery on every hit for the rest of run' },
    titanRing:     { name: 'Ring of Colossus',    category: 'stat_boost', color: '#f59e0b', cost: 125, icon: '💍', desc: '+50 Max HP & +12 Base Damage' },
    ultOvercharge: { name: 'Ultimate Battery',    category: 'combat',     color: '#8b5cf6', cost: 70,  icon: '⚡', desc: 'Instantly fully charges your Ultimate Ability' },

    // Tactical & Field Powers
    tacticalNuke:  { name: 'Tactical Nuke',       category: 'combat',     color: '#f43f5e', cost: 140, icon: '💣', desc: 'Detonates massive blast wiping all regular enemies' },
    frostGrenade:  { name: 'Blizzard Grenade',    category: 'combat',     color: '#67e8f9', cost: 85,  icon: '❄️', desc: 'Freezes all enemies on screen solid for 6 seconds' },
    chainLightningScroll: { name: 'Scroll of Storms', category: 'combat', color: '#60a5fa', cost: 95, icon: '🌩️', desc: 'Casts lightning bolts striking 12 random enemies for 180 DMG' },
    hyperDrive:    { name: 'Hyperdrive Warp',     category: 'utility',    color: '#38bdf8', cost: 75,  icon: '🚀', desc: '+50% Move Speed for 25 seconds' },
    magnetSurge:   { name: 'Magnet Surge',        category: 'utility',    color: '#a855f7', cost: 45,  icon: '🧲', desc: 'Instantly vacuums all gems, gold, and drops on the map' },
    midasTouch:    { name: 'Midas Bounty',        category: 'utility',    color: '#eab308', cost: 110, icon: '🪙', desc: 'Enemies drop +50% more Gold for the next 2 waves' },
    essenceExtractor: { name: 'Essence Alembic',  category: 'utility',    color: '#c084fc', cost: 130, icon: '✨', desc: 'Converts run wealth into +60 Permanent Essence ✨' }
};

function getUpgradeCost(id) {
    const def = UPGRADES[id];
    const lvl = SAVE.upgrades[id] || 0;
    if (lvl >= def.max) return null;
    return Math.floor(def.baseCost * Math.pow(def.growth, lvl));
}

// --- DAILY QUEST SYSTEM ---
const QUEST_POOL = [
    { id: 'kills_50',  title: 'Horde Cleanser',     desc: 'Defeat 50 monsters in combat',       target: 50,  reward: 80,  type: 'kills',   icon: '💀' },
    { id: 'kills_120', title: 'Monster Executioner', desc: 'Slay 120 enemies across runs',       target: 120, reward: 150, type: 'kills',   icon: '⚔️' },
    { id: 'waves_3',   title: 'Wave Survivor',       desc: 'Survive and clear 3 combat waves',   target: 3,   reward: 90,  type: 'waves',   icon: '🌊' },
    { id: 'waves_6',   title: 'Frontline Defender',  desc: 'Clear 6 combat waves',               target: 6,   reward: 160, type: 'waves',   icon: '🛡️' },
    { id: 'gold_250',  title: 'Bounty Collector',    desc: 'Gather 250 Gold in runs',            target: 250, reward: 85,  type: 'gold',    icon: '🪙' },
    { id: 'gold_600',  title: 'Treasure Hoarder',    desc: 'Gather 600 Gold in runs',            target: 600, reward: 150, type: 'gold',    icon: '💰' },
    { id: 'boss_1',    title: 'Titan Slayer',        desc: 'Vanquish a giant Wave Boss',         target: 1,   reward: 120, type: 'boss',    icon: '👑' },
    { id: 'ult_4',     title: 'Ultimate Mastery',    desc: 'Unleash your Ultimate ability 4x',   target: 4,   reward: 80,  type: 'ult',     icon: '⚡' },
    { id: 'chests_2',  title: 'Relic Hunter',        desc: 'Find and smash open 2 Chests',       target: 2,   reward: 75,  type: 'chests',  icon: '📦' },
    { id: 'shrines_2', title: 'Ancient Devotee',     desc: 'Pray at 2 Ancient Power Shrines',    target: 2,   reward: 70,  type: 'shrines', icon: '✨' },
    { id: 'level_6',   title: 'Hero Ascension',      desc: 'Reach Level 6 in any run',           target: 6,   reward: 90,  type: 'level',   icon: '⭐' },
    { id: 'elites_12', title: 'Giant Hunter',        desc: 'Defeat 12 heavy Orcs or Slimes',     target: 12,  reward: 85,  type: 'elites',  icon: '👹' }
];

function getDailyDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function initDailyQuests() {
    const today = getDailyDateKey();
    if (!SAVE.dailyQuests || SAVE.dailyQuests.date !== today || !Array.isArray(SAVE.dailyQuests.list) || SAVE.dailyQuests.list.length === 0) {
        // Deterministic or seeded shuffle for the day
        let seed = 0;
        for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
        const shuffled = [...QUEST_POOL].sort((a, b) => {
            const hA = (seed ^ (a.id.charCodeAt(0) * 17)) % 100;
            const hB = (seed ^ (b.id.charCodeAt(0) * 17)) % 100;
            return hA - hB;
        });
        
        SAVE.dailyQuests = {
            date: today,
            list: shuffled.slice(0, 4).map(q => ({
                id: q.id,
                title: q.title,
                desc: q.desc,
                target: q.target,
                progress: 0,
                reward: q.reward,
                type: q.type,
                icon: q.icon,
                completed: false,
                claimed: false
            }))
        };
        writeSave();
    }
    updateQuestBadges();
}

function trackQuestProgress(type, amount = 1, isAbsolute = false) {
    if (!SAVE.dailyQuests || !Array.isArray(SAVE.dailyQuests.list)) {
        initDailyQuests();
    }
    if (!SAVE.dailyQuests || !Array.isArray(SAVE.dailyQuests.list)) return;
    
    let changed = false;
    SAVE.dailyQuests.list.forEach(q => {
        if (q.type === type && !q.claimed) {
            const oldProg = q.progress;
            if (isAbsolute) {
                if (amount > q.progress) {
                    q.progress = Math.min(q.target, amount);
                }
            } else {
                q.progress = Math.min(q.target, q.progress + amount);
            }
            
            if (q.progress !== oldProg) {
                changed = true;
            }
            
            if (q.progress >= q.target && !q.completed) {
                q.completed = true;
                changed = true;
                SFX.levelUp();
                logMessage(`🎉 Daily Quest Complete: ${q.title}! (+${q.reward} ✨)`, '#c084fc');
                const pPos = (typeof playerMesh !== 'undefined' && playerMesh) ? playerMesh.position : new THREE.Vector3(0, 4, 0);
                spawnFloatingText(pPos, `🎉 QUEST COMPLETE: +${q.reward} ✨`, '#c084fc', 20, true, '📜');
            }
        }
    });

    if (changed) {
        writeSave();
        updateQuestBadges();
        if (document.getElementById('quests-screen') && document.getElementById('quests-screen').style.display === 'flex') {
            renderQuests();
        }
    }
}

function updateQuestBadges() {
    if (!SAVE.dailyQuests || !Array.isArray(SAVE.dailyQuests.list)) return;
    const unclaimedCount = SAVE.dailyQuests.list.filter(q => q.completed && !q.claimed).length;
    const topBadge = document.getElementById('top-quest-badge');
    const startBadge = document.getElementById('start-quest-badge');
    const claimAllBtn = document.getElementById('btn-claim-all-quests');
    
    if (topBadge) {
        topBadge.style.display = unclaimedCount > 0 ? 'inline-block' : 'none';
        topBadge.innerText = unclaimedCount;
    }
    if (startBadge) {
        startBadge.style.display = unclaimedCount > 0 ? 'inline-block' : 'none';
        startBadge.innerText = unclaimedCount;
    }
    if (claimAllBtn) {
        claimAllBtn.style.display = unclaimedCount > 1 ? 'inline-block' : 'none';
    }
    const essenceDisplay = document.getElementById('quest-essence-display');
    if (essenceDisplay) essenceDisplay.innerText = SAVE.essence;
    const startEssence = document.getElementById('start-essence');
    if (startEssence) startEssence.innerText = SAVE.essence;
}

function updateQuestResetTimer() {
    const timerEl = document.getElementById('quest-reset-timer');
    if (!timerEl) return;
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const diff = Math.max(0, tomorrow.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    timerEl.innerText = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

function renderQuests() {
    const container = document.getElementById('quests-list-container');
    if (!container) return;
    initDailyQuests();
    const list = SAVE.dailyQuests.list;
    container.innerHTML = '';
    
    list.forEach(q => {
        const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
        const card = document.createElement('div');
        card.className = `quest-card ${q.claimed ? 'claimed' : (q.completed ? 'completed' : '')}`;
        
        let actionHtml = '';
        if (q.claimed) {
            actionHtml = `<span class="quest-claimed-badge">✅ Claimed</span>`;
        } else if (q.completed) {
            actionHtml = `<button class="btn-claim" onclick="claimQuest('${q.id}')">🎁 Claim +${q.reward} ✨</button>`;
        } else {
            actionHtml = `<span style="font-size:0.8rem; color:#94a3b8; font-weight:600; white-space:nowrap;">In Progress</span>`;
        }
        
        card.innerHTML = `
            <div class="quest-icon-wrap">${q.icon || '📜'}</div>
            <div class="quest-content">
                <div class="quest-title-row">
                    <span class="quest-title">${q.title}</span>
                    <span class="quest-reward-pill">+${q.reward} ✨ Essence</span>
                </div>
                <div class="quest-desc">${q.desc}</div>
                <div class="quest-prog-bar-wrap">
                    <div class="quest-prog-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <div class="quest-prog-text">
                    <span>Progress: ${Math.min(q.target, q.progress)} / ${q.target}</span>
                    <span>${pct}%</span>
                </div>
            </div>
            <div class="quest-action-col">
                ${actionHtml}
            </div>
        `;
        container.appendChild(card);
    });
    
    updateQuestBadges();
}

window.claimQuest = function(id) {
    if (!SAVE.dailyQuests || !Array.isArray(SAVE.dailyQuests.list)) return;
    const q = SAVE.dailyQuests.list.find(x => x.id === id);
    if (q && q.completed && !q.claimed) {
        q.claimed = true;
        SAVE.essence += q.reward;
        writeSave();
        SFX.item();
        logMessage(`Claimed ${q.reward} Essence from: ${q.title}!`, '#c084fc');
        const pPos = (typeof playerMesh !== 'undefined' && playerMesh) ? playerMesh.position : new THREE.Vector3(0, 4, 0);
        spawnFloatingText(pPos, `+${q.reward} ESSENCE ✨`, '#c084fc', 22, true, '✨');
        renderQuests();
        updateQuestBadges();
        updateGUI();
    }
};

window.claimAllQuests = function() {
    if (!SAVE.dailyQuests || !Array.isArray(SAVE.dailyQuests.list)) return;
    let totalClaimed = 0;
    SAVE.dailyQuests.list.forEach(q => {
        if (q.completed && !q.claimed) {
            q.claimed = true;
            totalClaimed += q.reward;
        }
    });
    if (totalClaimed > 0) {
        SAVE.essence += totalClaimed;
        writeSave();
        SFX.item();
        logMessage(`Claimed ALL Quests! +${totalClaimed} Essence ✨`, '#c084fc');
        const pPos = (typeof playerMesh !== 'undefined' && playerMesh) ? playerMesh.position : new THREE.Vector3(0, 4, 0);
        spawnFloatingText(pPos, `+${totalClaimed} ESSENCE ✨`, '#c084fc', 22, true, '✨');
        renderQuests();
        updateQuestBadges();
        updateGUI();
    }
};

window.openQuestsModal = function() {
    initAudio();
    initDailyQuests();
    renderQuests();
    updateQuestResetTimer();
    document.getElementById('quests-screen').style.display = 'flex';
};

window.closeQuestsModal = function() {
    document.getElementById('quests-screen').style.display = 'none';
};

window.toggleQuestsModal = function() {
    const el = document.getElementById('quests-screen');
    if (el.style.display === 'flex') {
        closeQuestsModal();
    } else {
        openQuestsModal();
    }
};

// --- SHOP UI & MODAL STATE ---
let currentShopTab = 'merchant';
let currentCategoryFilter = 'all';
let currentSearchQuery = '';

window.openShopModal = function(tab = 'merchant') {
    initAudio();
    document.getElementById('shop-screen').style.display = 'flex';
    switchShopTab(tab);
};

window.closeShopModal = function() {
    document.getElementById('shop-screen').style.display = 'none';
    if (GAME.state === 'START') {
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('start-essence').innerText = SAVE.essence;
    }
};

window.toggleShopModal = function() {
    const el = document.getElementById('shop-screen');
    if (el.style.display === 'flex') {
        closeShopModal();
    } else {
        openShopModal('merchant');
    }
};

window.switchShopTab = function(tab) {
    currentShopTab = tab;
    currentCategoryFilter = 'all';
    currentSearchQuery = '';
    const searchInput = document.getElementById('shop-search');
    if (searchInput) searchInput.value = '';

    const btnMerchant = document.getElementById('tab-btn-merchant');
    const btnSanctuary = document.getElementById('tab-btn-sanctuary');
    const cMerchant = document.getElementById('merchant-tab-content');
    const cSanctuary = document.getElementById('sanctuary-tab-content');
    
    renderFilterButtons();
    updateShopSummaryBar();

    if (tab === 'merchant') {
        btnMerchant.classList.add('active');
        btnSanctuary.classList.remove('active');
        cMerchant.style.display = 'flex';
        cSanctuary.style.display = 'none';
        renderMerchant();
    } else {
        btnMerchant.classList.remove('active');
        btnSanctuary.classList.add('active');
        cMerchant.style.display = 'none';
        cSanctuary.style.display = 'flex';
        renderSanctuary();
    }
};

function renderFilterButtons() {
    const container = document.getElementById('shop-filter-buttons');
    if (!container) return;
    container.innerHTML = '';

    const filters = currentShopTab === 'merchant'
        ? [
            { id: 'all', label: 'All Items' },
            { id: 'consumable', label: '🧪 Potions' },
            { id: 'stat_boost', label: '⚔️ Buffs' },
            { id: 'defense', label: '🛡️ Defense' },
            { id: 'combat', label: '💣 Combat' },
            { id: 'utility', label: '🧲 Utility' }
          ]
        : [
            { id: 'all', label: 'All Upgrades' },
            { id: 'defense', label: '🛡️ Survival' },
            { id: 'offense', label: '⚔️ Offense' },
            { id: 'utility', label: '✨ Utility' }
          ];

    filters.forEach(f => {
        const btn = document.createElement('button');
        btn.className = `shop-filter-btn ${currentCategoryFilter === f.id ? 'active' : ''}`;
        btn.innerText = f.label;
        btn.onclick = () => {
            currentCategoryFilter = f.id;
            renderFilterButtons();
            if (currentShopTab === 'merchant') renderMerchant();
            else renderSanctuary();
        };
        container.appendChild(btn);
    });
}

window.handleShopSearch = function(val) {
    currentSearchQuery = (val || '').toLowerCase().trim();
    if (currentShopTab === 'merchant') renderMerchant();
    else renderSanctuary();
};

function updateShopSummaryBar() {
    const sumHp = document.getElementById('shop-sum-hp');
    const sumShield = document.getElementById('shop-sum-shield');
    const sumDmg = document.getElementById('shop-sum-dmg');
    const sumSpd = document.getElementById('shop-sum-spd');
    const sumRev = document.getElementById('shop-sum-rev');

    if (sumHp) sumHp.innerText = `${Math.floor(PLAYER.hp)}/${PLAYER.maxHp}`;
    if (sumShield) sumShield.innerText = GAME.shield > 0 ? `+${GAME.shield}` : '0';
    if (sumDmg) sumDmg.innerText = PLAYER.damage;
    const speedPct = Math.round((EFFECTS.moveSpeedMult - 1) * 100);
    if (sumSpd) sumSpd.innerText = `${speedPct >= 0 ? '+' : ''}${speedPct}%`;
    const totalRevives = GAME.reviveTokens + (PERM.reviveAvailable && !PERM.reviveUsed ? 1 : 0);
    if (sumRev) sumRev.innerText = totalRevives;

    const goldEl = document.getElementById('shop-gold');
    if (goldEl) goldEl.innerText = GAME.gold;
    const essEl = document.getElementById('shop-essence');
    if (essEl) essEl.innerText = SAVE.essence;
}

function renderMerchant() {
    updateShopSummaryBar();
    const container = document.getElementById('merchant-options');
    if (!container) return;
    container.innerHTML = '';

    const itemKeys = Object.keys(RUN_ITEMS).filter(id => {
        const item = RUN_ITEMS[id];
        const matchCategory = currentCategoryFilter === 'all' || item.category === currentCategoryFilter;
        const matchSearch = !currentSearchQuery || item.name.toLowerCase().includes(currentSearchQuery) || item.desc.toLowerCase().includes(currentSearchQuery);
        return matchCategory && matchSearch;
    });

    if (itemKeys.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; grid-column:1/-1; text-align:center; padding:30px;">No items match your filter/search.</div>';
        return;
    }

    itemKeys.forEach(id => {
        const item = RUN_ITEMS[id];
        const canAfford = GAME.gold >= item.cost;
        const maxCanBuy = Math.floor(GAME.gold / item.cost);
        const div = document.createElement('div');
        div.className = 'shop-card';
        div.style.borderColor = item.color;
        
        let badgeText = item.category.replace('_', ' ');
        div.innerHTML = `
            <div>
                <div class="shop-card-header">
                    <div class="shop-card-icon" style="background:${item.color}22; border:1px solid ${item.color}66;">${item.icon}</div>
                    <div class="shop-card-title-group">
                        <h3 style="color:${item.color}">${item.name}</h3>
                        <span class="shop-card-cat-badge" style="background:${item.color}33; color:${item.color};">${badgeText}</span>
                    </div>
                </div>
                <p>${item.desc}</p>
            </div>
            <div class="shop-card-footer">
                <div class="shop-card-buy-row">
                    <button class="btn-gold" ${canAfford ? '' : 'disabled'} onclick="buyRunItem('${id}')">Buy: ${item.cost} 🪙</button>
                    ${maxCanBuy > 1 && (item.category === 'stat_boost' || id === 'healthPot') ? `<button class="btn-buy-max" onclick="buyRunItemMax('${id}')">Max (x${maxCanBuy})</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderSanctuary() {
    updateShopSummaryBar();
    const container = document.getElementById('sanctuary-options');
    if (!container) return;
    container.innerHTML = '';

    const upgradeKeys = Object.keys(UPGRADES).filter(id => {
        const def = UPGRADES[id];
        const matchCategory = currentCategoryFilter === 'all' || def.category === currentCategoryFilter;
        const matchSearch = !currentSearchQuery || def.name.toLowerCase().includes(currentSearchQuery) || def.desc(1).toLowerCase().includes(currentSearchQuery);
        return matchCategory && matchSearch;
    });

    if (upgradeKeys.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; grid-column:1/-1; text-align:center; padding:30px;">No upgrades match your filter/search.</div>';
        return;
    }

    upgradeKeys.forEach(id => {
        const def = UPGRADES[id];
        const lvl = SAVE.upgrades[id] || 0;
        const cost = getUpgradeCost(id);
        const maxed = cost === null;
        const canAfford = !maxed && SAVE.essence >= cost;
        const pct = (lvl / def.max) * 100;
        
        const div = document.createElement('div');
        div.className = 'shop-card' + (maxed ? ' maxed' : '');
        div.style.borderColor = maxed ? '#eab308' : def.color;
        const nextDesc = def.desc(maxed ? lvl : lvl + 1);

        div.innerHTML = `
            <div>
                <div class="shop-card-header">
                    <div class="shop-card-icon" style="background:${def.color}22; border:1px solid ${def.color}66;">${def.icon}</div>
                    <div class="shop-card-title-group">
                        <h3 style="color:${def.color}">${def.name}</h3>
                        <span class="shop-card-cat-badge" style="background:${def.color}33; color:${def.color};">${def.category}</span>
                    </div>
                </div>
                <div class="lvl-bar-container">
                    <div class="lvl-bar-fill" style="width:${pct}%; background:${maxed ? '#eab308' : def.color};"></div>
                </div>
                <div class="lvl-text">
                    <span>Rank: ${lvl}/${def.max}</span>
                    <span>${maxed ? 'MAX RANK' : `Next: Level ${lvl + 1}`}</span>
                </div>
                <p>${nextDesc}</p>
            </div>
            <div class="shop-card-footer">
                <div class="shop-card-buy-row">
                    <button class="${maxed ? 'btn-gold' : ''}" ${maxed || !canAfford ? 'disabled' : ''} onclick="buySanctuaryUpgrade('${id}')">
                        ${maxed ? '⭐ FULLY MASTERED' : `Upgrade: ${cost} ✨`}
                    </button>
                    ${!maxed ? `<button class="btn-buy-max" onclick="buySanctuaryUpgradeMax('${id}')" title="Buy as many levels as you can afford">Max</button>` : ''}
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

window.buyRunItem = function(id) {
    const item = RUN_ITEMS[id];
    if (!item || GAME.gold < item.cost) return;
    GAME.gold -= item.cost;
    SFX.coin();

    applyRunItemEffect(id);

    updateEffects();
    updateGUI();
    renderMerchant();
};

window.buyRunItemMax = function(id) {
    const item = RUN_ITEMS[id];
    if (!item || GAME.gold < item.cost) return;
    let count = 0;
    while (GAME.gold >= item.cost) {
        GAME.gold -= item.cost;
        applyRunItemEffect(id, false);
        count++;
    }
    if (count > 0) {
        SFX.coin();
        logMessage(`Purchased x${count} ${item.name}!`, item.color);
        updateEffects();
        updateGUI();
        renderMerchant();
    }
};

function applyRunItemEffect(id, notify = true) {
    const item = RUN_ITEMS[id];
    if (id === 'healthPot') {
        PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 60);
        spawnFloatingText(playerMesh.position, '+60 HP', '#22c55e', 14, false, '💚');
        if (notify) logMessage('+60 HP Restored!', '#ef4444');
    } else if (id === 'maxHpElixir') {
        PLAYER.maxHp += 30;
        PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 60);
        spawnFloatingText(playerMesh.position, '+30 MAX HP', '#ec4899', 16, true);
        if (notify) logMessage('+30 MAX HP & Full Heal!', '#ec4899');
    } else if (id === 'aegisShield') {
        GAME.shield += 120;
        spawnFloatingText(playerMesh.position, '+120 Barrier', '#06b6d4', 16, true, '🛡️');
        if (notify) logMessage('+120 Barrier Shield!', '#06b6d4');
    } else if (id === 'purifyingWard') {
        PLAYER.invulnerableTimer = Math.max(PLAYER.invulnerableTimer, 4.0);
        spawnFloatingText(playerMesh.position, 'INVULNERABLE (4s)', '#38bdf8', 16, true, '💠');
        if (notify) logMessage('Purifying Ward: Invulnerable for 4s!', '#38bdf8');
    } else if (id === 'manaFlask') {
        PLAYER.mana = PLAYER.maxMana;
        spawnFloatingText(playerMesh.position, 'MANA RESTORED', '#3b82f6', 14, false, '💧');
        if (notify) logMessage('Full Mana Restored!', '#3b82f6');
    } else if (id === 'dmgInfusion') {
        INRUN.damageMult += 0.15;
        if (notify) logMessage('+15% Weapon Damage!', '#f97316');
    } else if (id === 'atkSpeedPot') {
        INRUN.fireRateMult += 0.20;
        if (notify) logMessage('+20% Attack Speed!', '#eab308');
    } else if (id === 'bootsSpeed') {
        INRUN.speedMult += 0.15;
        if (notify) logMessage('+15% Movement Speed!', '#10b981');
    } else if (id === 'scopeGlass') {
        PERM.critChance += 0.10;
        if (notify) logMessage('+10% Critical Strike Chance!', '#fb7185');
    } else if (id === 'ultOvercharge') {
        PLAYER.ultCooldown = 0;
        spawnFloatingText(playerMesh.position, 'ULTIMATE READY!', '#fbbf24', 18, true, '⚡');
        if (notify) logMessage('Ultimate Ability Recharged!', '#8b5cf6');
    } else if (id === 'tacticalNuke') {
        triggerBomb();
        if (notify) logMessage('TACTICAL NUKE DEPLOYED!', '#f43f5e');
    } else if (id === 'frostGrenade') {
        enemies.forEach(e => {
            e.freezeTimer = 6.0;
            spawnFloatingText(e.mesh.position, 'FROZEN (6s)', '#67e8f9', 14);
        });
        if (notify) logMessage('Blizzard Grenade: All enemies frozen for 6s!', '#67e8f9');
    } else if (id === 'magnetSurge') {
        triggerMagnet();
        if (notify) logMessage('Magnet Surge: All map loot gathered!', '#a855f7');
    } else if (id === 'midasTouch') {
        PERM.goldMult += 0.50;
        if (notify) logMessage('Midas Bounty: +50% Gold Multiplier!', '#eab308');
    } else if (id === 'phoenixFeather') {
        GAME.reviveTokens++;
        spawnFloatingText(playerMesh.position, '+1 REVIVE TOKEN', '#fde047', 16, true, '🕊️');
        if (notify) logMessage('Phoenix Feather Acquired! (+1 Revive Token)', '#fde047');
    } else if (id === 'chainLightningScroll') {
        const targets = [...enemies].sort(() => 0.5 - Math.random()).slice(0, 12);
        targets.forEach(e => {
            if (e && e.hp > 0) {
                e.takeDamage(180, true);
                createFloatingText(e.mesh.position, '180 ⚡', '#60a5fa');
                spawnVfx(e.mesh.position, 0x60a5fa, 1.5, 0.4);
            }
        });
        if (notify) logMessage('Scroll of Storms unleashed!', '#60a5fa');
    } else if (id === 'hyperDrive') {
        BUFFS.swiftness = Math.max(BUFFS.swiftness || 0, 25.0);
        spawnFloatingText(playerMesh.position, 'HYPERDRIVE (25s)', '#38bdf8', 16, true, '🚀');
        if (notify) logMessage('Hyperdrive Engaged: +50% Speed for 25s!', '#38bdf8');
    } else if (id === 'vampiricDagger') {
        EFFECTS.lifesteal += 2.0;
        spawnFloatingText(playerMesh.position, '+2.0 LIFESTEAL', '#f43f5e', 15, true, '🗡️');
        if (notify) logMessage('Blood Dagger: +2.0 Lifesteal on hit!', '#f43f5e');
    } else if (id === 'titanRing') {
        PLAYER.maxHp += 50;
        PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 50);
        PLAYER.damage += 12;
        spawnFloatingText(playerMesh.position, '+50 HP & +12 DMG', '#f59e0b', 16, true, '💍');
        if (notify) logMessage('Ring of the Colossus: +50 HP & +12 Base Damage!', '#f59e0b');
    } else if (id === 'orbOfWinter') {
        INRUN.orbOfWinter = true;
        spawnFloatingText(playerMesh.position, 'ORB OF WINTER ACTIVATED', '#67e8f9', 16, true, '🔮');
        if (notify) logMessage('Orb of Winter: Chilling field active!', '#67e8f9');
    } else if (id === 'essenceExtractor') {
        SAVE.essence += 60;
        writeSave();
        spawnFloatingText(playerMesh.position, '+60 ESSENCE ✨', '#c084fc', 18, true, '✨');
        if (notify) logMessage('Essence Alembic: +60 Permanent Essence extracted!', '#c084fc');
        updateShopSummaryBar();
    }
}

window.buySanctuaryUpgrade = function(id) {
    const cost = getUpgradeCost(id);
    if (cost === null || SAVE.essence < cost) return;
    SAVE.essence -= cost;
    SAVE.upgrades[id] = (SAVE.upgrades[id] || 0) + 1;
    writeSave();
    SFX.item();
    applyPermanentUpgrades();
    updateEffects();
    updateGUI();
    renderSanctuary();
};

window.buySanctuaryUpgradeMax = function(id) {
    let upgraded = 0;
    while (true) {
        const cost = getUpgradeCost(id);
        if (cost === null || SAVE.essence < cost) break;
        SAVE.essence -= cost;
        SAVE.upgrades[id] = (SAVE.upgrades[id] || 0) + 1;
        upgraded++;
    }
    if (upgraded > 0) {
        writeSave();
        SFX.item();
        applyPermanentUpgrades();
        updateEffects();
        updateGUI();
        renderSanctuary();
        logMessage(`Upgraded ${UPGRADES[id].name} +${upgraded} Ranks!`, UPGRADES[id].color);
    }
};

function applyPermanentUpgrades() {
    const u = SAVE.upgrades;
    PERM.hpBonus = (u.vitality || 0) * 15;
    PERM.damageMult = 1 + (u.power || 0) * 0.07 + (u.overwhelm || 0) * 0.05;
    PERM.speedMult = 1 + (u.swiftness || 0) * 0.035;
    PERM.fireRateMult = 1 + (u.swiftStrikes || 0) * 0.04;
    PERM.dropBonus = (u.fortune || 0) * 0.04;
    PERM.goldMult = 1 + (u.greed || 0) * 0.12;
    PERM.manaBonus = (u.arcaneReserve || 0) * 20;
    PERM.lifesteal = (u.vampirism || 0) * 1.5;
    PERM.critChance = (u.criticalStrike || 0) * 0.04;
    PERM.critMult = 2.0 + (u.criticalStrike || 0) * 0.15;
    PERM.regenPerSec = (u.secondWind || 0) * 0.006;
    PERM.pickupRadius = 4.0 * (1 + (u.magnetism || 0) * 0.45);
    PERM.reviveAvailable = (u.guardianAngel || 0) > 0;
    PERM.reviveMaxCount = u.guardianAngel || 0;
    PERM.reviveUsed = false;
    PERM.damageReduction = (u.ironSkin || 0) * 2;
    PERM.manaRegenPerSec = (u.manaRegen || 0) * 4;
    PERM.spellDamageMult = 1 + (u.spellMastery || 0) * 0.08;
    PERM.startingShield = (u.bulwark || 0) * 30;
    PERM.chestLootBonus = (u.relicAppraiser || 0) * 0.25;
}

function rollDamage() {
    let dmg = PLAYER.damage;
    if (BUFFS.wrath > 0) dmg *= 2.2;
    let isCrit = false;
    let critChance = PERM.critChance;
    let critMult = PERM.critMult;

    if (PLAYER.class === 'Archer') {
        const a11 = (PLAYER.skills.find(s => s.id === 'a11') || {level: 0}).level;
        critChance += a11 * 0.08;
        critMult += a11 * 0.35;
    }

    if (Math.random() < critChance || BUFFS.wrath > 0) {
        dmg *= critMult;
        isCrit = true;
    }
    return { dmg: Math.round(dmg), isCrit };
}

function checkPlayerDeath() {
    if (PLAYER.hp <= 0) {
        if (GAME.reviveTokens > 0) {
            GAME.reviveTokens--;
            PLAYER.hp = Math.floor(PLAYER.maxHp * 0.6);
            SFX.item();
            logMessage('PHOENIX FEATHER REVIVE!', '#fde047');
            updateGUI();
            return;
        }
        if (PERM.reviveAvailable && !PERM.reviveUsed) {
            PERM.reviveUsed = true;
            PLAYER.hp = Math.floor(PLAYER.maxHp * 0.5);
            SFX.item();
            logMessage('GUARDIAN ANGEL REVIVE!', '#fceabb');
            updateGUI();
            return;
        }

        if (IS_MULTIPLAYER) {
            GAME.isDowned = true;
            document.getElementById('downed-banner').style.display = 'block';
            logMessage('YOU ARE DOWNED! Awaiting revive...', '#ef4444');
        } else {
            gameOver();
        }
    }
}

// --- CLASSES & SKILLS ---
const CLASSES = {
    Mage: {
        baseHp: 80, baseMana: 100, baseSpeed: 16, baseDamage: 30, color: 0x38bdf8,
        skills: [
            { id: 'm1', name: 'Explosive Magic', desc: 'Projectiles blast +80% larger area & +5 dmg per rank', max: 5 },
            { id: 'm2', name: 'Split Spell', desc: 'Fires +1 additional arcane bolt in a spread per rank', max: 5 },
            { id: 'm3', name: 'Arcane Aura', desc: 'Passively pulses magical AoE damage around you', max: 5 },
            { id: 'm4', name: 'Homing Orbs', desc: 'Arcane missiles aggressively steer toward enemies', max: 5 },
            { id: 'm5', name: 'Haste & Flow', desc: '+15% Move Speed & +20% Cast Rate per rank', max: 5 },
            { id: 'm6', name: 'Vampiric Drain', desc: 'Restores +5 HP upon killing an enemy with magic', max: 5 },
            { id: 'm7', name: 'Chain Lightning', desc: 'Hits arc lightning bolts to up to 3 nearby foes for 60% dmg', max: 5 },
            { id: 'm8', name: 'Meteor Shower', desc: 'Periodically calls down falling fiery meteors dealing 90 AoE dmg', max: 5 },
            { id: 'm9', name: 'Arcane Orbiters', desc: 'Summons 2 swirling mana crystals that shred colliding enemies', max: 5 },
            { id: 'm10', name: 'Glacier Spear', desc: 'Piercing frost lance that chills and freezes enemies for 2.5s', max: 5 },
            { id: 'm11', name: 'Mana Siphon', desc: 'Hits restore +5 Mana & increases passive mana regen by +12/s', max: 5 },
            { id: 'm12', name: 'Prismatic Nova', desc: 'Emits a 360-degree expanding magical shockwave every 5s', max: 5 }
        ]
    },
    Archer: {
        baseHp: 100, baseMana: 0, baseSpeed: 20, baseDamage: 20, color: 0x34d399,
        skills: [
            { id: 'a1', name: 'Multishot', desc: 'Fires a wide fan of +2 additional arrows per rank', max: 5 },
            { id: 'a2', name: 'Piercing Arrow', desc: 'Arrows pierce through +2 additional enemies', max: 5 },
            { id: 'a3', name: 'Rapid Fire', desc: 'Massively increases arrow fire rate (+35% per rank)', max: 5 },
            { id: 'a4', name: 'Heavy Draw', desc: 'Increases arrow damage (+8) and projectile size (+30%)', max: 5 },
            { id: 'a5', name: 'Wind Walk', desc: '+25% movement speed and agility boost per rank', max: 5 },
            { id: 'a6', name: 'Survivalist', desc: '+20 Max HP and restores +3 HP on enemy kill', max: 5 },
            { id: 'a7', name: 'Explosive Cluster', desc: 'Arrows detonate upon impact into shrapnel dealing AoE damage', max: 5 },
            { id: 'a8', name: 'Ricochet Shot', desc: 'Arrows bounce to up to 2 secondary nearby targets on hit', max: 5 },
            { id: 'a9', name: 'Poison Caltrops', desc: 'Drops toxic caltrop traps behind you that poison & slow enemies', max: 5 },
            { id: 'a10', name: 'Phantom Daggers', desc: 'Throws spinning phantom daggers in a 360-degree ring in combat', max: 5 },
            { id: 'a11', name: 'Deadly Precision', desc: '+10% Crit Chance & +0.4x Crit Damage multiplier per rank', max: 5 },
            { id: 'a12', name: 'Sniper Ballista', desc: 'Periodically fires a hyper-velocity piercing ballista bolt for 200 dmg', max: 5 }
        ]
    },
    Warrior: {
        baseHp: 150, baseMana: 0, baseSpeed: 18, baseDamage: 40, color: 0xf87171,
        skills: [
            { id: 'w1', name: 'Wide Cleave', desc: 'Massively widens Greatsword slash hitbox and sweep angle', max: 5 },
            { id: 'w2', name: 'Whirlwind', desc: 'Continuous slicing blade hurricane around you (+15 dmg/s)', max: 5 },
            { id: 'w3', name: 'Bloodthirst', desc: 'Heals +10 HP upon slaying any enemy in melee combat', max: 5 },
            { id: 'w4', name: 'Juggernaut', desc: '+40 Max HP and reduces all incoming damage by 3 per rank', max: 5 },
            { id: 'w5', name: 'Sword Beam', desc: 'Greatsword slashes release piercing energy crescent shockwaves', max: 5 },
            { id: 'w6', name: 'Frenzy', desc: '+30% melee attack speed and momentum per rank', max: 5 },
            { id: 'w7', name: 'Orbiting Battleaxes', desc: '2 spinning steel throwing axes circle you carving through mobs', max: 5 },
            { id: 'w8', name: 'Earth Fissure', desc: 'Melee hits rip open ground fissures that knock back and crush mobs', max: 5 },
            { id: 'w9', name: 'Spiked Barrier', desc: 'Reflects 60% damage to attackers and grants a recharging 80 HP shield', max: 5 },
            { id: 'w10', name: 'Flame Cleave', desc: 'Slashes ignite enemies dealing burning fire damage over 3s', max: 5 },
            { id: 'w11', name: 'Berserker Wrath', desc: 'Increases damage by up to +100% as player HP gets lower', max: 5 },
            { id: 'w12', name: 'Thunder Clap', desc: 'Every 4s, slams the ground creating a dazing concussive shockwave', max: 5 }
        ]
    }
};

const projectiles = [];
const enemies = [];
const items = [];

// --- THREE.JS SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.FogExp2(0x0f172a, 0.007); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const gridHelper = new THREE.GridHelper(1000, 100, 0x1e293b, 0x1e293b);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// --- PLAYER MESH ---
const playerMesh = new THREE.Group();
playerMesh.position.set(0, 1.5, 0);
scene.add(playerMesh);

let bodyMesh; 
const weaponGroup = new THREE.Group();
playerMesh.add(weaponGroup);

function createPlayerMesh(className) {
    const grp = new THREE.Group();
    let bGeo, bMat;
    if (className === 'Mage') {
        bGeo = new THREE.ConeGeometry(0.8, 2, 8);
        bMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    } else if (className === 'Archer') {
        bGeo = new THREE.CylinderGeometry(0.6, 0.6, 2, 8);
        bMat = new THREE.MeshStandardMaterial({ color: 0x34d399 });
    } else { 
        bGeo = new THREE.BoxGeometry(1.2, 2, 1.2);
        bMat = new THREE.MeshStandardMaterial({ color: 0xf87171 });
    }
    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.y = 1;
    grp.add(bMesh);

    const wGrp = new THREE.Group();
    grp.add(wGrp);
    wGrp.position.set(0.6, 1, 0.8);

    if (className === 'Mage') {
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        staff.rotation.x = Math.PI / 2;
        const crystal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 }));
        crystal.position.z = 1.2;
        wGrp.add(staff, crystal);
    } else if (className === 'Archer') {
        const bowGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 16, Math.PI);
        const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        bow.rotation.y = Math.PI / 2;
        wGrp.add(bow);
    } else {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 3.0), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
        sword.position.z = 1.0;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0xfbbf24 }));
        guard.position.z = -0.5;
        wGrp.add(sword, guard);
    }
    return grp;
}

function buildPlayerVisuals() {
    while(playerMesh.children.length > 0) playerMesh.remove(playerMesh.children[0]);
    while(weaponGroup.children.length > 0) weaponGroup.remove(weaponGroup.children[0]);
    
    const pMesh = createPlayerMesh(PLAYER.class);
    bodyMesh = pMesh.children[0];
    const newWeaponGrp = pMesh.children[1];
    
    playerMesh.add(bodyMesh);
    while(newWeaponGrp.children.length > 0) {
        weaponGroup.add(newWeaponGrp.children[0]);
    }
    weaponGroup.position.copy(newWeaponGrp.position);
    playerMesh.add(weaponGroup);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

// --- CONTROLS ---
const keys = { w: false, a: false, s: false, d: false, shift: false, click: false };
const joystickMove = { active: false, x: 0, y: 0 };
const joystickShoot = { active: false, x: 0, y: 0 };

function setupJoystick(zoneId, knobId, data, isShoot) {
    const zone = document.getElementById(zoneId);
    const knob = document.getElementById(knobId);
    if (!zone || !knob) return;
    
    const radius = zone.offsetWidth / 2; 
    const maxDist = radius - (knob.offsetWidth / 2); 

    function handleTouch(e) {
        e.preventDefault();
        initAudio();
        if (e.touches.length === 0) return;
        let touch = null;
        for (let i=0; i<e.touches.length; i++) {
            if (e.touches[i].target === zone || e.touches[i].target === knob) {
                touch = e.touches[i]; break;
            }
        }
        if (!touch) return;
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + radius;
        const centerY = rect.top + radius;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        data.x = dx / maxDist;
        data.y = dy / maxDist;
        data.active = true;
        
        if (isShoot) keys.click = true;
    }

    function resetTouch() {
        knob.style.transform = `translate(0px, 0px)`;
        data.active = false;
        data.x = 0;
        data.y = 0;
        if (isShoot) keys.click = false;
    }

    zone.addEventListener('touchstart', handleTouch, {passive: false});
    zone.addEventListener('touchmove', handleTouch, {passive: false});
    zone.addEventListener('touchend', resetTouch);
    zone.addEventListener('touchcancel', resetTouch);
}

window.addEventListener('load', () => {
    setupJoystick('joystick-left', 'knob-left', joystickMove, false);
    setupJoystick('joystick-right', 'knob-right', joystickShoot, true);
    initDailyQuests();
    updateQuestBadges();
    setInterval(updateQuestResetTimer, 1000);
    document.getElementById('start-essence').innerText = SAVE.essence;
    initMinimap();
});

window.togglePause = function() {
    if (GAME.state === 'PLAYING') {
        GAME.state = 'PAUSED';
        document.getElementById('pause-screen').style.display = 'flex';
    } else if (GAME.state === 'PAUSED') {
        resumeGame();
    }
};

window.addEventListener('keydown', (e) => {
    initAudio();
    if (e.code === 'KeyI') {
        toggleGearModal();
        return;
    }
    if (e.code === 'KeyE') {
        if (activeLootDrop) {
            handleQuickEquipLoot();
            return;
        }
    }
    if (e.code === 'KeyB') {
        toggleShopModal();
        return;
    }
    if (e.code === 'KeyL' || e.code === 'KeyJ') {
        toggleQuestsModal();
        return;
    }
    if (e.code === 'Space' || e.code === 'KeyQ') {
        useUltimate();
        return;
    }
    if (e.code === 'Escape') {
        if (document.getElementById('gear-screen').style.display === 'flex') {
            closeGearModal();
        } else if (document.getElementById('quests-screen').style.display === 'flex') {
            closeQuestsModal();
        } else if (document.getElementById('shop-screen').style.display === 'flex') {
            closeShopModal();
        } else {
            togglePause();
        }
        return;
    }
    if (GAME.state !== 'PLAYING') return;
    switch(e.code) {
        case 'KeyW': keys.w = true; break;
        case 'KeyA': keys.a = true; break;
        case 'KeyS': keys.s = true; break;
        case 'KeyD': keys.d = true; break;
        case 'ShiftLeft': keys.shift = true; break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': keys.w = false; break;
        case 'KeyA': keys.a = false; break;
        case 'KeyS': keys.s = false; break;
        case 'KeyD': keys.d = false; break;
        case 'ShiftLeft': keys.shift = false; break;
    }
});

window.addEventListener('mousedown', (e) => { 
    initAudio();
    if (e.button === 0) keys.click = true; 
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) keys.click = false; });
window.addEventListener('mouseleave', () => { keys.click = false; });

// --- NETWORK MANAGER (CO-OP MULTIPLAYER) ---
let IS_MULTIPLAYER = false;
let WS = null;
let MY_ID = null;
const OTHER_PLAYERS = {}; 

function initMultiplayer(roomCode, className) {
    IS_MULTIPLAYER = true;
    const protocol = location.protocol === 'https:' ? 'wss://' : 'ws://';
    WS = new WebSocket(`${protocol}${location.host}?room=${roomCode}`);

    WS.onopen = () => {
        WS.send(JSON.stringify({ 
            type: 'JOIN', class: className, 
            hp: PLAYER.hp, maxHp: PLAYER.maxHp, level: PLAYER.level 
        }));
    };

    WS.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'INIT') {
            MY_ID = data.id;
            // Spawn player at server-designated location near peers
            if (typeof data.spawnX === 'number' && typeof data.spawnZ === 'number') {
                playerMesh.position.set(data.spawnX, 1.5, data.spawnZ);
                camera.position.set(data.spawnX, 60, data.spawnZ + 35);
            }
            if (data.wave) {
                GAME.wave = data.wave;
                GAME.waveState = data.waveState;
                GAME.waveTimer = data.waveTimer;
                GAME.isBossWave = data.isBossWave;
                GAME.totalWaveEnemies = data.totalEnemies || 20;
                GAME.enemiesKilled = data.enemiesKilled || 0;
            }
            document.getElementById('hud-teammates').style.display = 'block';
        } else if (data.type === 'TICK') {
            processServerTick(data);
        } else if (data.type === 'WAVE_START') {
            GAME.wave = data.wave;
            GAME.isBossWave = data.isBossWave;
            GAME.totalWaveEnemies = data.totalEnemies;
            GAME.enemiesKilled = 0;
            GAME.waveState = 'WAVE_ACTIVE';
            if (data.isBossWave) SFX.bossRoar();
            else SFX.waveStart();
            logMessage(`WAVE ${data.wave} STARTED!`, data.isBossWave ? '#ef4444' : '#38bdf8');
            updateWaveHUD();
        } else if (data.type === 'WAVE_CLEARED') {
            GAME.waveState = 'WAVE_CLEAR';
            GAME.isDowned = false;
            document.getElementById('downed-banner').style.display = 'none';
            PLAYER.hp = Math.max(PLAYER.hp, Math.floor(PLAYER.maxHp * 0.5));
            GAME.gold += data.bonusGold;
            PLAYER.exp += data.bonusExp;
            SAVE.essence += Math.floor(data.bonusGold * 0.5);
            writeSave();
            checkLevelUp();
            trackQuestProgress('waves', 1);
            trackQuestProgress('gold', data.bonusGold);
            if (PERM.startingShield > 0) {
                GAME.shield = Math.max(GAME.shield, PERM.startingShield);
            }
            SFX.waveClear();
            showWaveClearBanner(data.wave, data.bonusGold, data.bonusExp);
            updateWaveHUD();
            updateGUI();
        } else if (data.type === 'ITEM_COLLECTED') {
            applyItemEffect(data.itemType);
        } else if (data.type === 'PLAYER_REVIVED') {
            if (data.id === MY_ID) {
                GAME.isDowned = false;
                PLAYER.hp = data.hp;
                document.getElementById('downed-banner').style.display = 'none';
                logMessage('YOU WERE REVIVED BY A TEAMMATE!', '#34d399');
            }
        } else if (data.type === 'TEAMMATE_ULT') {
            const pos = new THREE.Vector3(data.x, 0.2, data.z);
            spawnFloatingText(pos, `⚡ TEAMMATE ULT!`, '#fde047', 18, true);
            if (data.class === 'Warrior') {
                SFX.earthquake();
                const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1, 2.5, 32), new THREE.MeshBasicMaterial({ color: 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
                ringMesh.rotation.x = -Math.PI / 2;
                ringMesh.position.copy(pos);
                new VFXObject(ringMesh, 0.5, (m, prog) => {
                    const scale = 1 + prog * 16;
                    m.scale.set(scale, scale, scale);
                    m.material.opacity = (1 - prog) * 0.9;
                });
            } else if (data.class === 'Mage') {
                SFX.frostNova();
                const novaMesh = new THREE.Mesh(new THREE.RingGeometry(1, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
                novaMesh.rotation.x = -Math.PI / 2;
                novaMesh.position.copy(pos);
                new VFXObject(novaMesh, 0.6, (m, prog) => {
                    const scale = 1 + prog * 18;
                    m.scale.set(scale, scale, scale);
                    m.material.opacity = (1 - prog) * 0.95;
                });
            } else if (data.class === 'Archer') {
                SFX.arrowStorm();
            }
        }
    };
}

function showWaveClearBanner(waveNum, gold, exp) {
    const banner = document.getElementById('wave-clear-banner');
    const bonus = document.getElementById('wave-clear-bonus');
    if (banner && bonus) {
        bonus.innerText = `+${gold} Gold • +${exp} EXP • Teammates Revived!`;
        banner.style.display = 'block';
        setTimeout(() => { banner.style.display = 'none'; }, 3500);
    }
}

window.skipIntermission = function() {
    if (IS_MULTIPLAYER && WS && WS.readyState === WebSocket.OPEN) {
        WS.send(JSON.stringify({ type: 'SKIP_PREP' }));
    } else {
        GAME.waveTimer = 0;
    }
};

// --- 2D OVERLAY CANVAS (TEAMMATE ARROWS & FLOATING COMBAT TEXT) ---
const arrowsCanvas = document.getElementById('teammate-arrows-canvas');
const arrowsCtx = arrowsCanvas ? arrowsCanvas.getContext('2d') : null;

function spawnFloatingText(pos, text, color = '#ffffff', fontSize = 16, isCrit = false, icon = '') {
    if (!pos) return;
    floatingTexts.push({
        x: pos.x + (Math.random() - 0.5) * 0.8,
        y: pos.y + 1.2 + (Math.random() * 0.5),
        z: pos.z + (Math.random() - 0.5) * 0.8,
        vy: isCrit ? 4.8 : 3.2,
        vx: (Math.random() - 0.5) * 1.5,
        text: (icon ? icon + ' ' : '') + text,
        color: color,
        fontSize: isCrit ? Math.round(fontSize * 1.35) : fontSize,
        isCrit: isCrit,
        life: 0.95,
        scale: isCrit ? 1.4 : 1.1
    });
}

function drawFloatingTexts(dt) {
    if (!arrowsCtx || floatingTexts.length === 0) return;
    const W = arrowsCanvas.width;
    const H = arrowsCanvas.height;

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= dt;
        if (ft.life <= 0) {
            floatingTexts.splice(i, 1);
            continue;
        }

        ft.y += ft.vy * dt;
        ft.vy = Math.max(0.2, ft.vy - dt * 4.0);
        ft.x += ft.vx * dt;
        ft.scale = THREE.MathUtils.lerp(ft.scale, 1.0, dt * 8);

        const v3 = new THREE.Vector3(ft.x, ft.y, ft.z);
        const ndc = v3.project(camera);

        if (ndc.z > 1 || ndc.x < -1.1 || ndc.x > 1.1 || ndc.y < -1.1 || ndc.y > 1.1) continue;

        const screenX = (ndc.x * 0.5 + 0.5) * W;
        const screenY = (-(ndc.y * 0.5) + 0.5) * H;
        const alpha = Math.min(1.0, ft.life / 0.35);

        arrowsCtx.save();
        arrowsCtx.globalAlpha = alpha;
        arrowsCtx.translate(screenX, screenY);
        arrowsCtx.scale(ft.scale, ft.scale);

        arrowsCtx.font = `${ft.isCrit ? '900' : '700'} ${ft.fontSize}px system-ui, -apple-system, sans-serif`;
        arrowsCtx.textAlign = 'center';
        arrowsCtx.textBaseline = 'middle';

        arrowsCtx.lineWidth = ft.isCrit ? 4.5 : 3.0;
        arrowsCtx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        arrowsCtx.strokeText(ft.text, 0, 0);

        if (ft.isCrit) {
            arrowsCtx.shadowColor = 'rgba(251, 191, 36, 0.9)';
            arrowsCtx.shadowBlur = 8;
        }

        arrowsCtx.fillStyle = ft.color;
        arrowsCtx.fillText(ft.text, 0, 0);

        arrowsCtx.restore();
    }
}

function drawOverlay(dt) {
    if (!arrowsCanvas || !arrowsCtx) return;
    
    // Synchronize canvas dimensions with viewport
    if (arrowsCanvas.width !== window.innerWidth || arrowsCanvas.height !== window.innerHeight) {
        arrowsCanvas.width = window.innerWidth;
        arrowsCanvas.height = window.innerHeight;
    }
    
    arrowsCtx.clearRect(0, 0, arrowsCanvas.width, arrowsCanvas.height);
    
    if (GAME.state !== 'PLAYING') return;

    drawTeammateArrows();
    drawFloatingTexts(dt);
}

function drawTeammateArrows() {
    if (!IS_MULTIPLAYER || !playerMesh) return;

    const W = arrowsCanvas.width;
    const H = arrowsCanvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const edgeMargin = 45; // Pixel margin from screen boundary

    // Compute active Camera View Frustum
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    for (const id in OTHER_PLAYERS) {
        const p = OTHER_PLAYERS[id];
        if (!p || !p.mesh) continue;

        const teammatePos = p.mesh.position.clone();
        teammatePos.y += 1.0;

        const dist = Math.round(playerMesh.position.distanceTo(p.mesh.position));

        // Proximity Revive Handler
        if (p.isDowned && dist < 8 && !GAME.isDowned) {
            p.reviveTimer = (p.reviveTimer || 0) + 0.03;
            if (p.reviveTimer >= 2.5) {
                p.reviveTimer = 0;
                if (WS && WS.readyState === WebSocket.OPEN) {
                    WS.send(JSON.stringify({ type: 'REVIVE_TEAMMATE', targetId: id }));
                }
            }
        } else {
            p.reviveTimer = 0;
        }

        // Check if teammate 3D position is inside the camera view frustum
        const inFrustum = frustum.containsPoint(teammatePos);

        // Project 3D coordinate to 2D Normalized Device Coordinates (NDC: [-1, 1])
        const ndc = teammatePos.clone().project(camera);

        // If inside the camera frustum and comfortably within screen bounds, do not draw edge arrow
        if (inFrustum && ndc.x >= -0.88 && ndc.x <= 0.88 && ndc.y >= -0.88 && ndc.y <= 0.88 && ndc.z < 1) {
            continue;
        }

        // Reverse coordinates if teammate is located behind the camera plane
        let nx = ndc.x;
        let ny = ndc.y;
        if (ndc.z > 1 || ndc.z < -1) {
            nx = -nx;
            ny = -ny;
        }

        // 2D Vector from screen center
        let dx = nx;
        let dy = -ny; // Invert Y as Canvas Y increases downwards

        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        // Angle pointing towards off-screen teammate
        const angle = Math.atan2(dy, dx);

        // Ray-box clamping to screen border
        const minX = edgeMargin;
        const maxX = W - edgeMargin;
        const minY = edgeMargin;
        const maxY = H - edgeMargin;

        const tX = dx > 0 ? (maxX - cx) / dx : (minX - cx) / dx;
        const tY = dy > 0 ? (maxY - cy) / dy : (minY - cy) / dy;
        const t = Math.min(Math.abs(tX), Math.abs(tY));

        const screenX = cx + dx * t;
        const screenY = cy + dy * t;

        // Class-specific styling
        let color = '#38bdf8'; // Mage
        let icon = '🔮';
        if (p.class === 'Warrior') { color = '#ef4444'; icon = '⚔️'; }
        else if (p.class === 'Archer') { color = '#10b981'; icon = '🏹'; }

        if (p.isDowned) {
            color = '#f43f5e';
            icon = '💀';
        }

        arrowsCtx.save();
        arrowsCtx.translate(screenX, screenY);

        // Pulsing scale if teammate is downed
        const pulse = p.isDowned ? 1.0 + Math.sin(Date.now() * 0.009) * 0.22 : 1.0;
        arrowsCtx.scale(pulse, pulse);

        // 1. Draw Directional Pointer Arrow
        arrowsCtx.save();
        arrowsCtx.rotate(angle);

        arrowsCtx.beginPath();
        arrowsCtx.moveTo(18, 0);       // Forward tip
        arrowsCtx.lineTo(-12, -11);    // Top wing
        arrowsCtx.lineTo(-5, 0);       // Inner notch
        arrowsCtx.lineTo(-12, 11);     // Bottom wing
        arrowsCtx.closePath();

        arrowsCtx.fillStyle = color;
        arrowsCtx.shadowColor = p.isDowned ? 'rgba(244, 63, 94, 0.95)' : 'rgba(0, 0, 0, 0.75)';
        arrowsCtx.shadowBlur = p.isDowned ? 12 : 6;
        arrowsCtx.fill();

        arrowsCtx.lineWidth = 2;
        arrowsCtx.strokeStyle = '#ffffff';
        arrowsCtx.stroke();
        arrowsCtx.restore();

        // 2. Draw Distance & Class Badge
        arrowsCtx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        arrowsCtx.textAlign = 'center';
        arrowsCtx.textBaseline = 'middle';

        const labelText = p.isDowned ? `REVIVE ${dist}m` : `${icon} ${dist}m`;
        const textMetrics = arrowsCtx.measureText(labelText);
        const textWidth = textMetrics.width;
        const badgeWidth = textWidth + 14;
        const badgeHeight = 18;

        const badgeDistance = 28;
        const badgeX = -Math.cos(angle) * badgeDistance;
        const badgeY = -Math.sin(angle) * badgeDistance;

        arrowsCtx.beginPath();
        arrowsCtx.roundRect(badgeX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 5);
        arrowsCtx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        arrowsCtx.fill();
        arrowsCtx.lineWidth = 1.5;
        arrowsCtx.strokeStyle = color;
        arrowsCtx.stroke();

        arrowsCtx.fillStyle = p.isDowned ? '#fca5a5' : '#ffffff';
        arrowsCtx.fillText(labelText, badgeX, badgeY);

        arrowsCtx.restore();
    }
}

// --- ANIMATED VFX OBJECTS ---
class VFXObject {
    constructor(mesh, duration, updateFn) {
        this.mesh = mesh;
        this.duration = duration;
        this.life = duration;
        this.updateFn = updateFn;
        scene.add(this.mesh);
        vfxObjects.push(this);
    }
    update(dt) {
        this.life -= dt;
        const progress = 1 - (this.life / this.duration);
        if (this.updateFn) this.updateFn(this.mesh, progress, dt);
        if (this.life <= 0) {
            scene.remove(this.mesh);
            return false;
        }
        return true;
    }
}

// --- ENVIRONMENTAL MAP SHRINES ---
class Shrine {
    constructor(x, z, type) {
        this.x = x;
        this.z = z;
        this.type = type || (['swiftness', 'wrath', 'vitality'][Math.floor(Math.random() * 3)]);
        this.active = true;
        this.radius = 3.5;
        this.rotationSpeed = 1.5;

        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
        const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.8, 8);
        const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
        baseMesh.position.y = 0.4;
        this.group.add(baseMesh);

        const pillarGeo = new THREE.BoxGeometry(1.2, 3.2, 1.2);
        const pillarMesh = new THREE.Mesh(pillarGeo, stoneMat);
        pillarMesh.position.y = 2.0;
        this.group.add(pillarMesh);

        let gemColor = 0x10b981; // Swiftness (Emerald)
        let emissiveColor = 0x059669;
        if (this.type === 'wrath') {
            gemColor = 0xef4444; // Wrath (Ruby)
            emissiveColor = 0xdc2626;
        } else if (this.type === 'vitality') {
            gemColor = 0xfbbf24; // Vitality (Gold)
            emissiveColor = 0xd97706;
        }
        this.colorHex = '#' + gemColor.toString(16).padStart(6, '0');

        const gemGeo = new THREE.DodecahedronGeometry(0.7);
        const gemMat = new THREE.MeshStandardMaterial({
            color: gemColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.6,
            roughness: 0.2
        });
        this.gemMesh = new THREE.Mesh(gemGeo, gemMat);
        this.gemMesh.position.y = 4.3;
        this.group.add(this.gemMesh);

        const ringGeo = new THREE.RingGeometry(2.6, 3.2, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: gemColor, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = 0.05;
        this.group.add(ringMesh);
        this.ringMesh = ringMesh;

        scene.add(this.group);
        shrines.push(this);
    }

    update(dt, playerPos) {
        if (!this.active) return;
        this.gemMesh.rotation.y += dt * this.rotationSpeed;
        this.gemMesh.rotation.x += dt * 0.8;
        this.gemMesh.position.y = 4.3 + Math.sin(GAME.time * 3 + this.x) * 0.25;
        this.ringMesh.rotation.z += dt * 0.5;

        const dist = Math.hypot(playerPos.x - this.x, playerPos.z - this.z);
        if (dist < this.radius && !GAME.isDowned) {
            this.activate();
        }
    }

    activate() {
        this.active = false;
        SFX.shrine();

        const burstMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 3.5, 8, 16, 1, true),
            new THREE.MeshBasicMaterial({ color: this.gemMesh.material.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        burstMesh.position.set(this.x, 4, this.z);
        new VFXObject(burstMesh, 0.7, (m, prog) => {
            m.scale.set(1 + prog * 0.5, 1 + prog * 0.8, 1 + prog * 0.5);
            m.material.opacity = (1 - prog) * 0.8;
        });

        if (this.type === 'swiftness') {
            BUFFS.swiftness = 20;
            logMessage('⚡ SHRINE OF SWIFTNESS ACTIVATED! (+60% Speed, +50% Atk Spd)', '#10b981');
            spawnFloatingText(playerMesh.position, '⚡ SWIFTNESS ACTIVATED!', '#10b981', 18, true, '⛩️');
        } else if (this.type === 'wrath') {
            BUFFS.wrath = 15;
            logMessage('🔥 SHRINE OF WRATH ACTIVATED! (100% CRIT & 2.2x DMG)', '#ef4444');
            spawnFloatingText(playerMesh.position, '🔥 WRATH ACTIVATED!', '#ef4444', 18, true, '⛩️');
        } else if (this.type === 'vitality') {
            PLAYER.hp = PLAYER.maxHp;
            PLAYER.mana = PLAYER.maxMana;
            GAME.shield += 100;
            logMessage('✨ SHRINE OF VITALITY ACTIVATED! (Full Heal + 100 Shield)', '#fbbf24');
            spawnFloatingText(playerMesh.position, '✨ FULL HEAL + 100 SHIELD!', '#fbbf24', 18, true, '⛩️');
        }

        trackQuestProgress('shrines', 1);

        updateEffects();
        updateGUI();
        updateBuffsHUD();

        let fadeTime = 1.5;
        const interval = setInterval(() => {
            fadeTime -= 0.1;
            this.group.position.y -= 0.3;
            if (fadeTime <= 0) {
                clearInterval(interval);
                scene.remove(this.group);
                const idx = shrines.indexOf(this);
                if (idx !== -1) shrines.splice(idx, 1);
            }
        }, 100);
    }
}

// --- DESTRUCTIBLE TREASURE CHESTS ---
class TreasureChest {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.hp = 80;
        this.maxHp = 80;
        this.radius = 2.0;
        this.destroyed = false;

        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.7 });

        const baseGeo = new THREE.BoxGeometry(2.0, 1.2, 1.4);
        const baseMesh = new THREE.Mesh(baseGeo, woodMat);
        baseMesh.position.y = 0.6;
        this.group.add(baseMesh);

        const lidGeo = new THREE.BoxGeometry(2.1, 0.5, 1.5);
        this.lidMesh = new THREE.Mesh(lidGeo, woodMat);
        this.lidMesh.position.set(0, 1.35, 0);
        this.group.add(this.lidMesh);

        const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 1.45), goldMat);
        band1.position.set(-0.6, 0.65, 0);
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 1.45), goldMat);
        band2.position.set(0.6, 0.65, 0);
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.2), goldMat);
        lock.position.set(0, 0.9, 0.75);
        this.group.add(band1, band2, lock);

        scene.add(this.group);
        chests.push(this);
    }

    update(dt, playerPos) {
        if (this.destroyed) return;
        const dist = Math.hypot(playerPos.x - this.x, playerPos.z - this.z);
        if (dist < this.radius + 1.2 && !GAME.isDowned) {
            this.open();
        }
    }

    takeDamage(amt) {
        if (this.destroyed) return;
        this.hp -= amt;
        spawnFloatingText(this.group.position, Math.round(amt), '#fbbf24', 14, false);
        this.group.position.x = this.x + (Math.random() - 0.5) * 0.3;
        this.group.position.z = this.z + (Math.random() - 0.5) * 0.3;
        if (this.hp <= 0) {
            this.open();
        }
    }

    open() {
        if (this.destroyed) return;
        this.destroyed = true;
        SFX.chestOpen();

        this.lidMesh.rotation.x = -Math.PI / 2.5;
        this.lidMesh.position.y += 0.4;
        this.lidMesh.position.z -= 0.6;

        createImpact(this.group.position, 0xfbbf24);
        spawnFloatingText(this.group.position, '📦 TREASURE OPENED!', '#fde047', 18, true, '💎');
        logMessage('📦 TREASURE CHEST OPENED!', '#fbbf24');
        trackQuestProgress('chests', 1);

        const dropTypes = ['gold', 'gold', 'health', 'maxhp', 'mana', 'magnet', 'bomb'];
        const bonusMult = 1 + (PERM.chestLootBonus || 0);
        const dropCount = Math.round((4 + Math.floor(Math.random() * 3)) * bonusMult);
        for (let i = 0; i < dropCount; i++) {
            const angle = (i / dropCount) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 2.0 + Math.random() * 2.5;
            const ix = this.x + Math.cos(angle) * dist;
            const iz = this.z + Math.sin(angle) * dist;
            const type = dropTypes[Math.floor(Math.random() * dropTypes.length)];
            new Item(ix, iz, type);
        }
        if (PERM.chestLootBonus > 0) {
            const bonusEss = Math.round(6 * (PERM.chestLootBonus / 0.25));
            SAVE.essence += bonusEss;
            writeSave();
            spawnFloatingText(this.group.position, `+${bonusEss} BONUS ESSENCE ✨`, '#c084fc', 16, true, '✨');
        }

        setTimeout(() => {
            scene.remove(this.group);
            const idx = chests.indexOf(this);
            if (idx !== -1) chests.splice(idx, 1);
        }, 3000);
    }
}

// --- ACTIVE CLASS ULTIMATE ABILITIES ---
window.useUltimate = function() {
    if (GAME.state !== 'PLAYING' || GAME.isDowned) return;
    if (PLAYER.ultCooldown > 0) {
        logMessage(`Ultimate cooling down (${Math.ceil(PLAYER.ultCooldown)}s)`, '#94a3b8');
        return;
    }

    PLAYER.ultCooldown = PLAYER.ultMaxCooldown;
    trackQuestProgress('ult', 1);
    const playerPos = playerMesh.position;

    if (PLAYER.class === 'Warrior') {
        SFX.earthquake();
        cameraShakeTimer = 0.35;
        logMessage('💥 EARTHQUAKE SLAM ACTIVATED!', '#f87171');
        spawnFloatingText(playerPos, '💥 EARTHQUAKE SLAM!', '#f87171', 22, true);

        const ringGeo = new THREE.RingGeometry(1, 2.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xf87171, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(playerPos.x, 0.15, playerPos.z);
        new VFXObject(ringMesh, 0.5, (m, prog) => {
            const scale = 1 + prog * 16;
            m.scale.set(scale, scale, scale);
            m.material.opacity = (1 - prog) * 0.9;
        });

        const radius = 22;
        const damage = 180 + PLAYER.level * 25 + (SAVE.upgrades.power || 0) * 15;
        enemies.forEach(e => {
            const d = playerPos.distanceTo(e.mesh.position);
            if (d <= radius) {
                e.stunTimer = 3.5;
                const pushDir = new THREE.Vector3().subVectors(e.mesh.position, playerPos).normalize();
                e.mesh.position.addScaledVector(pushDir, 7);
                if (IS_MULTIPLAYER) {
                    WS.send(JSON.stringify({ type: 'HIT_ENEMY', enemyId: e.id, damage: damage }));
                } else {
                    e.takeDamage(damage, true, '💥 SLAM!');
                }
            }
        });
        chests.forEach(c => {
            if (playerPos.distanceTo(c.group.position) <= radius) c.takeDamage(damage);
        });

    } else if (PLAYER.class === 'Mage') {
        SFX.frostNova();
        logMessage('❄️ FROST NOVA & BLIZZARD ACTIVATED!', '#38bdf8');
        spawnFloatingText(playerPos, '❄️ FROST NOVA!', '#38bdf8', 22, true);

        const novaGeo = new THREE.RingGeometry(1, 2.2, 32);
        const novaMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
        const novaMesh = new THREE.Mesh(novaGeo, novaMat);
        novaMesh.rotation.x = -Math.PI / 2;
        novaMesh.position.set(playerPos.x, 0.2, playerPos.z);
        new VFXObject(novaMesh, 0.6, (m, prog) => {
            const scale = 1 + prog * 18;
            m.scale.set(scale, scale, scale);
            m.material.opacity = (1 - prog) * 0.95;
        });

        const radius = 25;
        const damage = 150 + PLAYER.level * 22 + (SAVE.upgrades.power || 0) * 12;
        enemies.forEach(e => {
            const d = playerPos.distanceTo(e.mesh.position);
            if (d <= radius) {
                e.freezeTimer = 4.0;
                if (IS_MULTIPLAYER) {
                    WS.send(JSON.stringify({ type: 'HIT_ENEMY', enemyId: e.id, damage: damage }));
                } else {
                    e.takeDamage(damage, true, '❄️ FROZEN!');
                }
            }
        });
        chests.forEach(c => {
            if (playerPos.distanceTo(c.group.position) <= radius) c.takeDamage(damage);
        });

    } else if (PLAYER.class === 'Archer') {
        SFX.arrowStorm();
        PLAYER.invulnerableTimer = 1.5;
        logMessage('🏹 ARROW BARRAGE & DASH ACTIVATED!', '#34d399');
        spawnFloatingText(playerPos, '🏹 ARROW BARRAGE!', '#34d399', 22, true);

        const dashDir = new THREE.Vector3();
        playerMesh.getWorldDirection(dashDir);
        playerMesh.position.addScaledVector(dashDir, 9);
        playerMesh.position.x = Math.max(-490, Math.min(490, playerMesh.position.x));
        playerMesh.position.z = Math.max(-490, Math.min(490, playerMesh.position.z));

        const count = 32;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            const p = new Projectile(playerMesh.position.clone().add(new THREE.Vector3(0, 1, 0)), dir);
            p.speed = 110;
            p.pierce = 5;
            p.life = 2.0;
        }
    }

    if (IS_MULTIPLAYER && WS && WS.readyState === WebSocket.OPEN) {
        WS.send(JSON.stringify({
            type: 'PLAYER_ULT',
            class: PLAYER.class,
            x: playerMesh.position.x,
            z: playerMesh.position.z
        }));
    }

    updateGUI();
};

function updateBuffsHUD() {
    const hud = document.getElementById('hud-buffs');
    if (!hud) return;
    hud.innerHTML = '';
    if (BUFFS.swiftness > 0) {
        hud.innerHTML += `<div class="buff-pill buff-swiftness">⚡ Swiftness ${Math.ceil(BUFFS.swiftness)}s</div>`;
    }
    if (BUFFS.wrath > 0) {
        hud.innerHTML += `<div class="buff-pill buff-wrath">🔥 Wrath ${Math.ceil(BUFFS.wrath)}s</div>`;
    }
}

function spawnMapFeatures() {
    const playerPos = playerMesh.position;
    while (shrines.length < 2) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 45;
        const sx = playerPos.x + Math.cos(angle) * dist;
        const sz = playerPos.z + Math.sin(angle) * dist;
        new Shrine(sx, sz);
    }
    while (chests.length < 2) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 25 + Math.random() * 40;
        const cx = playerPos.x + Math.cos(angle) * dist;
        const cz = playerPos.z + Math.sin(angle) * dist;
        new TreasureChest(cx, cz);
    }
}

function processServerTick(data) {
    if (data.wave) {
        GAME.wave = data.wave;
        GAME.waveState = data.waveState;
        GAME.waveTimer = data.waveTimer;
        GAME.isBossWave = data.isBossWave;
        GAME.totalWaveEnemies = data.totalWaveEnemies;
        GAME.enemiesKilled = data.enemiesKilled;
        updateWaveHUD();
    }

    const serverPlayers = {};
    data.players.forEach(p => { serverPlayers[p.id] = p; });

    for (const id in OTHER_PLAYERS) {
        if (!serverPlayers[id]) {
            scene.remove(OTHER_PLAYERS[id].mesh);
            if (OTHER_PLAYERS[id].arrow) scene.remove(OTHER_PLAYERS[id].arrow);
            delete OTHER_PLAYERS[id];
        }
    }
    
    for (const id in serverPlayers) {
        if (id === MY_ID) continue;
        const p = serverPlayers[id];
        
        if (!OTHER_PLAYERS[id]) {
            OTHER_PLAYERS[id] = { 
                mesh: createPlayerMesh(p.class), 
                targetPos: new THREE.Vector3(), 
                hp: p.hp, 
                maxHp: p.maxHp, 
                class: p.class,
                isDowned: p.isDowned 
            };
            scene.add(OTHER_PLAYERS[id].mesh);
        }
        OTHER_PLAYERS[id].targetPos.set(p.x, OTHER_PLAYERS[id].mesh.position.y, p.z);
        OTHER_PLAYERS[id].mesh.lookAt(p.lookX, OTHER_PLAYERS[id].mesh.position.y, p.lookZ);
        OTHER_PLAYERS[id].hp = p.hp;
        OTHER_PLAYERS[id].maxHp = p.maxHp;
        OTHER_PLAYERS[id].isDowned = p.isDowned;
        
        // Visual indicator for downed teammate
        if (p.isDowned) {
            OTHER_PLAYERS[id].mesh.rotation.z = Math.PI / 2;
        } else {
            OTHER_PLAYERS[id].mesh.rotation.z = 0;
        }
    }

    updateTeammatesHUD();

    const serverEnemies = {};
    data.enemies.forEach(e => { serverEnemies[e.id] = e; });

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!serverEnemies[enemies[i].id]) {
            scene.remove(enemies[i].mesh);
            enemies.splice(i, 1);
        }
    }
    
    let activeBoss = null;
    for (const id in serverEnemies) {
        const se = serverEnemies[id];
        let existing = enemies.find(e => e.id === id);
        if (existing) {
            existing.targetPos = new THREE.Vector3(se.x, existing.mesh.position.y, se.z);
            existing.hp = se.hp;
            existing.maxHp = se.maxHp;
            if (se.isBoss) activeBoss = existing;
        } else {
            let enemy = new Enemy(se.x, se.z, se.type);
            enemy.id = id;
            enemy.hp = se.hp;
            enemy.maxHp = se.maxHp || se.hp;
            enemy.isBoss = se.isBoss || false;
            enemy.name = se.name;
            enemy.targetPos = new THREE.Vector3(se.x, enemy.mesh.position.y, se.z);
            if (se.isBoss) activeBoss = enemy;
        }
    }
    updateBossHUD(activeBoss);
    
    // Process items from server
    const serverItems = {};
    data.items.forEach(i => { serverItems[i.id] = i; });

    for (let i = items.length - 1; i >= 0; i--) {
        if (!serverItems[items[i].id]) {
            scene.remove(items[i].mesh);
            items.splice(i, 1);
        }
    }
    for (const id in serverItems) {
        const si = serverItems[id];
        let existing = items.find(it => it.id === id);
        if (!existing) {
            let item = new Item(si.x, si.z, si.type);
            item.id = id;
        }
    }
}

function updateWaveHUD() {
    const topCenter = document.getElementById('hud-top-center');
    if (!topCenter) return;

    if (GAME.mode === 'dungeon') {
        topCenter.style.display = 'none';
        return;
    }
    topCenter.style.display = 'block';

    const waveEl = document.getElementById('ui-wave');
    const badgeEl = document.getElementById('wave-badge');
    const subStatusEl = document.getElementById('wave-sub-status');
    const barEl = document.getElementById('wave-bar');
    const actionArea = document.getElementById('wave-action-area');
    const skipBtn = document.getElementById('ui-skip-prep-btn');

    if (waveEl) waveEl.innerText = GAME.wave;

    if (GAME.waveState === 'PREPARING') {
        const secs = Math.max(0, Math.ceil(GAME.waveTimer));
        if (badgeEl) {
            badgeEl.innerHTML = `⏳ PREPARING &bull; WAVE <span id="ui-wave">${GAME.wave}</span>`;
            badgeEl.style.color = '#fde047';
        }
        if (subStatusEl) subStatusEl.innerText = `Starting in ${secs}s`;
        if (barEl) {
            const pct = Math.max(0, Math.min(100, (GAME.waveTimer / 4) * 100));
            barEl.style.width = pct + '%';
            barEl.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
        }
        if (actionArea) actionArea.style.display = 'block';
        if (skipBtn) skipBtn.innerText = '⚔️ Start Next Wave';
    } else if (GAME.waveState === 'WAVE_CLEAR') {
        const secs = Math.max(0, Math.ceil(GAME.waveTimer));
        if (badgeEl) {
            badgeEl.innerHTML = `🎉 WAVE ${GAME.wave} CLEARED!`;
            badgeEl.style.color = '#34d399';
        }
        if (subStatusEl) subStatusEl.innerText = `Next wave in ${secs}s`;
        if (barEl) {
            const pct = Math.max(0, Math.min(100, (GAME.waveTimer / 12) * 100));
            barEl.style.width = pct + '%';
            barEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        }
        if (actionArea) actionArea.style.display = 'block';
        if (skipBtn) skipBtn.innerText = `⚔️ Skip Timer (${secs}s)`;
    } else { // WAVE_ACTIVE
        if (badgeEl) {
            if (GAME.isBossWave) {
                badgeEl.innerHTML = `👑 BOSS WAVE <span id="ui-wave">${GAME.wave}</span>`;
                badgeEl.style.color = '#f43f5e';
            } else {
                badgeEl.innerHTML = `🌊 WAVE <span id="ui-wave">${GAME.wave}</span>`;
                badgeEl.style.color = '#38bdf8';
            }
        }
        if (subStatusEl) {
            subStatusEl.innerText = `(${GAME.enemiesKilled}/${GAME.totalWaveEnemies})`;
        }
        if (barEl) {
            const total = Math.max(1, GAME.totalWaveEnemies || 20);
            const pct = Math.max(0, Math.min(100, (GAME.enemiesKilled / total) * 100));
            barEl.style.width = pct + '%';
            barEl.style.background = GAME.isBossWave 
                ? 'linear-gradient(90deg, #ef4444, #f43f5e)' 
                : 'linear-gradient(90deg, #00b894, #00cec9)';
        }
        if (actionArea) actionArea.style.display = 'none';
    }
}

function updateTeammatesHUD() {
    const container = document.getElementById('teammates-list');
    const countEl = document.getElementById('ui-team-count');
    if (!container) return;
    
    const ids = Object.keys(OTHER_PLAYERS);
    if (countEl) countEl.innerText = ids.length;
    container.innerHTML = '';
    
    ids.forEach(id => {
        const p = OTHER_PLAYERS[id];
        const pct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
        const div = document.createElement('div');
        div.className = 'teammate-row' + (p.isDowned ? ' teammate-downed' : '');
        div.innerHTML = `
            <div style="font-weight:bold;">${p.class}</div>
            <div style="flex:1; margin: 0 6px;">
                <div class="bar-container" style="height:8px; margin:0;"><div class="health-bar" style="width:${pct}%;"></div></div>
            </div>
            <div>${p.isDowned ? '💀 DOWN' : Math.floor(p.hp)}</div>
        `;
        container.appendChild(div);
    });
}

function updateBossHUD(boss) {
    const bossHud = document.getElementById('boss-hud');
    if (!bossHud) return;
    if (boss && boss.hp > 0) {
        bossHud.style.display = 'block';
        const nameEl = document.getElementById('boss-name');
        const hpText = document.getElementById('boss-hp-text');
        const bar = document.getElementById('boss-bar');
        const pct = Math.max(0, Math.min(100, (boss.hp / (boss.maxHp || 100)) * 100));
        if (nameEl) nameEl.innerText = '⚠️ BOSS: ' + (boss.name || 'Warlord');
        if (hpText) hpText.innerText = Math.floor(pct) + '%';
        if (bar) bar.style.width = pct + '%';
    } else {
        bossHud.style.display = 'none';
    }
}

// --- 3-HERO MMORPG DUNGEON RAID SYSTEM ---
const dungeonMeshes = [];
const dungeonLootDrops = [];
const raidCompanions = [];
let dungeonActiveGateMesh = null;
let currentDungeonRoomIdx = 0;
let malakorBossRef = null;

const DUNGEON_CHAMBERS = [
    {
        id: 0,
        name: 'Chamber I: The Outer Catacombs',
        desc: 'Clear the patrolling skeletal vanguard to unseal the crypt gate.',
        zMin: -70, zMax: 5, xMin: -36, xMax: 36,
        spawnZ: -50, gateZ: 0,
        mobs: [
            { type: 'slime', x: -10, z: -30, pack: 1 },
            { type: 'slime', x: 10, z: -30, pack: 1 },
            { type: 'bluecube', x: -6, z: -38, pack: 1 },
            { type: 'bluecube', x: 6, z: -38, pack: 1 },
            { type: 'bluecube', x: -16, z: -15, pack: 2 },
            { type: 'bluecube', x: 16, z: -15, pack: 2 },
            { type: 'slime', x: 0, z: -12, pack: 2 }
        ]
    },
    {
        id: 1,
        name: 'Chamber II: Hall of the Sunken Crypt',
        desc: 'Overcome the crypt guards and necromantic sentinels.',
        zMin: 5, zMax: 105, xMin: -40, xMax: 40,
        spawnZ: 15, gateZ: 100,
        mobs: [
            { type: 'orc', x: -12, z: 45, pack: 1 },
            { type: 'orc', x: 12, z: 45, pack: 1 },
            { type: 'slime', x: -18, z: 58, pack: 1 },
            { type: 'slime', x: 18, z: 58, pack: 1 },
            { type: 'orc', x: 0, z: 75, pack: 2 },
            { type: 'bluecube', x: -12, z: 85, pack: 2 },
            { type: 'bluecube', x: 12, z: 85, pack: 2 },
            { type: 'slime', x: 0, z: 90, pack: 2 }
        ]
    },
    {
        id: 2,
        name: 'Chamber III: The Obsidian Cavern',
        desc: 'Vanquish the obsidian brutes guarding the ancient ritual circle.',
        zMin: 105, zMax: 210, xMin: -45, xMax: 45,
        spawnZ: 115, gateZ: 205,
        mobs: [
            { type: 'orc', x: -16, z: 145, pack: 1 },
            { type: 'orc', x: 16, z: 145, pack: 1 },
            { type: 'orc', x: 0, z: 155, pack: 1 },
            { type: 'slime', x: -22, z: 170, pack: 2 },
            { type: 'slime', x: 22, z: 170, pack: 2 },
            { type: 'orc', x: -12, z: 185, pack: 2 },
            { type: 'orc', x: 12, z: 185, pack: 2 },
            { type: 'bluecube', x: 0, z: 195, pack: 2 }
        ]
    },
    {
        id: 3,
        name: 'Chamber IV: Sanctum of the Lich Guard',
        desc: 'Defeat Dread Knight Vael and his royal legionnaire escort.',
        zMin: 210, zMax: 320, xMin: -50, xMax: 50,
        spawnZ: 220, gateZ: 315,
        mobs: [
            { type: 'boss_orc', x: 0, z: 270, isMiniBoss: true, name: 'Dread Knight Vael', pack: 1 },
            { type: 'orc', x: -16, z: 260, pack: 1 },
            { type: 'orc', x: 16, z: 260, pack: 1 },
            { type: 'orc', x: -12, z: 285, pack: 1 },
            { type: 'orc', x: 12, z: 285, pack: 1 },
            { type: 'slime', x: -24, z: 295, pack: 1 },
            { type: 'slime', x: 24, z: 295, pack: 1 }
        ]
    },
    {
        id: 4,
        name: 'Chamber V: Throne of Overlord Malakor',
        desc: 'Slay Overlord Malakor to conquer the dungeon and claim the grand raid spoils!',
        zMin: 320, zMax: 460, xMin: -60, xMax: 60,
        spawnZ: 335, gateZ: 450,
        mobs: [
            { type: 'boss_necromancer', x: 0, z: 395, isFinalBoss: true, name: 'Overlord Malakor', pack: 1 }
        ]
    }
];

class RaidCompanion {
    constructor(name, heroClass, role) {
        this.name = name;
        this.class = heroClass;
        this.role = role; // 'Tank', 'Healer', 'DPS'
        this.mesh = createPlayerMesh(heroClass);
        scene.add(this.mesh);
        
        const base = CLASSES[heroClass] || CLASSES.Warrior;
        this.maxHp = base.baseHp * 2.2;
        this.hp = this.maxHp;
        this.maxMana = base.baseMana * 1.5;
        this.mana = this.maxMana;
        this.damage = base.baseDamage * 1.3;
        this.speed = base.baseSpeed * 0.95;
        
        this.attackTimer = 0;
        this.healTimer = 0;
        this.tauntTimer = 0;
        this.isDowned = false;
        this.targetPos = new THREE.Vector3();
    }

    update(dt, playerPos) {
        if (this.isDowned) return;

        // Find nearest living dungeon mob
        let nearestEnemy = null;
        let minDist = 999;
        enemies.forEach(e => {
            if (e.hp > 0) {
                const d = this.mesh.position.distanceTo(e.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            }
        });

        // Positioning Logic
        const offsetX = (this.class === 'Warrior' ? -4 : (this.class === 'Mage' ? 4 : -6));
        const offsetZ = (this.class === 'Warrior' ? 3 : (this.class === 'Mage' ? -4 : -6));
        const formationPos = playerPos.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));

        if (nearestEnemy && minDist < 35) {
            // In Combat
            this.mesh.lookAt(nearestEnemy.mesh.position.x, this.mesh.position.y, nearestEnemy.mesh.position.z);
            
            if (this.role === 'Tank') {
                // Move towards enemy front line
                const dir = new THREE.Vector3().subVectors(nearestEnemy.mesh.position, this.mesh.position).normalize();
                if (minDist > 3.5) {
                    this.mesh.position.addScaledVector(dir, this.speed * dt);
                }
                // Taunt & Whirlwind
                this.tauntTimer -= dt;
                if (this.tauntTimer <= 0) {
                    this.tauntTimer = 5.5;
                    SFX.slash();
                    spawnFloatingText(this.mesh.position, '🛡️ TAUNT!', '#f87171', 16, true);
                    enemies.forEach(e => {
                        if (e.mesh.position.distanceTo(this.mesh.position) < 14) {
                            e.takeDamage(this.damage * 1.5, true);
                        }
                    });
                }
                // Basic Slash
                this.attackTimer -= dt;
                if (this.attackTimer <= 0 && minDist < 6.0) {
                    this.attackTimer = 0.8;
                    SFX.slash();
                    nearestEnemy.takeDamage(this.damage, false);
                }
            } else if (this.role === 'Healer' || this.class === 'Mage') {
                // Support & Ranged Magic
                if (minDist < 12) {
                    const retreat = new THREE.Vector3().subVectors(this.mesh.position, nearestEnemy.mesh.position).normalize();
                    this.mesh.position.addScaledVector(retreat, this.speed * 0.8 * dt);
                } else if (minDist > 25) {
                    const advance = new THREE.Vector3().subVectors(nearestEnemy.mesh.position, this.mesh.position).normalize();
                    this.mesh.position.addScaledVector(advance, this.speed * dt);
                }
                // Heal Lowest Party Member
                this.healTimer -= dt;
                if (this.healTimer <= 0) {
                    this.healTimer = 4.0;
                    let healTarget = null;
                    if (PLAYER.hp < PLAYER.maxHp * 0.75) {
                        healTarget = { isPlayer: true, pos: playerMesh.position };
                    } else {
                        const lowComp = raidCompanions.find(c => c.hp < c.maxHp * 0.7 && !c.isDowned);
                        if (lowComp) healTarget = { isPlayer: false, companion: lowComp, pos: lowComp.mesh.position };
                    }
                    if (healTarget) {
                        SFX.healSpell();
                        if (healTarget.isPlayer) {
                            PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 80);
                            spawnFloatingText(playerMesh.position, '+80 HP HEAL', '#34d399', 16, true, '✨');
                            updateGUI();
                        } else {
                            healTarget.companion.hp = Math.min(healTarget.companion.maxHp, healTarget.companion.hp + 120);
                            spawnFloatingText(healTarget.companion.mesh.position, '+120 HP HEAL', '#34d399', 16, true, '✨');
                        }
                    }
                }
                // Arcane Missile
                this.attackTimer -= dt;
                if (this.attackTimer <= 0 && minDist < 30) {
                    this.attackTimer = 1.0;
                    SFX.shoot();
                    const dir = new THREE.Vector3().subVectors(nearestEnemy.mesh.position, this.mesh.position).normalize();
                    const p = new Projectile(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), dir);
                    p.damage = this.damage * 1.2;
                    p.mesh.material.color.setHex(0x38bdf8);
                }
            } else {
                // Archer DPS
                if (minDist < 14) {
                    const retreat = new THREE.Vector3().subVectors(this.mesh.position, nearestEnemy.mesh.position).normalize();
                    this.mesh.position.addScaledVector(retreat, this.speed * 0.9 * dt);
                } else if (minDist > 26) {
                    const advance = new THREE.Vector3().subVectors(nearestEnemy.mesh.position, this.mesh.position).normalize();
                    this.mesh.position.addScaledVector(advance, this.speed * dt);
                }
                this.attackTimer -= dt;
                if (this.attackTimer <= 0 && minDist < 32) {
                    this.attackTimer = 0.55;
                    SFX.shoot();
                    const dir = new THREE.Vector3().subVectors(nearestEnemy.mesh.position, this.mesh.position).normalize();
                    const p = new Projectile(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), dir);
                    p.damage = this.damage;
                    p.speed = 100;
                }
            }
        } else {
            // Return to player formation
            const distToForm = this.mesh.position.distanceTo(formationPos);
            if (distToForm > 2.0) {
                const dir = new THREE.Vector3().subVectors(formationPos, this.mesh.position).normalize();
                this.mesh.position.addScaledVector(dir, this.speed * dt * Math.min(2.5, distToForm / 2.0));
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
            }
            // Out of combat slow regen
            if (this.hp < this.maxHp) {
                this.hp = Math.min(this.maxHp, this.hp + dt * 15);
            }
        }

        // Clamp inside dungeon bounds
        const ch = DUNGEON_CHAMBERS[currentDungeonRoomIdx];
        if (ch) {
            this.mesh.position.x = Math.max(ch.xMin + 2, Math.min(ch.xMax - 2, this.mesh.position.x));
            this.mesh.position.z = Math.max(ch.zMin + 2, Math.min(ch.zMax - 2, this.mesh.position.z));
        }
    }

    takeDamage(amt) {
        if (this.isDowned) return;
        this.hp -= amt;
        spawnFloatingText(this.mesh.position, `-${Math.round(amt)}`, '#ef4444', 14);
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDowned = true;
            this.mesh.rotation.z = Math.PI / 2;
            spawnFloatingText(this.mesh.position, '💀 DOWNED!', '#f87171', 18, true);
            logMessage(`Companion ${this.name} was downed in battle!`, '#ef4444');
        }
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

class DungeonLootItem {
    constructor(x, z, itemId) {
        this.itemId = itemId;
        this.item = ITEM_DATABASE[itemId] || ITEM_DATABASE.war_wep_2;
        this.x = x;
        this.z = z;
        this.life = 1;
        this.rarity = this.item.rarity || 'rare';
        this.colorHex = getRarityBorder(this.rarity);
        this.colorNum = parseInt(this.colorHex.replace('#', '0x'));

        this.group = new THREE.Group();
        this.group.position.set(x, 0, z);

        // Rotating item token
        const orbGeo = new THREE.DodecahedronGeometry(0.7);
        const orbMat = new THREE.MeshStandardMaterial({
            color: this.colorNum,
            emissive: this.colorNum,
            emissiveIntensity: 0.6,
            roughness: 0.2
        });
        this.orbMesh = new THREE.Mesh(orbGeo, orbMat);
        this.orbMesh.position.y = 1.4;
        this.group.add(this.orbMesh);

        // Vertical luminous loot beam
        const beamGeo = new THREE.CylinderGeometry(0.12, 0.4, 18, 12, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.colorNum,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
        });
        this.beamMesh = new THREE.Mesh(beamGeo, beamMat);
        this.beamMesh.position.y = 9;
        this.group.add(this.beamMesh);

        // Ground halo
        const haloGeo = new THREE.RingGeometry(0.5, 1.6, 16);
        const haloMat = new THREE.MeshBasicMaterial({
            color: this.colorNum,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.rotation.x = -Math.PI / 2;
        haloMesh.position.y = 0.1;
        this.group.add(haloMesh);

        scene.add(this.group);
        dungeonLootDrops.push(this);
    }

    update(dt, playerPos) {
        this.orbMesh.rotation.y += dt * 3.0;
        this.beamMesh.rotation.y += dt * 1.5;
        this.orbMesh.position.y = 1.4 + Math.sin(GAME.time * 4) * 0.25;

        const dist = Math.hypot(playerPos.x - this.x, playerPos.z - this.z);
        if (dist < 3.8) {
            // Activate quick pickup modal
            if (activeLootDrop !== this) {
                activeLootDrop = this;
                showQuickLootModal(this.item);
            }
        } else if (activeLootDrop === this && dist > 5.5) {
            activeLootDrop = null;
            hideQuickLootModal();
        }
    }

    destroy() {
        scene.remove(this.group);
        const idx = dungeonLootDrops.indexOf(this);
        if (idx !== -1) dungeonLootDrops.splice(idx, 1);
        if (activeLootDrop === this) {
            activeLootDrop = null;
            hideQuickLootModal();
        }
    }
}

function showQuickLootModal(item) {
    const modal = document.getElementById('loot-pickup-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    const iconEl = document.getElementById('loot-modal-icon');
    const nameEl = document.getElementById('loot-modal-name');
    const classEl = document.getElementById('loot-modal-class');
    const statsEl = document.getElementById('loot-modal-stats');
    const compEl = document.getElementById('loot-modal-compare');
    const equipBtn = document.getElementById('btn-quick-equip');

    const rColor = getRarityBorder(item.rarity);
    if (iconEl) iconEl.innerText = item.icon;
    if (nameEl) {
        nameEl.innerText = item.name;
        nameEl.style.color = rColor;
    }
    if (classEl) {
        classEl.innerText = item.classReq === 'All' ? 'All Classes' : `${item.classReq} Only`;
        classEl.className = `item-class-badge badge-${item.classReq.toLowerCase()}`;
    }
    if (statsEl) statsEl.innerText = `${item.rarity.toUpperCase()} ${item.slot.toUpperCase()} • ${getStatString(item.stats)}`;

    // Comparison vs current equipped
    const eq = SAVE.equipped && SAVE.equipped[PLAYER.class] ? SAVE.equipped[PLAYER.class] : {};
    const currentEqId = eq[item.slot];
    const currentEqItem = currentEqId ? ITEM_DATABASE[currentEqId] : null;

    if (currentEqItem) {
        const dmgDiff = (item.stats.damage || 0) - (currentEqItem.stats.damage || 0);
        const hpDiff = (item.stats.maxHp || 0) - (currentEqItem.stats.maxHp || 0);
        let compText = `Vs Equipped (${currentEqItem.name}): `;
        if (dmgDiff !== 0) compText += `${dmgDiff > 0 ? '+' : ''}${dmgDiff} DMG `;
        if (hpDiff !== 0) compText += `${hpDiff > 0 ? '+' : ''}${hpDiff} HP `;
        if (compEl) {
            compEl.innerText = compText || 'Similar stats';
            compEl.style.color = (dmgDiff >= 0 && hpDiff >= 0) ? '#34d399' : '#fb923c';
        }
    } else {
        if (compEl) {
            compEl.innerText = 'Empty slot! Massive upgrade!';
            compEl.style.color = '#34d399';
        }
    }

    const canEquip = (item.classReq === 'All' || item.classReq === PLAYER.class);
    if (equipBtn) {
        equipBtn.style.display = canEquip ? 'block' : 'none';
    }
}

function hideQuickLootModal() {
    const modal = document.getElementById('loot-pickup-modal');
    if (modal) modal.style.display = 'none';
}

window.handleQuickEquipLoot = function() {
    if (!activeLootDrop) return;
    const item = activeLootDrop.item;
    const canEquip = (item.classReq === 'All' || item.classReq === PLAYER.class);
    
    if (!canEquip) {
        logMessage(`Cannot equip: ${item.name} requires ${item.classReq}! Stashing to bag.`, '#ef4444');
        window.handleQuickBagLoot();
        return;
    }

    if (!SAVE.equipped) SAVE.equipped = {};
    if (!SAVE.equipped[PLAYER.class]) SAVE.equipped[PLAYER.class] = {};

    const oldEquippedId = SAVE.equipped[PLAYER.class][item.slot];
    SAVE.equipped[PLAYER.class][item.slot] = item.id;
    if (oldEquippedId && oldEquippedId !== item.id) {
        SAVE.inventory.push(oldEquippedId);
    }

    writeSave();
    SFX.equip();
    logMessage(`⚡ Quick-Equipped ${item.name}!`, getRarityBorder(item.rarity));
    spawnFloatingText(playerMesh.position, `⚡ EQUIPPED ${item.name}!`, getRarityBorder(item.rarity), 18, true, '🗡️');

    activeLootDrop.destroy();
    applyEquipmentStats(PLAYER.class);
    updateGUI();
};

window.handleQuickBagLoot = function() {
    if (!activeLootDrop) return;
    const item = activeLootDrop.item;
    if (!Array.isArray(SAVE.inventory)) SAVE.inventory = [];
    SAVE.inventory.push(item.id);
    writeSave();

    SFX.coin();
    logMessage(`🎒 Stashed ${item.name} into Adventurer Stash!`, getRarityBorder(item.rarity));
    spawnFloatingText(playerMesh.position, `🎒 STASHED ${item.name}`, getRarityBorder(item.rarity), 16, false, '📦');

    activeLootDrop.destroy();
    updateGUI();
};

function clearDungeonState() {
    dungeonMeshes.forEach(m => scene.remove(m));
    dungeonMeshes.length = 0;
    dungeonLootDrops.forEach(d => scene.remove(d.group));
    dungeonLootDrops.length = 0;
    raidCompanions.forEach(c => c.destroy());
    raidCompanions.length = 0;
    dungeonActiveGateMesh = null;
    activeLootDrop = null;
    hideQuickLootModal();
    const vicScreen = document.getElementById('dungeon-victory-screen');
    if (vicScreen) vicScreen.style.display = 'none';
}

function initDungeonMode() {
    clearDungeonState();
    currentDungeonRoomIdx = 0;
    GAME.dungeonRoom = 0;
    GAME.dungeonTotalRooms = DUNGEON_CHAMBERS.length;
    GAME.dungeonCleared = false;

    buildDungeonGeometry();
    spawnDungeonCompanions();
    loadDungeonChamber(0);

    // Place player at starting crypt position
    playerMesh.position.set(0, 1, -50);
}

function buildDungeonGeometry() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.15 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, emissive: 0x581c87, roughness: 0.4 });

    DUNGEON_CHAMBERS.forEach((ch, idx) => {
        // Floor slab
        const fWidth = (ch.xMax - ch.xMin);
        const fDepth = (ch.zMax - ch.zMin);
        const fGeo = new THREE.PlaneGeometry(fWidth, fDepth);
        const floor = new THREE.Mesh(fGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0.05, (ch.zMin + ch.zMax) / 2);
        scene.add(floor);
        dungeonMeshes.push(floor);

        // Left & Right Stone Walls
        const wallH = 8;
        const wGeoSide = new THREE.BoxGeometry(2, wallH, fDepth);
        const leftWall = new THREE.Mesh(wGeoSide, wallMat);
        leftWall.position.set(ch.xMin, wallH / 2, (ch.zMin + ch.zMax) / 2);
        const rightWall = new THREE.Mesh(wGeoSide, wallMat);
        rightWall.position.set(ch.xMax, wallH / 2, (ch.zMin + ch.zMax) / 2);
        scene.add(leftWall, rightWall);
        dungeonMeshes.push(leftWall, rightWall);

        // Back Wall
        if (idx === 0) {
            const bGeo = new THREE.BoxGeometry(fWidth, wallH, 2);
            const backWall = new THREE.Mesh(bGeo, wallMat);
            backWall.position.set(0, wallH / 2, ch.zMin);
            scene.add(backWall);
            dungeonMeshes.push(backWall);
        }

        // Torches along walls
        [-1, 1].forEach(side => {
            const torchGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.2);
            const torchMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
            const torch = new THREE.Mesh(torchGeo, torchMat);
            torch.position.set(side * (ch.xMax - 1), 3.5, (ch.zMin + ch.zMax) / 2);
            const fireGeo = new THREE.DodecahedronGeometry(0.35);
            const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
            const fire = new THREE.Mesh(fireGeo, fireMat);
            fire.position.y = 0.7;
            torch.add(fire);
            scene.add(torch);
            dungeonMeshes.push(torch);
        });

        // Chamber Gate (Energy Portcullis)
        if (idx < DUNGEON_CHAMBERS.length - 1) {
            const gateGeo = new THREE.BoxGeometry(fWidth * 0.9, 7.5, 1.5);
            const gate = new THREE.Mesh(gateGeo, gateMat);
            gate.position.set(0, 3.75, ch.gateZ);
            gate.userData = { chamberIdx: idx, open: false };
            scene.add(gate);
            dungeonMeshes.push(gate);
        }
    });
}

function spawnDungeonCompanions() {
    // Generate 2 party companions matching missing raid archetypes
    if (PLAYER.class === 'Warrior') {
        raidCompanions.push(new RaidCompanion('Lady Lyra', 'Mage', 'Healer'));
        raidCompanions.push(new RaidCompanion('Ranger Robin', 'Archer', 'DPS'));
    } else if (PLAYER.class === 'Mage') {
        raidCompanions.push(new RaidCompanion('Sir Gareth', 'Warrior', 'Tank'));
        raidCompanions.push(new RaidCompanion('Ranger Robin', 'Archer', 'DPS'));
    } else {
        raidCompanions.push(new RaidCompanion('Sir Gareth', 'Warrior', 'Tank'));
        raidCompanions.push(new RaidCompanion('Lady Lyra', 'Mage', 'Healer'));
    }

    raidCompanions.forEach((c, idx) => {
        c.mesh.position.set((idx === 0 ? -4 : 4), 1, -54);
    });

    updatePartyFramesHUD();
}

function updatePartyFramesHUD() {
    const container = document.getElementById('hud-dungeon-party');
    if (!container) return;
    container.innerHTML = '';

    // Player Frame
    const playerPct = Math.max(0, Math.min(100, (PLAYER.hp / PLAYER.maxHp) * 100));
    const playerDiv = document.createElement('div');
    playerDiv.className = 'party-member-card' + (GAME.isDowned ? ' downed' : '');
    playerDiv.innerHTML = `
        <div class="party-member-header">
            <span class="party-member-name">⭐ You (${PLAYER.class})</span>
            <span class="party-member-role">${PLAYER.class === 'Warrior' ? '🛡️ TANK' : (PLAYER.class === 'Mage' ? '🔮 MAGE' : '🏹 DPS')}</span>
        </div>
        <div class="bar-container" style="height:8px; margin:2px 0 0 0; background:#334155;">
            <div class="health-bar" style="width:${playerPct}%; background:${playerPct < 30 ? '#ef4444' : '#22c55e'};"></div>
        </div>
    `;
    container.appendChild(playerDiv);

    // Companion Frames
    raidCompanions.forEach(c => {
        const pct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
        const div = document.createElement('div');
        div.className = 'party-member-card' + (c.isDowned ? ' downed' : '');
        div.innerHTML = `
            <div class="party-member-header">
                <span class="party-member-name">${c.name}</span>
                <span class="party-member-role">${c.role === 'Tank' ? '🛡️ TANK' : (c.role === 'Healer' ? '💚 HEAL' : '🏹 DPS')}</span>
            </div>
            <div class="bar-container" style="height:8px; margin:2px 0 0 0; background:#334155;">
                <div class="health-bar" style="width:${pct}%; background:${pct < 30 ? '#ef4444' : '#38bdf8'};"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

function loadDungeonChamber(chamberIdx) {
    currentDungeonRoomIdx = chamberIdx;
    GAME.dungeonRoom = chamberIdx;
    const ch = DUNGEON_CHAMBERS[chamberIdx];
    if (!ch) return;

    // Update Dungeon HUD
    const nameEl = document.getElementById('dungeon-room-name');
    const objEl = document.getElementById('dungeon-obj-text');
    if (nameEl) nameEl.innerText = ch.name;
    if (objEl) objEl.innerText = ch.desc;

    SFX.waveStart();
    logMessage(`ENTERED: ${ch.name}`, '#c084fc');
    spawnFloatingText(playerMesh.position, ch.name, '#c084fc', 20, true, '🏰');

    // Spawn Chamber Mobs in Formations
    ch.mobs.forEach(m => {
        const e = new Enemy(m.x, m.z, m.type);
        e.isDungeonMob = true;
        e.chamberIdx = chamberIdx;
        e.isAggroed = false;
        e.originPos = new THREE.Vector3(m.x, 0, m.z);
        if (m.name) e.name = m.name;
        if (m.isFinalBoss) {
            malakorBossRef = e;
            e.hp = 2400 + (SAVE.upgrades.power || 0) * 100;
            e.maxHp = e.hp;
            e.bossSpellTimer = 3.0;
        }
    });

    GAME.dungeonRoomTotal = ch.mobs.length;
    GAME.dungeonRoomKills = 0;
}

function updateDungeon(dt, playerPos) {
    if (GAME.mode !== 'dungeon') return;

    const ch = DUNGEON_CHAMBERS[currentDungeonRoomIdx];
    if (!ch) return;

    // 1. Companion AI & Party HUD
    raidCompanions.forEach(c => c.update(dt, playerPos));
    updatePartyFramesHUD();

    // 2. Mob Aggro Pull Logic
    enemies.forEach(e => {
        if (!e.isDungeonMob || e.hp <= 0) return;
        if (!e.isAggroed) {
            const dPlayer = playerPos.distanceTo(e.mesh.position);
            let dComp = 999;
            raidCompanions.forEach(c => {
                const dc = c.mesh.position.distanceTo(e.mesh.position);
                if (dc < dComp) dComp = dc;
            });

            if (dPlayer < 22 || dComp < 20 || e.hp < e.maxHp) {
                // Pull whole mob pack
                e.isAggroed = true;
                SFX.aggro();
                spawnFloatingText(e.mesh.position, '⚠️ AGGRO!', '#ef4444', 16, true, '❗');
                enemies.forEach(other => {
                    if (other.isDungeonMob && other.chamberIdx === currentDungeonRoomIdx) {
                        other.isAggroed = true;
                    }
                });
            }
        }
    });

    // 3. Final Boss Malakor Mechanics
    if (malakorBossRef && malakorBossRef.hp > 0) {
        malakorBossRef.bossSpellTimer = (malakorBossRef.bossSpellTimer || 3.0) - dt;
        if (malakorBossRef.bossSpellTimer <= 0) {
            malakorBossRef.bossSpellTimer = 4.5;
            SFX.frostNova();
            spawnFloatingText(malakorBossRef.mesh.position, '🔮 NETHER NOVA!', '#a855f7', 18, true);
            // Spawn 8 Void energy orbs radiating outward
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                const p = new Projectile(malakorBossRef.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dir);
                p.speed = 35;
                p.damage = 35;
                p.mesh.material.color.setHex(0xa855f7);
            }
        }
        updateBossHUD(malakorBossRef);
    }

    // 4. Chamber Gate & Progression Check
    const activeEnemiesInRoom = enemies.filter(e => e.isDungeonMob && e.chamberIdx === currentDungeonRoomIdx && e.hp > 0);
    
    if (activeEnemiesInRoom.length === 0 && currentDungeonRoomIdx < DUNGEON_CHAMBERS.length - 1) {
        // Open Gate to next chamber
        const gate = dungeonMeshes.find(m => m.userData && m.userData.chamberIdx === currentDungeonRoomIdx);
        if (gate && !gate.userData.open) {
            gate.userData.open = true;
            SFX.gateOpen();
            scene.remove(gate);
            spawnFloatingText(playerPos, '🚪 GATE UNSEALED! PROCEED!', '#34d399', 20, true, '✨');
            logMessage(`Chamber gate unlocked! Advance to next room.`, '#34d399');
        }

        // If player crosses into next chamber
        if (playerPos.z > ch.gateZ + 6) {
            loadDungeonChamber(currentDungeonRoomIdx + 1);
        }
    }

    // 5. Final Boss Defeat & Victory
    if (currentDungeonRoomIdx === 4 && malakorBossRef && malakorBossRef.hp <= 0 && !GAME.dungeonCleared) {
        GAME.dungeonCleared = true;
        triggerDungeonVictory();
    }

    // 6. Loot Drops Update
    for (let i = dungeonLootDrops.length - 1; i >= 0; i--) {
        dungeonLootDrops[i].update(dt, playerPos);
    }

    // 7. Restrict Player Pathing to Chamber & Corridor Boundaries
    playerPos.x = Math.max(ch.xMin + 1.5, Math.min(ch.xMax - 1.5, playerPos.x));
    playerPos.z = Math.max(ch.zMin + 1.0, playerPos.z);
    if (!dungeonMeshes.some(m => m.userData && m.userData.chamberIdx === currentDungeonRoomIdx && m.userData.open)) {
        playerPos.z = Math.min(ch.gateZ - 1.5, playerPos.z);
    }
}

function spawnDungeonLootDrop(x, z, mobType, isBoss) {
    const roll = Math.random();
    let rarity = 'common';
    if (isBoss) {
        rarity = (roll < 0.45 ? 'epic' : 'legendary');
    } else {
        if (roll < 0.45) rarity = 'common';
        else if (roll < 0.82) rarity = 'rare';
        else rarity = 'epic';
    }

    // Filter database items by rarity
    const matching = Object.keys(ITEM_DATABASE).filter(k => ITEM_DATABASE[k].rarity === rarity);
    const chosenId = matching[Math.floor(Math.random() * matching.length)] || 'war_wep_2';

    new DungeonLootItem(x, z, chosenId);
    if (rarity === 'legendary' || rarity === 'epic') {
        SFX.lootLegendary();
        spawnFloatingText(new THREE.Vector3(x, 1, z), `✨ ${rarity.toUpperCase()} DROP!`, getRarityBorder(rarity), 20, true);
    }
}

function triggerDungeonVictory() {
    GAME.state = 'DUNGEON_VICTORY';
    SFX.lootLegendary();

    const goldBonus = 650 + (SAVE.upgrades.greed || 0) * 80;
    const essenceBonus = 350;
    GAME.gold += goldBonus;
    SAVE.essence += essenceBonus;
    writeSave();

    // Spawn grand loot beams around Malakor's throne
    spawnDungeonLootDrop(0, 395, 'boss', true);
    spawnDungeonLootDrop(-6, 398, 'boss', true);
    spawnDungeonLootDrop(6, 398, 'boss', true);

    const vicScreen = document.getElementById('dungeon-victory-screen');
    const goldEl = document.getElementById('dv-gold');
    const essEl = document.getElementById('dv-essence');
    const killEl = document.getElementById('dv-kills');
    const lootList = document.getElementById('dv-loot-rewards');

    if (goldEl) goldEl.innerText = `+${goldBonus}`;
    if (essEl) essEl.innerText = `+${essenceBonus}`;
    if (killEl) killEl.innerText = `${GAME.kills}`;
    if (lootList) {
        lootList.innerHTML = `
            <div style="background:rgba(251,191,36,0.15); border:1px solid #fbbf24; border-radius:8px; padding:6px 12px; color:#fbbf24; font-weight:bold; font-size:0.85rem;">👑 Overlord Raid Spoils Chest Unlocked!</div>
        `;
    }

    if (vicScreen) vicScreen.style.display = 'flex';
}

// --- GAME LIFECYCLE ---
window.startGame = function(className) {
    initAudio();
    const heroName = className || selectedStartHero || 'Warrior';
    const roomInput = document.getElementById('room-input');
    const roomCode = roomInput ? roomInput.value.trim() : '';
    
    PLAYER.class = heroName;
    currentGearHero = heroName;
    const data = CLASSES[heroName] || CLASSES.Warrior;

    applyPermanentUpgrades();
    applyEquipmentStats(heroName);

    PLAYER.hp = PLAYER.maxHp;
    PLAYER.mana = PLAYER.maxMana;
    PLAYER.skills = [];
    PLAYER.activeSkillIds = [];
    PLAYER.level = 1; PLAYER.exp = 0; PLAYER.expNeeded = 100;

    GAME.gold = (SAVE.upgrades.headStart || 0) * 100;
    GAME.score = 0; GAME.kills = 0; GAME.time = 0;
    GAME.wave = 1;
    GAME.waveState = 'PREPARING';
    GAME.waveTimer = 4;
    GAME.totalWaveEnemies = 20;
    GAME.enemiesSpawned = 0;
    GAME.enemiesKilled = 0;
    GAME.isDowned = false;
    GAME.reviveTokens = 0;
    GAME.shield = (PLAYER.gearBonus && PLAYER.gearBonus.shield) ? PLAYER.gearBonus.shield : 0;

    INRUN.damageMult = 1.0;
    INRUN.fireRateMult = 1.0;
    INRUN.speedMult = 1.0;

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('ui-class').innerText = heroName;
    
    if (heroName !== 'Mage') {
        document.getElementById('mana-box').style.display = 'none';
    } else {
        document.getElementById('mana-box').style.display = 'block';
    }
    
    buildPlayerVisuals();
    updateEffects();
    updateGUI();

    if (GAME.mode === 'dungeon') {
        const waveHUD = document.getElementById('hud-top-center');
        const dunObj = document.getElementById('hud-dungeon-obj');
        const dunParty = document.getElementById('hud-dungeon-party');
        if (waveHUD) waveHUD.style.display = 'none';
        if (dunObj) dunObj.style.display = 'block';
        if (dunParty) dunParty.style.display = 'flex';
        initDungeonMode();
    } else {
        clearDungeonState();
        enemies.forEach(e => scene.remove(e.mesh));
        enemies.length = 0;
        items.forEach(i => scene.remove(i.mesh));
        items.length = 0;
        projectiles.forEach(p => scene.remove(p.mesh));
        projectiles.length = 0;
        shrines.forEach(s => scene.remove(s.group));
        shrines.length = 0;
        chests.forEach(c => scene.remove(c.group));
        chests.length = 0;
        clearSpellEntities();

        const waveHUD = document.getElementById('hud-top-center');
        const dunObj = document.getElementById('hud-dungeon-obj');
        const dunParty = document.getElementById('hud-dungeon-party');
        if (waveHUD) waveHUD.style.display = 'block';
        if (dunObj) dunObj.style.display = 'none';
        if (dunParty) dunParty.style.display = 'none';
        updateWaveHUD();
        playerMesh.position.set(0, 1, 0);
    }

    if (roomCode) {
        initMultiplayer(roomCode, heroName);
    }

    camera.position.set(playerMesh.position.x, 60, playerMesh.position.z + 35);
    camera.lookAt(playerMesh.position);

    GAME.state = 'PLAYING';
    lastTime = performance.now();
};

window.resumeGame = function() {
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('skill-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';
    GAME.state = 'PLAYING';
    lastTime = performance.now();
    updateGUI();
};

function triggerLevelUp() {
    SFX.levelUp();
    GAME.state = 'LEVEL_UP';
    document.getElementById('skill-screen').style.display = 'flex';
    generateSkillOptions();
}

// --- COMPANION & PERIODIC SPELL STATE ---
const activeOrbitMeshes = [];
const groundTraps = [];
const SKILL_TIMERS = { meteor: 0, nova: 0, sniper: 0, trap: 0, thunder: 0, orbitAngle: 0 };

function clearSpellEntities() {
    activeOrbitMeshes.forEach(m => scene.remove(m));
    activeOrbitMeshes.length = 0;
    groundTraps.forEach(t => scene.remove(t.mesh));
    groundTraps.length = 0;
}

function generateSkillOptions() {
    const classSkills = CLASSES[PLAYER.class].skills;
    let pool = [];
    
    classSkills.forEach(s => {
        const owned = PLAYER.skills.find(ps => ps.id === s.id);
        const lvl = owned ? owned.level : 0;
        if (lvl >= s.max) return; 
        
        if (PLAYER.activeSkillIds.length < 5) {
            pool.push({ ...s, nextLvl: lvl + 1 });
        } else {
            if (owned) pool.push({ ...s, nextLvl: lvl + 1 });
        }
    });

    if (pool.length === 0) {
        GAME.gold += 500;
        logMessage("Max Power! +500 Gold", "gold");
        resumeGame(); 
        return;
    }

    pool.sort(() => 0.5 - Math.random());
    const choices = pool.slice(0, 3);
    
    const container = document.getElementById('skill-options');
    container.innerHTML = '';
    
    choices.forEach(c => {
        const div = document.createElement('div');
        div.className = 'skill-card';
        div.innerHTML = `
            <h2>${c.name}</h2>
            <div class="level">Level ${c.nextLvl}</div>
            <p>${c.desc}</p>
        `;
        div.onclick = () => selectSkill(c.id);
        container.appendChild(div);
    });
}

function selectSkill(id) {
    let sk = PLAYER.skills.find(s => s.id === id);
    if (sk) {
        sk.level++;
    } else {
        PLAYER.skills.push({ id: id, level: 1 });
        PLAYER.activeSkillIds.push(id);
    }
    
    updateEffects();
    updateGUI();
    resumeGame(); 
}

function updateEffects() {
    const base = CLASSES[PLAYER.class];

    EFFECTS.projCount = 1; EFFECTS.projPierce = 1; EFFECTS.projRadius = 1;
    EFFECTS.fireRateMult = INRUN.fireRateMult * (BUFFS.swiftness > 0 ? 1.5 : 1.0); 
    EFFECTS.moveSpeedMult = INRUN.speedMult * PERM.speedMult * (BUFFS.swiftness > 0 ? 1.6 : 1.0);
    EFFECTS.auraDamage = 0; EFFECTS.homing = 0;

    let skillLifesteal = 0;
    let dmgBonus = 0;
    let hpBonus = 0;
    let bonusShield = 0;
    
    PLAYER.skills.forEach(s => {
        const lvl = s.level;
        switch(s.id) {
            // Mage Skills
            case 'm1': EFFECTS.projRadius += lvl * 0.8; dmgBonus += lvl * 5; break;
            case 'm2': EFFECTS.projCount += lvl; break;
            case 'm3': EFFECTS.auraDamage += lvl * 12; break;
            case 'm4': EFFECTS.homing += lvl * 0.55; break;
            case 'm5': EFFECTS.moveSpeedMult += lvl * 0.15; EFFECTS.fireRateMult += lvl * 0.20; break;
            case 'm6': skillLifesteal += lvl * 5; break;
            case 'm7': break; // Chain lightning proc on hit
            case 'm8': break; // Meteor shower periodic
            case 'm9': break; // Arcane Orbiters
            case 'm10': EFFECTS.projPierce += lvl * 2; break; // Glacier spear
            case 'm11': break; // Mana siphon
            case 'm12': break; // Prismatic nova
            
            // Archer Skills
            case 'a1': EFFECTS.projCount += lvl * 2; break;
            case 'a2': EFFECTS.projPierce += lvl * 2; break;
            case 'a3': EFFECTS.fireRateMult += lvl * 0.35; break;
            case 'a4': EFFECTS.projRadius += lvl * 0.3; dmgBonus += lvl * 8; break;
            case 'a5': EFFECTS.moveSpeedMult += lvl * 0.25; break;
            case 'a6': hpBonus += lvl * 20; skillLifesteal += lvl * 3; break;
            case 'a7': break; // Explosive cluster on hit
            case 'a8': break; // Ricochet on hit
            case 'a9': break; // Poison caltrops
            case 'a10': break; // Phantom daggers in fire
            case 'a11': break; // Deadly precision in rollDamage
            case 'a12': break; // Sniper ballista
            
            // Warrior Skills
            case 'w1': EFFECTS.projRadius += lvl * 1.5; dmgBonus += lvl * 6; break;
            case 'w2': EFFECTS.auraDamage += lvl * 18; break;
            case 'w3': skillLifesteal += lvl * 10; break;
            case 'w4': hpBonus += lvl * 40; break;
            case 'w5': EFFECTS.projPierce += lvl * 3; EFFECTS.projRadius += lvl * 0.4; break;
            case 'w6': EFFECTS.fireRateMult += lvl * 0.3; break;
            case 'w7': break; // Orbiting battleaxes
            case 'w8': break; // Earth fissure on hit
            case 'w9': bonusShield += lvl * 40; break; // Spiked Barrier
            case 'w10': break; // Flame cleave burn
            case 'w11': break; // Berserker wrath
            case 'w12': break; // Thunder clap
        }
    });

    // Orbiting Companions Management
    const m9Lvl = (PLAYER.skills.find(s => s.id === 'm9') || {level:0}).level;
    const w7Lvl = (PLAYER.skills.find(s => s.id === 'w7') || {level:0}).level;
    
    if (m9Lvl > 0 && PLAYER.class === 'Mage') {
        if (activeOrbitMeshes.length === 0) {
            for (let i = 0; i < 2; i++) {
                const crystalGeo = new THREE.OctahedronGeometry(0.7);
                const crystalMat = new THREE.MeshStandardMaterial({
                    color: 0x38bdf8,
                    emissive: 0x0284c7,
                    emissiveIntensity: 0.8,
                    roughness: 0.2
                });
                const mesh = new THREE.Mesh(crystalGeo, crystalMat);
                scene.add(mesh);
                activeOrbitMeshes.push(mesh);
            }
        }
    } else if (w7Lvl > 0 && PLAYER.class === 'Warrior') {
        if (activeOrbitMeshes.length === 0) {
            for (let i = 0; i < 2; i++) {
                const axeGeo = new THREE.BoxGeometry(0.3, 1.8, 1.0);
                const axeMat = new THREE.MeshStandardMaterial({
                    color: 0xf87171,
                    emissive: 0xdc2626,
                    emissiveIntensity: 0.5,
                    roughness: 0.3,
                    metalness: 0.8
                });
                const mesh = new THREE.Mesh(axeGeo, axeMat);
                scene.add(mesh);
                activeOrbitMeshes.push(mesh);
            }
        }
    } else {
        activeOrbitMeshes.forEach(m => scene.remove(m));
        activeOrbitMeshes.length = 0;
    }

    if (bonusShield > 0 && GAME.shield < bonusShield) {
        GAME.shield = Math.max(GAME.shield, bonusShield);
    }

    EFFECTS.lifesteal = skillLifesteal + PERM.lifesteal;
    PLAYER.damage = Math.round((base.baseDamage + dmgBonus) * PERM.damageMult * INRUN.damageMult);

    const oldMaxHp = PLAYER.maxHp;
    PLAYER.maxHp = base.baseHp + PERM.hpBonus + hpBonus;
    const delta = PLAYER.maxHp - oldMaxHp;
    if (delta > 0) PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + delta);
    PLAYER.hp = Math.min(PLAYER.hp, PLAYER.maxHp);

    const list = document.getElementById('ui-skills-list');
    if (list) {
        list.innerHTML = '';
        PLAYER.skills.forEach(s => {
            const def = CLASSES[PLAYER.class].skills.find(x => x.id === s.id);
            if (def) {
                list.innerHTML += `<div class="active-skill-item">${def.name} (Lvl ${s.level})</div>`;
            }
        });
        if (PLAYER.skills.length === 0) {
            list.innerHTML = '<div style="color:#94a3b8; font-size:0.75rem;">No skills learned yet.</div>';
        }
    }
    const countEl = document.getElementById('ui-skill-count');
    if (countEl) countEl.innerText = PLAYER.skills.length;
}

// --- PROJECTILE CLASS ---
class Projectile {
    constructor(pos, dir, isSpecial = false, customColor = null, customSpeed = null, customLife = null) {
        const color = customColor || CLASSES[PLAYER.class].color;
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: color }));
        
        const r = EFFECTS.projRadius;
        if(PLAYER.class === 'Mage') this.mesh.scale.set(r, r, r);
        if(PLAYER.class === 'Archer') this.mesh.scale.set(0.25*r, 0.25*r, 1.6);
        if(PLAYER.class === 'Warrior') this.mesh.scale.set(4*r, 0.15, 1.2*r); 
        
        this.mesh.position.copy(pos);
        this.dir = dir.normalize();
        
        this.speed = customSpeed || (PLAYER.class === 'Archer' ? 100 : (PLAYER.class === 'Warrior' ? 44 : 64));
        this.life = customLife || (PLAYER.class === 'Warrior' ? 0.65 : 2.5);
        this.pierce = EFFECTS.projPierce;
        this.hitEnemies = new Set();
        this.isSpecial = isSpecial;
        
        scene.add(this.mesh);
        projectiles.push(this);
    }

    update(dt) {
        if (EFFECTS.homing > 0 && enemies.length > 0) {
            let closest = null; let minDist = 40;
            enemies.forEach(e => {
                const d = this.mesh.position.distanceTo(e.mesh.position);
                if(d < minDist) { minDist = d; closest = e; }
            });
            if (closest) {
                const targetDir = new THREE.Vector3().subVectors(closest.mesh.position, this.mesh.position).normalize();
                this.dir.lerp(targetDir, EFFECTS.homing * dt * 5).normalize();
            }
        }

        this.mesh.position.addScaledVector(this.dir, this.speed * dt);
        if(PLAYER.class === 'Warrior') this.mesh.rotation.y += dt * 15;
        else this.mesh.lookAt(this.mesh.position.clone().add(this.dir));
        
        this.life -= dt;
        
        const pPos = this.mesh.position;
        const effectiveRadius = (PLAYER.class === 'Warrior' ? 2.2 : 0.6) * EFFECTS.projRadius;

        // Collision with Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (this.hitEnemies.has(enemy)) continue;

            const ePos = enemy.mesh.position;
            const distXZ = Math.hypot(pPos.x - ePos.x, pPos.z - ePos.z);
            
            if (distXZ < enemy.hitRadius + effectiveRadius + 0.8) {
                if (pPos.y >= ePos.y - 1.0 && pPos.y <= ePos.y + (enemy.height || 2) + 1.0) {
                    
                    let { dmg, isCrit } = rollDamage();
                    
                    // Berserker Wrath (Warrior w11)
                    if (PLAYER.class === 'Warrior') {
                        const w11 = (PLAYER.skills.find(s => s.id === 'w11') || {level:0}).level;
                        if (w11 > 0) {
                            const lowHpBonus = Math.max(0, 1 - (PLAYER.hp / PLAYER.maxHp)) * (0.2 * w11);
                            dmg = Math.round(dmg * (1 + lowHpBonus));
                        }
                    }

                    // Mana Power (Mage)
                    if (PLAYER.class === 'Mage' && PLAYER.mana >= PLAYER.maxMana * 0.75) {
                        dmg = Math.round(dmg * 1.25);
                    }

                    SFX.hit();
                    
                    if (IS_MULTIPLAYER) {
                        WS.send(JSON.stringify({ type: 'HIT_ENEMY', enemyId: enemy.id, damage: dmg }));
                        createImpact(pPos, isCrit ? 0xfde047 : CLASSES[PLAYER.class].color);
                    } else {
                        enemy.takeDamage(dmg, isCrit);
                        createImpact(pPos, isCrit ? 0xfde047 : CLASSES[PLAYER.class].color);
                    }
                    if (isCrit) {
                        SFX.crit();
                        logMessage('CRITICAL HIT!', '#fde047');
                    }

                    // Mana Siphon (Mage m11)
                    if (PLAYER.class === 'Mage') {
                        const m11 = (PLAYER.skills.find(s => s.id === 'm11') || {level:0}).level;
                        const restoreAmt = 4 + m11 * 3;
                        PLAYER.mana = Math.min(PLAYER.maxMana, PLAYER.mana + restoreAmt);
                        updateGUI();
                    }

                    // Glacier Spear Chill/Freeze (Mage m10)
                    const m10 = (PLAYER.skills.find(s => s.id === 'm10') || {level:0}).level;
                    if (m10 > 0 && PLAYER.class === 'Mage') {
                        enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 1.5 + m10 * 0.5);
                        spawnFloatingText(ePos, '❄️ CHILLED', '#67e8f9', 14, false);
                    }

                    // Chain Lightning (Mage m7)
                    const m7 = (PLAYER.skills.find(s => s.id === 'm7') || {level:0}).level;
                    if (m7 > 0 && PLAYER.class === 'Mage' && !this.isSpecial) {
                        const maxArcs = 1 + m7;
                        let arced = 0;
                        enemies.forEach(other => {
                            if (other !== enemy && other.hp > 0 && arced < maxArcs) {
                                const d = ePos.distanceTo(other.mesh.position);
                                if (d <= 22) {
                                    const arcDmg = Math.round(dmg * 0.65);
                                    other.takeDamage(arcDmg, false, '⚡ LIGHTNING');
                                    createImpact(other.mesh.position, 0x67e8f9);
                                    arced++;
                                }
                            }
                        });
                        if (arced > 0) SFX.crit();
                    }

                    // Explosive Cluster (Archer a7)
                    const a7 = (PLAYER.skills.find(s => s.id === 'a7') || {level:0}).level;
                    if (a7 > 0 && PLAYER.class === 'Archer' && !this.isSpecial) {
                        const clusterDmg = Math.round(15 + a7 * 10);
                        createImpact(pPos, 0xf97316);
                        enemies.forEach(other => {
                            if (other !== enemy && other.hp > 0 && pPos.distanceTo(other.mesh.position) <= 9) {
                                other.takeDamage(clusterDmg, false, '💥 SHRAPNEL');
                            }
                        });
                    }

                    // Ricochet (Archer a8)
                    const a8 = (PLAYER.skills.find(s => s.id === 'a8') || {level:0}).level;
                    if (a8 > 0 && PLAYER.class === 'Archer' && this.pierce > 0) {
                        let nextTarget = null; let minDist = 25;
                        enemies.forEach(other => {
                            if (other !== enemy && !this.hitEnemies.has(other) && other.hp > 0) {
                                const d = pPos.distanceTo(other.mesh.position);
                                if (d < minDist) { minDist = d; nextTarget = other; }
                            }
                        });
                        if (nextTarget) {
                            this.dir = new THREE.Vector3().subVectors(nextTarget.mesh.position, pPos).normalize();
                            this.life = 1.2;
                        }
                    }

                    // Earth Fissure Knockback (Warrior w8)
                    const w8 = (PLAYER.skills.find(s => s.id === 'w8') || {level:0}).level;
                    if (w8 > 0 && PLAYER.class === 'Warrior') {
                        const pushDir = this.dir.clone().normalize();
                        enemy.mesh.position.addScaledVector(pushDir, 4 + w8 * 1.5);
                        enemies.forEach(other => {
                            if (other !== enemy && pPos.distanceTo(other.mesh.position) <= 7) {
                                other.takeDamage(Math.round(dmg * 0.4), false, '🪨 CRUSH');
                                other.mesh.position.addScaledVector(pushDir, 3);
                            }
                        });
                    }

                    // Flame Cleave Burn (Warrior w10)
                    const w10 = (PLAYER.skills.find(s => s.id === 'w10') || {level:0}).level;
                    if (w10 > 0 && PLAYER.class === 'Warrior') {
                        enemy.burnTimer = 3.0;
                        enemy.burnDmg = 8 + w10 * 6;
                    }
                    
                    this.hitEnemies.add(enemy);
                    this.pierce--;
                    if (this.pierce <= 0) {
                        this.life = 0;
                        break;
                    }
                }
            }
        }

        // Collision with Treasure Chests
        if (this.life > 0) {
            for (let i = chests.length - 1; i >= 0; i--) {
                const chest = chests[i];
                if (chest.destroyed) continue;
                const distXZ = Math.hypot(pPos.x - chest.x, pPos.z - chest.z);
                if (distXZ < chest.radius + effectiveRadius + 0.6) {
                    const { dmg } = rollDamage();
                    chest.takeDamage(dmg);
                    this.life = 0;
                    break;
                }
            }
        }
    }
    destroy() { scene.remove(this.mesh); }
}

function attemptFire() {
    if (GAME.isDowned) return;
    if (PLAYER.fireCooldown > 0) return;
    if (PLAYER.class === 'Mage' && PLAYER.mana < 4) return;
    
    if (PLAYER.class === 'Mage') PLAYER.mana -= 4;
    
    const baseCooldown = PLAYER.class === 'Archer' ? 0.15 : (PLAYER.class === 'Warrior' ? 0.35 : 0.25);
    PLAYER.fireCooldown = baseCooldown / EFFECTS.fireRateMult;

    playerMesh.updateMatrixWorld(true);
    weaponGroup.updateMatrixWorld(true);

    const dir = new THREE.Vector3();
    playerMesh.getWorldDirection(dir);

    const startPos = new THREE.Vector3();
    weaponGroup.getWorldPosition(startPos);

    if (startPos.distanceTo(playerMesh.position) > 8 || isNaN(startPos.x)) {
        startPos.copy(playerMesh.position);
        startPos.y += 1.0;
        startPos.addScaledVector(dir, 0.8);
    }

    const count = EFFECTS.projCount;
    const spread = 0.15;
    
    for(let i=0; i<count; i++) {
        const offsetDir = dir.clone();
        if(count > 1) {
            offsetDir.x += (Math.random() - 0.5) * spread * count;
            offsetDir.z += (Math.random() - 0.5) * spread * count;
        }
        new Projectile(startPos.clone(), offsetDir);
    }

    // Phantom Daggers (Archer a10)
    const a10 = (PLAYER.skills.find(s => s.id === 'a10') || {level:0}).level;
    if (a10 > 0 && PLAYER.class === 'Archer' && Math.random() < 0.4) {
        const daggerCount = 3 + a10;
        for (let k = 0; k < daggerCount; k++) {
            const angle = (k / daggerCount) * Math.PI * 2 + Math.random() * 0.2;
            const daggerDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            new Projectile(startPos.clone(), daggerDir, true, 0xa7f3d0, 90, 1.2);
        }
    }

    SFX.shoot(PLAYER.class);

    weaponGroup.position.z -= 0.5; 
    setTimeout(() => { if(GAME.state === 'PLAYING') weaponGroup.position.z += 0.5; }, Math.min(100, (baseCooldown*1000)/2));
    updateGUI();
}

// --- ENEMY ASSETS & CLASS ---
const geoOrc = new THREE.BoxGeometry(2.0, 3.5, 2.0);
const matOrc = new THREE.MeshStandardMaterial({ color: 0x4a7a59 });
const geoSlime = new THREE.SphereGeometry(1.5, 8, 8);
const matSlime = new THREE.MeshStandardMaterial({ color: 0x8a2be2 });
const geoCube = new THREE.BoxGeometry(1.0, 1.0, 1.0);
const matCube = new THREE.MeshStandardMaterial({ color: 0x00a8ff });
const geoBoss = new THREE.BoxGeometry(4.0, 6.0, 4.0);
const matBoss = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x7f1d1d });

class Enemy {
    constructor(x, z, typeHint) {
        let type = typeHint || 'bluecube';
        this.type = type;
        this.isBoss = false;
        this.stunTimer = 0;
        this.freezeTimer = 0;

        if (type.startsWith('boss_')) {
            this.isBoss = true;
            this.mesh = new THREE.Mesh(geoBoss, matBoss);
            this.hitRadius = 3.0; this.height = 6.0;
            this.hp = 500 + GAME.wave * 150;
            this.maxHp = this.hp;
            this.speed = 8.5;
            this.damage = 25 + GAME.wave * 2;
            this.mesh.position.y = 3.0;
            this.name = type === 'boss_slimeking' ? 'King Slime' : (type === 'boss_necromancer' ? 'Malakar the Void Lich' : 'Gorgar the Orc Warlord');
        } else if (type === 'orc') {
            this.mesh = new THREE.Mesh(geoOrc, matOrc);
            this.hitRadius = 1.6; this.height = 3.5;
            this.hp = 70 + GAME.wave * 15;
            this.maxHp = this.hp;
            this.speed = 8.5;
            this.damage = 18;
            this.mesh.position.y = 1.75;
        } else if (type === 'slime') {
            this.mesh = new THREE.Mesh(geoSlime, matSlime);
            this.hitRadius = 1.3; this.height = 2;
            this.hp = 35 + GAME.wave * 8;
            this.maxHp = this.hp;
            this.speed = 11;
            this.damage = 12;
            this.mesh.position.y = 1.5;
        } else {
            this.mesh = new THREE.Mesh(geoCube, matCube);
            this.hitRadius = 0.8; this.height = 1.0;
            this.hp = 15 + GAME.wave * 5;
            this.maxHp = this.hp;
            this.speed = 15;
            this.damage = 6;
            this.mesh.position.y = 0.5;
        }

        this.mesh.position.x = x;
        this.mesh.position.z = z;
        
        scene.add(this.mesh);
        enemies.push(this);
    }

    update(dt, playerPos) {
        if (GAME.isDowned) return;

        // Dungeon Mob Aggro Check
        if (this.isDungeonMob && !this.isAggroed) {
            return; // Idle in formation until aggroed
        }

        // Status Effects (Stun & Freeze)
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.mesh.rotation.y += dt * 8;
            return;
        }
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            return;
        }

        // Burning DoT (Warrior w10)
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.takeDamage((this.burnDmg || 12) * dt, false);
            if (Math.random() < 0.25) createImpact(this.mesh.position, 0xf97316);
        }

        // Dynamic Target Selection: Player or Nearest Companion
        let targetPos = playerPos;
        let targetCompanion = null;
        let minTargetDist = this.mesh.position.distanceTo(playerPos);

        if (this.isDungeonMob && raidCompanions.length > 0) {
            raidCompanions.forEach(c => {
                if (!c.isDowned) {
                    const d = this.mesh.position.distanceTo(c.mesh.position);
                    // Tanks get higher aggro weight
                    const weightedDist = c.role === 'Tank' ? d * 0.75 : d;
                    if (weightedDist < minTargetDist) {
                        minTargetDist = weightedDist;
                        targetPos = c.mesh.position;
                        targetCompanion = c;
                    }
                }
            });
        }

        const dir = new THREE.Vector3(targetPos.x - this.mesh.position.x, 0, targetPos.z - this.mesh.position.z);
        const dist = dir.length();
        dir.normalize();

        if (dist > this.hitRadius + 1.0) {
            this.mesh.position.addScaledVector(dir, this.speed * dt);
            this.mesh.lookAt(targetPos.x, this.mesh.position.y, targetPos.z);
        } else {
            if (targetCompanion) {
                // Attack Companion
                targetCompanion.takeDamage(this.damage);
                this.takeDamage(9999, false);
                return;
            }

            if (PLAYER.invulnerableTimer && PLAYER.invulnerableTimer > 0) {
                // Invulnerable during dash, ultimate or purifying ward
                return;
            }
            let rawDmg = this.damage;
            if (PERM.damageReduction > 0) {
                rawDmg = Math.max(1, rawDmg - PERM.damageReduction);
            }
            let dmg = rawDmg;
            if (GAME.shield > 0) {
                const absorb = Math.min(GAME.shield, dmg);
                GAME.shield -= absorb;
                dmg -= absorb;
            }
            if (dmg > 0) {
                PLAYER.hp -= dmg;
                spawnFloatingText(playerMesh.position, `-${Math.round(dmg)}`, '#ef4444', 16, true);
                showDamageVignette();
                checkPlayerDeath();
            }

            // Spiked Barrier (Warrior w9) Thorns damage
            if (PLAYER.class === 'Warrior') {
                const w9 = (PLAYER.skills.find(s => s.id === 'w9') || {level:0}).level;
                if (w9 > 0) {
                    const reflect = Math.round(rawDmg * (0.8 + w9 * 0.4));
                    this.takeDamage(reflect, false, '🛡️ THORNS');
                }
            }

            updateGUI();
            this.takeDamage(9999, false); 
        }

        if (EFFECTS.auraDamage > 0 && dist < 12) {
            if (IS_MULTIPLAYER) {
                WS.send(JSON.stringify({ type: 'HIT_ENEMY', enemyId: this.id, damage: EFFECTS.auraDamage * dt }));
            } else {
                this.takeDamage(EFFECTS.auraDamage * dt, false);
            }
        }
    }

    takeDamage(amt, isCrit = false, textLabel = null) {
        if (this.isDungeonMob && !this.isAggroed) {
            this.isAggroed = true;
            enemies.forEach(other => {
                if (other.isDungeonMob && other.chamberIdx === this.chamberIdx) {
                    other.isAggroed = true;
                }
            });
        }

        this.hp -= amt;
        spawnFloatingText(this.mesh.position, textLabel || Math.round(amt), isCrit ? '#fbbf24' : '#ffffff', isCrit ? 18 : 14, isCrit);

        if (this.hp <= 0) {
            scene.remove(this.mesh);
            createImpact(this.mesh.position, this.mesh.material.color ? this.mesh.material.color.getHex() : 0xffffff);
            
            PLAYER.exp += this.isBoss ? 100 : (this.type === 'orc' ? 18 : (this.type === 'slime' ? 12 : 6));
            GAME.score += this.isBoss ? 200 : 10;
            GAME.kills++;
            GAME.enemiesKilled++;

            trackQuestProgress('kills', 1);
            if (this.isBoss) trackQuestProgress('boss', 1);
            if (this.type === 'orc' || this.type === 'slime') trackQuestProgress('elites', 1);
            
            if (EFFECTS.lifesteal > 0) {
                PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + EFFECTS.lifesteal);
                spawnFloatingText(playerMesh.position, `+${Math.round(EFFECTS.lifesteal)} HP`, '#22c55e', 14, false, '💚');
            }

            if (this.isDungeonMob) {
                // Dungeon Loot Drop System
                const lootChance = this.isBoss ? 1.0 : (this.isMiniBoss ? 1.0 : 0.38);
                if (Math.random() < lootChance) {
                    spawnDungeonLootDrop(this.mesh.position.x, this.mesh.position.z, this.type, this.isBoss || this.isMiniBoss);
                }
                new Item(this.mesh.position.x, this.mesh.position.z, 'gold');
                if (Math.random() < 0.25) new Item(this.mesh.position.x + 1, this.mesh.position.z, 'health');
            } else if (!IS_MULTIPLAYER) {
                const dropRate = 0.28 + PERM.dropBonus;
                if (Math.random() < dropRate || this.isBoss) {
                    new Item(this.mesh.position.x, this.mesh.position.z);
                }
                if (this.isBoss) {
                    new Item(this.mesh.position.x + 2, this.mesh.position.z, 'gold');
                    new Item(this.mesh.position.x - 2, this.mesh.position.z, 'gold');
                }
                if (PLAYER.class === 'Mage' && Math.random() < 0.35) {
                    new Item(this.mesh.position.x, this.mesh.position.z, 'mana');
                }
            }
            
            checkLevelUp();
            updateGUI();
            if (GAME.mode === 'dungeon') {
                // Dungeon progress handled by updateDungeon
            } else {
                updateWaveHUD();
            }
        }
    }
}

// --- ITEM CLASS ---
class Item {
    constructor(x, z, typeHint) {
        const r = Math.random();
        let geo;
        
        let type = typeHint;
        if (!type) {
            if(r < 0.20) type = 'health';
            else if(r < 0.35 && PLAYER.class === 'Mage') type = 'mana';
            else if(r < 0.60) type = 'gold';
            else if(r < 0.70) type = 'maxhp';
            else if(r < 0.80) type = 'magnet';
            else if(r < 0.90) type = 'bomb';
            else type = 'gold';
        }
        this.type = type;

        if (type === 'health') { this.color = 0xef4444; geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); }
        else if (type === 'mana') { this.color = 0x38bdf8; geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); }
        else if (type === 'maxhp') { this.color = 0xec4899; geo = new THREE.OctahedronGeometry(0.5); }
        else if (type === 'magnet') { this.color = 0xa855f7; geo = new THREE.TorusGeometry(0.4, 0.2, 8, 16); }
        else if (type === 'bomb') { this.color = 0xf97316; geo = new THREE.SphereGeometry(0.6, 8, 8); }
        else { this.type = 'gold'; this.color = 0xfbbf24; geo = new THREE.TorusGeometry(0.4, 0.1, 8, 16); }

        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: this.color }));
        this.mesh.position.set(x, 1, z);
        this.magnetized = false;
        
        scene.add(this.mesh);
        items.push(this);
    }

    update(dt, playerPos) {
        this.mesh.rotation.y += dt * 3;
        if(this.type === 'maxhp') this.mesh.rotation.x += dt * 2;
        
        if (this.magnetized) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            this.mesh.position.addScaledVector(dir, 85 * dt);
        }

        if (this.mesh.position.distanceTo(playerPos) < PERM.pickupRadius) {
            if (IS_MULTIPLAYER && this.id) {
                WS.send(JSON.stringify({ type: 'COLLECT_ITEM', itemId: this.id }));
            } else {
                applyItemEffect(this.type);
            }
            scene.remove(this.mesh);
            this.life = -1;
        }
    }
}

function applyItemEffect(type) {
    if(type === 'health') { 
        PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 50); 
        SFX.item(); 
        logMessage("+50 HP", "#ef4444"); 
    }
    if(type === 'mana') { 
        PLAYER.mana = Math.min(PLAYER.maxMana, PLAYER.mana + 50); 
        SFX.item(); 
        logMessage("+50 Mana", "#38bdf8"); 
    }
    if(type === 'gold') { 
        const g = Math.round(15 * PERM.goldMult); 
        GAME.gold += g; 
        trackQuestProgress('gold', g);
        SFX.coin(); 
        logMessage("+" + g + " Gold", "#fbbf24"); 
    }
    if(type === 'maxhp') { 
        PLAYER.maxHp += 20; 
        PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + 40); 
        SFX.item(); 
        logMessage("MAX HP UP!", "#ec4899"); 
    }
    if(type === 'magnet') { 
        triggerMagnet(); 
        SFX.item(); 
        logMessage("MAGNET ACTIVE!", "#a855f7"); 
    }
    if(type === 'bomb') { 
        triggerBomb(); 
        SFX.bomb(); 
        logMessage("TACTICAL NUKE!", "#f97316"); 
    }
    updateGUI();
}

function triggerMagnet() {
    items.forEach(i => { if(i.life !== -1) i.magnetized = true; });
}

function triggerBomb() {
    const v = document.getElementById('damage-vignette');
    v.style.background = 'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(251,191,36,0.5) 100%)';
    v.style.opacity = 1;
    setTimeout(() => { 
        v.style.opacity = 0; 
        setTimeout(() => { v.style.background = 'radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(239,68,68,0.5) 100%)'; }, 200);
    }, 300);

    if (IS_MULTIPLAYER) {
        WS.send(JSON.stringify({ type: 'BOMB' }));
    } else {
        enemies.forEach(e => { e.takeDamage(1200 + PLAYER.damage * 10); });
    }
}

let logTimeout;
function logMessage(text, color) {
    const logEl = document.getElementById('item-log');
    if (!logEl) return;
    logEl.style.color = color;
    logEl.innerText = text;
    logEl.style.opacity = 1;
    clearTimeout(logTimeout);
    logTimeout = setTimeout(() => { logEl.style.opacity = 0; }, 1600);
}

function checkLevelUp() {
    if (PLAYER.exp >= PLAYER.expNeeded) {
        PLAYER.level++;
        PLAYER.exp -= PLAYER.expNeeded;
        PLAYER.expNeeded = Math.floor(PLAYER.expNeeded * 1.45);
        triggerLevelUp();
    }
}

function showDamageVignette() {
    const v = document.getElementById('damage-vignette');
    if (!v) return;
    v.style.opacity = 1;
    setTimeout(() => { v.style.opacity = 0; }, 200);
}

function createImpact(pos, color) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshBasicMaterial({ color: color }));
    p.position.copy(pos);
    scene.add(p);
    setTimeout(() => scene.remove(p), 150); 
}

function updateGUI() {
    document.getElementById('ui-hp').innerText = Math.floor(PLAYER.hp) + (GAME.shield > 0 ? ` (+${GAME.shield})` : '');
    document.getElementById('ui-maxhp').innerText = PLAYER.maxHp;
    document.getElementById('hp-bar').style.width = (PLAYER.hp / PLAYER.maxHp * 100) + '%';
    
    document.getElementById('ui-mana').innerText = Math.floor(PLAYER.mana);
    document.getElementById('ui-maxmana').innerText = PLAYER.maxMana;
    document.getElementById('mana-bar').style.width = (PLAYER.mana / PLAYER.maxMana * 100) + '%';
    
    document.getElementById('ui-exp').innerText = PLAYER.exp;
    document.getElementById('ui-exp-needed').innerText = PLAYER.expNeeded;
    document.getElementById('exp-bar').style.width = (PLAYER.exp / PLAYER.expNeeded * 100) + '%';
    
    document.getElementById('ui-level').innerText = PLAYER.level;
    document.getElementById('ui-gold').innerText = GAME.gold;
    document.getElementById('ui-score').innerText = GAME.score;
    document.getElementById('ui-kills').innerText = GAME.kills;

    const shopGold = document.getElementById('shop-gold');
    if (shopGold) shopGold.innerText = GAME.gold;

    // Ultimate Ability Meter & Button Feedback
    const ultPct = Math.min(100, Math.max(0, ((PLAYER.ultMaxCooldown - PLAYER.ultCooldown) / PLAYER.ultMaxCooldown) * 100));
    const ultBar = document.getElementById('ult-bar');
    const ultStatus = document.getElementById('ui-ult-status');
    const ultBox = document.getElementById('ult-box');
    const mobileUltBtn = document.getElementById('btn-ultimate-mobile');
    const mobileUltCd = document.getElementById('mobile-ult-cd');

    if (ultBar) ultBar.style.width = ultPct + '%';
    if (PLAYER.ultCooldown <= 0) {
        if (ultStatus) { ultStatus.innerText = 'READY! [SPACE]'; ultStatus.style.color = '#34d399'; }
        if (ultBox) ultBox.classList.add('ult-ready-glow');
        if (mobileUltBtn) mobileUltBtn.classList.add('ready');
        if (mobileUltCd) mobileUltCd.innerText = 'READY';
    } else {
        if (ultStatus) { ultStatus.innerText = `${Math.ceil(PLAYER.ultCooldown)}s`; ultStatus.style.color = '#fde047'; }
        if (ultBox) ultBox.classList.remove('ult-ready-glow');
        if (mobileUltBtn) mobileUltBtn.classList.remove('ready');
        if (mobileUltCd) mobileUltCd.innerText = `${Math.ceil(PLAYER.ultCooldown)}s`;
    }
}

function gameOver() {
    GAME.state = 'GAME_OVER';
    const banked = GAME.gold;
    SAVE.essence += banked;
    writeSave();

    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('go-wave').innerText = GAME.wave;
    document.getElementById('go-level').innerText = PLAYER.level;
    document.getElementById('go-score').innerText = GAME.score;
    document.getElementById('go-kills').innerText = GAME.kills;
    document.getElementById('go-gold-banked').innerText = banked;
    document.getElementById('go-essence').innerText = SAVE.essence;
}

// --- SOLO WAVE SPAWNER ---
function spawnSoloWaveEnemy() {
    const playerPos = playerMesh.position;
    const angle = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 35; 
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;

    if (GAME.isBossWave && !GAME.bossSpawned && GAME.enemiesSpawned >= Math.floor(GAME.totalWaveEnemies * 0.4)) {
        GAME.bossSpawned = true;
        let type = 'boss_warlord';
        if (GAME.wave === 10) type = 'boss_slimeking';
        else if (GAME.wave >= 15) type = 'boss_necromancer';
        new Enemy(x, z, type);
        SFX.bossRoar();
        GAME.enemiesSpawned++;
    } else {
        const r = Math.random();
        let type = 'bluecube';
        if (GAME.wave >= 2 && r < 0.35) type = 'slime';
        else if (GAME.wave >= 3 && r < 0.70) type = 'orc';
        new Enemy(x, z, type);
        GAME.enemiesSpawned++;
    }
}

// --- MINIMAP LOGIC ---
let minimapCtx = null;
function initMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if(canvas) {
        canvas.width = 145;
        canvas.height = 145;
        minimapCtx = canvas.getContext('2d');
    }
}

function drawMinimap() {
    if(!minimapCtx) return;
    minimapCtx.clearRect(0, 0, 145, 145);
    
    const mapScale = 0.16;
    const cx = 72.5;
    const cy = 72.5;
    
    const pX = playerMesh.position.x;
    const pZ = playerMesh.position.z;

    // Draw shrines (colored diamonds)
    shrines.forEach(s => {
        if (!s.active) return;
        const x = cx + (s.x - pX) * mapScale;
        const z = cy + (s.z - pZ) * mapScale;
        if(x >= 2 && x <= 143 && z >= 2 && z <= 143) {
            minimapCtx.fillStyle = s.colorHex || '#10b981';
            minimapCtx.beginPath();
            minimapCtx.moveTo(x, z - 4.5);
            minimapCtx.lineTo(x + 4.5, z);
            minimapCtx.lineTo(x, z + 4.5);
            minimapCtx.lineTo(x - 4.5, z);
            minimapCtx.closePath();
            minimapCtx.fill();
            minimapCtx.strokeStyle = '#ffffff';
            minimapCtx.lineWidth = 1;
            minimapCtx.stroke();
        }
    });

    // Draw chests (gold boxes)
    chests.forEach(c => {
        if (c.destroyed) return;
        const x = cx + (c.x - pX) * mapScale;
        const z = cy + (c.z - pZ) * mapScale;
        if(x >= 2 && x <= 143 && z >= 2 && z <= 143) {
            minimapCtx.fillStyle = '#f59e0b';
            minimapCtx.fillRect(x - 3, z - 3, 6, 6);
            minimapCtx.strokeStyle = '#fef08a';
            minimapCtx.lineWidth = 1;
            minimapCtx.strokeRect(x - 3, z - 3, 6, 6);
        }
    });

    // Draw enemies
    enemies.forEach(e => {
        const x = cx + (e.mesh.position.x - pX) * mapScale;
        const z = cy + (e.mesh.position.z - pZ) * mapScale;
        if(x >= 0 && x <= 145 && z >= 0 && z <= 145) {
            minimapCtx.fillStyle = e.isBoss ? '#ec4899' : '#ef4444';
            minimapCtx.beginPath();
            minimapCtx.arc(x, z, e.isBoss ? 4.5 : 2, 0, Math.PI*2);
            minimapCtx.fill();
        }
    });

    // Draw items
    minimapCtx.fillStyle = '#fbbf24';
    items.forEach(i => {
        const x = cx + (i.mesh.position.x - pX) * mapScale;
        const z = cy + (i.mesh.position.z - pZ) * mapScale;
        if(x >= 0 && x <= 145 && z >= 0 && z <= 145) {
            minimapCtx.beginPath();
            minimapCtx.arc(x, z, 1.5, 0, Math.PI*2);
            minimapCtx.fill();
        }
    });

    // Draw teammates (blue dots)
    minimapCtx.fillStyle = '#38bdf8';
    for (const id in OTHER_PLAYERS) {
        const p = OTHER_PLAYERS[id];
        const x = cx + (p.mesh.position.x - pX) * mapScale;
        const z = cy + (p.mesh.position.z - pZ) * mapScale;
        if(x >= 0 && x <= 145 && z >= 0 && z <= 145) {
            minimapCtx.beginPath();
            minimapCtx.arc(x, z, 3.5, 0, Math.PI*2);
            minimapCtx.fill();
        }
    }

    // Draw local player (green dot)
    minimapCtx.fillStyle = '#34d399';
    minimapCtx.beginPath();
    minimapCtx.arc(cx, cy, 3.5, 0, Math.PI*2);
    minimapCtx.fill();
}

// --- MAIN LOOP ---
const velocity = new THREE.Vector3();
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    if (GAME.state === 'PLAYING') {
        GAME.time += dt;

        // Buffs & Ultimate Timers
        if (BUFFS.swiftness > 0) {
            BUFFS.swiftness -= dt;
            if (BUFFS.swiftness <= 0) {
                BUFFS.swiftness = 0;
                updateEffects();
                updateBuffsHUD();
            } else {
                updateBuffsHUD();
            }
        }
        if (BUFFS.wrath > 0) {
            BUFFS.wrath -= dt;
            if (BUFFS.wrath <= 0) {
                BUFFS.wrath = 0;
                updateBuffsHUD();
            } else {
                updateBuffsHUD();
            }
        }

        if (PLAYER.ultCooldown > 0) {
            PLAYER.ultCooldown = Math.max(0, PLAYER.ultCooldown - dt);
            updateGUI();
        }
        if (PLAYER.invulnerableTimer > 0) {
            PLAYER.invulnerableTimer = Math.max(0, PLAYER.invulnerableTimer - dt);
        }

        // Aiming
        if (joystickShoot.active) {
            const target = playerMesh.position.clone();
            target.x += joystickShoot.x;
            target.z += joystickShoot.y;
            playerMesh.lookAt(target);
        } else {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(ground);
            if (intersects.length > 0) {
                const target = intersects[0].point;
                target.y = playerMesh.position.y;
                playerMesh.lookAt(target);
            }
        }

        if (PLAYER.fireCooldown > 0) PLAYER.fireCooldown -= dt;
        
        if (PLAYER.class === 'Mage' && PLAYER.mana < PLAYER.maxMana) {
            PLAYER.mana = Math.min(PLAYER.maxMana, PLAYER.mana + dt * 16);
            updateGUI();
        }

        if (PERM.regenPerSec > 0 && PLAYER.hp < PLAYER.maxHp && PLAYER.hp > 0 && !GAME.isDowned) {
            PLAYER.hp = Math.min(PLAYER.maxHp, PLAYER.hp + PLAYER.maxHp * PERM.regenPerSec * dt);
            updateGUI();
        }

        // Movement Physics
        velocity.x -= velocity.x * 10.0 * dt;
        velocity.z -= velocity.z * 10.0 * dt;

        const currentSpeed = (GAME.isDowned ? 5 : PLAYER.speed) * EFFECTS.moveSpeedMult * (keys.shift ? 1.4 : 1.0);
        
        if (joystickMove.active) {
            velocity.x += joystickMove.x * 100.0 * dt;
            velocity.z += joystickMove.y * 100.0 * dt;
        } else {
            if (keys.w) velocity.z -= 100.0 * dt;
            if (keys.s) velocity.z += 100.0 * dt;
            if (keys.a) velocity.x -= 100.0 * dt;
            if (keys.d) velocity.x += 100.0 * dt;
        }

        playerMesh.position.x += velocity.x * dt * (currentSpeed / 10);
        playerMesh.position.z += velocity.z * dt * (currentSpeed / 10);

        const pos = playerMesh.position;
        pos.x = Math.max(-490, Math.min(490, pos.x));
        pos.z = Math.max(-490, Math.min(490, pos.z));

        const cameraTargetX = playerMesh.position.x;
        const cameraTargetZ = playerMesh.position.z + 35; 
        
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, cameraTargetX, 0.1);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraTargetZ, 0.1);
        camera.position.y = 60; 

        // Camera Shake effect
        if (cameraShakeTimer > 0) {
            cameraShakeTimer -= dt;
            camera.position.x += (Math.random() - 0.5) * 1.5;
            camera.position.y += (Math.random() - 0.5) * 1.5;
            camera.position.z += (Math.random() - 0.5) * 1.5;
        }

        camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);

        if (keys.w || keys.a || keys.s || keys.d || joystickMove.active) {
            if (bodyMesh) bodyMesh.position.y = 1 + Math.sin(GAME.time * 15) * 0.15;
        } else {
            if (bodyMesh) bodyMesh.position.y = THREE.MathUtils.lerp(bodyMesh.position.y, 1, 0.1);
        }

        if (keys.click && !GAME.isDowned) attemptFire();

        // Projectiles Update
        for (let i = projectiles.length - 1; i >= 0; i--) {
            projectiles[i].update(dt);
            if (projectiles[i].life <= 0) {
                projectiles[i].destroy();
                projectiles.splice(i, 1);
            }
        }

        // VFX Objects Update
        for (let i = vfxObjects.length - 1; i >= 0; i--) {
            if (!vfxObjects[i].update(dt)) {
                vfxObjects.splice(i, 1);
            }
        }

        // Shrines & Chests Update
        for (let i = shrines.length - 1; i >= 0; i--) {
            shrines[i].update(dt, playerMesh.position);
        }
        for (let i = chests.length - 1; i >= 0; i--) {
            chests[i].update(dt, playerMesh.position);
        }

        if (GAME.mode === 'dungeon') {
            const playerPos = playerMesh.position;
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (enemies[i].hp <= 0) enemies.splice(i, 1);
                else enemies[i].update(dt, playerPos);
            }
            updateDungeon(dt, playerPos);

            for (let i = items.length - 1; i >= 0; i--) {
                items[i].update(dt, playerMesh.position);
                if (items[i].life === -1) items.splice(i, 1);
            }
        } else if (IS_MULTIPLAYER && WS && WS.readyState === WebSocket.OPEN) {
            const target = new THREE.Vector3();
            playerMesh.getWorldDirection(target);
            target.add(playerMesh.position);

            WS.send(JSON.stringify({
                type: 'UPDATE',
                x: playerMesh.position.x, z: playerMesh.position.z,
                lookX: target.x, lookZ: target.z,
                hp: PLAYER.hp, maxHp: PLAYER.maxHp, level: PLAYER.level,
                isDowned: GAME.isDowned
            }));

            for (const id in OTHER_PLAYERS) {
                OTHER_PLAYERS[id].mesh.position.lerp(OTHER_PLAYERS[id].targetPos, 0.25);
            }
            
            enemies.forEach(e => {
                if (e.targetPos) e.mesh.position.lerp(e.targetPos, 0.35);
                if (e.mesh.position.distanceTo(playerMesh.position) < e.hitRadius + 1.0 && !GAME.isDowned && PLAYER.invulnerableTimer <= 0) {
                    let dmg = e.damage * dt * 2.0;
                    if (GAME.shield > 0) {
                        const absorb = Math.min(GAME.shield, dmg);
                        GAME.shield -= absorb;
                        dmg -= absorb;
                    }
                    if (dmg > 0) {
                        PLAYER.hp -= dmg;
                        spawnFloatingText(playerMesh.position, `-${Math.round(dmg)}`, '#ef4444', 16, true);
                        showDamageVignette();
                        checkPlayerDeath();
                    }
                    updateGUI();
                }
            });

            for (let i = items.length - 1; i >= 0; i--) {
                items[i].update(dt, playerMesh.position);
                if (items[i].life === -1) items.splice(i, 1);
            }
        } else {
            // Solo Wave Management
            if (GAME.waveState === 'PREPARING') {
                GAME.waveTimer -= dt;
                updateWaveHUD();
                if (GAME.waveTimer <= 0) {
                    GAME.waveState = 'WAVE_ACTIVE';
                    GAME.isBossWave = (GAME.wave % 5 === 0);
                    GAME.totalWaveEnemies = 15 + GAME.wave * 8;
                    GAME.enemiesSpawned = 0;
                    GAME.enemiesKilled = 0;
                    GAME.bossSpawned = false;
                    spawnMapFeatures();
                    if (GAME.isBossWave) SFX.bossRoar();
                    else SFX.waveStart();
                    logMessage(`WAVE ${GAME.wave} STARTED!`, GAME.isBossWave ? '#ef4444' : '#38bdf8');
                    updateWaveHUD();
                }
            } else if (GAME.waveState === 'WAVE_CLEAR') {
                GAME.waveTimer -= dt;
                updateWaveHUD();
                if (GAME.waveTimer <= 0) {
                    GAME.wave++;
                    GAME.waveState = 'PREPARING';
                    GAME.waveTimer = 4;
                    updateWaveHUD();
                }
            } else if (GAME.waveState === 'WAVE_ACTIVE') {
                const playerPos = playerMesh.position;
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (enemies[i].hp <= 0) enemies.splice(i, 1);
                    else enemies[i].update(dt, playerPos);
                }

                const maxActive = Math.min(80, 20 + GAME.wave * 5);
                if (enemies.length < maxActive && GAME.enemiesSpawned < GAME.totalWaveEnemies && Math.random() < 0.35) {
                    spawnSoloWaveEnemy();
                }

                // Check Wave Completion
                if (GAME.enemiesSpawned >= GAME.totalWaveEnemies && enemies.length === 0) {
                    GAME.waveState = 'WAVE_CLEAR';
                    GAME.waveTimer = 12;
                    const bonusGold = 50 + GAME.wave * 25;
                    const bonusExp = 40 + GAME.wave * 20;
                    GAME.gold += bonusGold;
                    PLAYER.exp += bonusExp;
                    SAVE.essence += Math.floor(bonusGold * 0.5);
                    writeSave();
                    checkLevelUp();
                    trackQuestProgress('waves', 1);
                    trackQuestProgress('gold', bonusGold);
                    if (PERM.startingShield > 0) {
                        GAME.shield = Math.max(GAME.shield, PERM.startingShield);
                    }
                    SFX.waveClear();
                    showWaveClearBanner(GAME.wave, bonusGold, bonusExp);
                    updateWaveHUD();
                    updateGUI();
                    spawnMapFeatures();
                }

                const boss = enemies.find(e => e.isBoss && e.hp > 0);
                updateBossHUD(boss);
            }

            for (let i = items.length - 1; i >= 0; i--) {
                items[i].update(dt, playerMesh.position);
                if (items[i].life === -1) items.splice(i, 1);
            }
        }

        drawOverlay(dt);
        drawMinimap();
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
