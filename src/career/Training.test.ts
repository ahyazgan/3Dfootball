import { describe, it, expect } from 'vitest';
import { trainStat, canTrain } from './Training';
import { PlayerStore } from './PlayerStore';
import { GAME_CONFIG } from '../config';

const COST = GAME_CONFIG.career.training.energyCost;

describe('Training', () => {
  it('antrenman statı yükseltir ve enerji harcar', () => {
    const p = new PlayerStore();
    const e0 = p.data.energy;
    const before = p.data.shot;
    const res = trainStat(p, 'shot', () => 0.5);
    expect(res).not.toBeNull();
    expect(p.data.shot).toBeGreaterThan(before);
    expect(res!.newValue).toBe(p.data.shot);
    expect(p.data.energy).toBe(e0 - COST);
  });

  it('azalan verim: düşük stat daha çok artar', () => {
    const low = new PlayerStore();
    low.data.shot = 30;
    const high = new PlayerStore();
    high.data.shot = 90;
    const gLow = trainStat(low, 'shot', () => 0.5)!.gain;
    const gHigh = trainStat(high, 'shot', () => 0.5)!.gain;
    expect(gLow).toBeGreaterThan(gHigh);
  });

  it('yüksek moral gelişimi artırır', () => {
    const happy = new PlayerStore();
    happy.data.shot = 30;
    happy.data.morale = 100;
    const sad = new PlayerStore();
    sad.data.shot = 30;
    sad.data.morale = 20;
    const gHappy = trainStat(happy, 'shot', () => 0.5)!.gain;
    const gSad = trainStat(sad, 'shot', () => 0.5)!.gain;
    expect(gHappy).toBeGreaterThan(gSad);
  });

  it('enerji yetersizse antrenman yapılmaz (null)', () => {
    const p = new PlayerStore();
    p.data.energy = COST - 1;
    const before = p.data.shot;
    expect(canTrain(p.data)).toBe(false);
    expect(trainStat(p, 'shot')).toBeNull();
    expect(p.data.shot).toBe(before);
  });

  it('stat 100 üstüne çıkmaz', () => {
    const p = new PlayerStore();
    p.data.shot = 99;
    trainStat(p, 'shot', () => 0.5);
    expect(p.data.shot).toBe(100);
    p.data.energy = 100;
    const res = trainStat(p, 'shot', () => 0.5);
    expect(res!.gain).toBe(0); // zaten maks
    expect(p.data.shot).toBe(100);
  });
});
