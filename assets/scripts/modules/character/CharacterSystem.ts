import { _decorator, Component } from 'cc';
import { CharacterType, CharacterStats, CHARACTER_STATS } from '@types/character';
import { PlayerSave } from '@types/player';

const { ccclass, property } = _decorator;

@ccclass('CharacterSystem')
export class CharacterSystem extends Component {
  private currentCharacter: CharacterType = 'xiaoming';
  private unlockedCharacters: CharacterType[] = ['xiaoming'];

  equip(character: CharacterType): void {
    if (this.unlockedCharacters.includes(character)) {
      this.currentCharacter = character;
    }
  }

  getStats(): CharacterStats {
    return CHARACTER_STATS[this.currentCharacter];
  }

  getCurrentCharacter(): CharacterType {
    return this.currentCharacter;
  }

  getUnlockedCharacters(): ReadonlyArray<CharacterType> {
    return this.unlockedCharacters;
  }

  tryUnlock(character: CharacterType, coins: number): { success: boolean; cost: number } {
    const costs: Record<CharacterType, number> = {
      xiaoming: 0,
      snow_leopard: 1000,
      ice_spirit: 0,
      storm_knight: 0,
      polar_explorer: 0,
      ski_master: 0,
    };

    const cost = costs[character];
    if (cost === 0) return { success: false, cost: 0 };
    if (this.unlockedCharacters.includes(character)) return { success: false, cost };
    if (coins < cost) return { success: false, cost };

    this.unlockedCharacters.push(character);
    return { success: true, cost };
  }

  canUnlock(character: CharacterType, playerSave: PlayerSave): boolean {
    if (this.unlockedCharacters.includes(character)) return false;

    const unlockByCoins: CharacterType[] = ['snow_leopard'];
    if (unlockByCoins.includes(character)) {
      return playerSave.coins >= 1000;
    }

    const unlockByLevel: Record<CharacterType, number> = {
      ice_spirit: 10,
      storm_knight: 20,
      polar_explorer: 30,
      ski_master: 0,
    };

    const requiredLevel = unlockByLevel[character];
    if (requiredLevel > 0) {
      return playerSave.unlockedLevels >= requiredLevel;
    }

    if (character === 'ski_master') {
      const totalStars = Object.values(playerSave.stars).reduce((sum, s) => sum + s, 0);
      return totalStars >= 150;
    }

    return false;
  }
}
