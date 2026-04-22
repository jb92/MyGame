/** Skill identifiers */
export enum Skill {
    DASH = 'DASH',
    COMBO_PUNCH = 'COMBO_PUNCH',
    GROUND_SLAM = 'GROUND_SLAM',
}

class GameStateManager {
    private static instance: GameStateManager;

    playerHealth = 100;
    maxHealth = 100;
    unlockedSkills: Set<Skill> = new Set();
    spareParts = 0;
    totalSpareParts = 3;
    currentLevel = 1;
    score = 0;

    static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    reset() {
        this.playerHealth = this.maxHealth;
        this.unlockedSkills = new Set();
        this.spareParts = 0;
        this.currentLevel = 1;
        this.score = 0;
    }

    hasSkill(skill: Skill): boolean {
        return this.unlockedSkills.has(skill);
    }

    unlockSkill(skill: Skill) {
        this.unlockedSkills.add(skill);
    }

    addSparePart() {
        this.spareParts = Math.min(this.spareParts + 1, this.totalSpareParts);
    }

    isAlive(): boolean {
        return this.playerHealth > 0;
    }

    takeDamage(amount: number) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
    }

    heal(amount: number) {
        this.playerHealth = Math.min(this.maxHealth, this.playerHealth + amount);
    }
}

export const GameState = GameStateManager.getInstance();
