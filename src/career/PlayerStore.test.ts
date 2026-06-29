import { describe, it, expect } from 'vitest';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

describe('PlayerStore', () => {
  it('varsayılan oyuncu config.start değerleriyle', () => {
    const p = new PlayerStore();
    const s = GAME_CONFIG.career.start;
    expect(p.data.money).toBe(s.money);
    expect(p.data.age).toBe(s.age);
    expect(p.data.careerTier).toBe('amateur');
    expect(p.data.shot).toBe(s.stats.shot);
    expect(p.data.currentClub).toBe(s.club);
  });

  it('create isim/mevki/görünümü uygular', () => {
    const d = PlayerStore.create('Ali', 'winger', { skin: 1, hair: 2, kit: 3 });
    expect(d.name).toBe('Ali');
    expect(d.position).toBe('winger');
    expect(d.appearance.kit).toBe(3);
  });

  it('boş isim "İsimsiz" olur', () => {
    expect(PlayerStore.create('   ', 'forward', { skin: 0, hair: 0, kit: 0 }).name).toBe(
      'İsimsiz'
    );
  });

  it('addMoney 0 altına düşmez', () => {
    const p = new PlayerStore();
    p.data.money = 100;
    p.addMoney(-500);
    expect(p.data.money).toBe(0);
  });

  it('rest enerjiyi 100 ile sınırlar', () => {
    const p = new PlayerStore();
    p.data.energy = 80;
    p.rest();
    expect(p.data.energy).toBe(100);
  });

  it('spendEnergy 0 altına düşmez', () => {
    const p = new PlayerStore();
    p.data.energy = 10;
    p.spendEnergy(40);
    expect(p.data.energy).toBe(0);
  });

  it('addReputation eşik aşınca tier yükseltir', () => {
    const p = new PlayerStore();
    const th = GAME_CONFIG.career.tierThresholds;
    p.addReputation(th.semipro);
    expect(p.data.careerTier).toBe('semipro');
    p.addReputation(th.pro - th.semipro);
    expect(p.data.careerTier).toBe('pro');
  });

  it('tier ve mevki etiketleri Türkçe', () => {
    const p = new PlayerStore(
      PlayerStore.create('X', 'midfielder', { skin: 0, hair: 0, kit: 0 })
    );
    expect(p.positionLabel).toBe('Orta Saha');
    expect(p.tierLabel).toBe('Amatör');
  });
});
