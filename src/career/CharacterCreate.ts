import { injectCareerStyles } from './careerStyles';
import {
  type Position,
  type Appearance,
  POSITION_LABEL,
  SKIN_PALETTE,
  HAIR_PALETTE,
  KIT_PALETTE,
} from './types';

export type OnCreate = (name: string, position: Position, appearance: Appearance) => void;

/** Oyuncu yaratma ekranı: isim, mevki, görünüm. */
export class CharacterCreate {
  private root: HTMLElement;
  private name = '';
  private position: Position = 'forward';
  private appearance: Appearance = { skin: 0, hair: 0, kit: 0 };

  constructor() {
    injectCareerStyles();
    this.root = document.createElement('div');
    this.root.className = 'career-screen hidden';
    document.body.appendChild(this.root);
  }

  show(onCreate: OnCreate, onBack: () => void) {
    this.name = '';
    this.position = 'forward';
    this.appearance = { skin: 0, hair: 0, kit: 0 };
    this.root.className = 'career-screen';
    this.render(onCreate, onBack);
  }

  private render(onCreate: OnCreate, onBack: () => void) {
    const positions: Position[] = ['forward', 'winger', 'midfielder'];
    const swatches = (palette: string[], active: number, kind: string) =>
      palette
        .map(
          (c, i) =>
            `<div class="c-swatch ${i === active ? 'active' : ''}" data-kind="${kind}" data-i="${i}" style="background:${c}"></div>`
        )
        .join('');

    this.root.innerHTML = `
      <h1>Futbolcunu Yarat</h1>
      <div class="c-card">
        <div>
          <div class="c-label">İSİM</div>
          <input class="c-input" id="cc-name" maxlength="16" placeholder="Adın" value="${this.name}" />
        </div>
        <div>
          <div class="c-label">MEVKİ</div>
          <div class="c-choices" id="cc-pos">
            ${positions
              .map(
                (p) =>
                  `<button class="c-choice ${p === this.position ? 'active' : ''}" data-pos="${p}">${POSITION_LABEL[p]}</button>`
              )
              .join('')}
          </div>
        </div>
        <div>
          <div class="c-label">FORMA</div>
          <div class="c-choices">${swatches(KIT_PALETTE, this.appearance.kit, 'kit')}</div>
        </div>
        <div>
          <div class="c-label">TEN</div>
          <div class="c-choices">${swatches(SKIN_PALETTE, this.appearance.skin, 'skin')}</div>
        </div>
        <div>
          <div class="c-label">SAÇ</div>
          <div class="c-choices">${swatches(HAIR_PALETTE, this.appearance.hair, 'hair')}</div>
        </div>
        <button class="cbtn wide" id="cc-go">KARİYERE BAŞLA</button>
        <button class="cbtn wide secondary" id="cc-back">Geri</button>
      </div>
    `;

    const nameInput = this.root.querySelector<HTMLInputElement>('#cc-name')!;
    nameInput.addEventListener('input', () => (this.name = nameInput.value));

    this.root.querySelectorAll<HTMLElement>('#cc-pos .c-choice').forEach((b) =>
      b.addEventListener('click', () => {
        this.position = b.dataset.pos as Position;
        this.render(onCreate, onBack);
      })
    );

    this.root.querySelectorAll<HTMLElement>('.c-swatch').forEach((sw) =>
      sw.addEventListener('click', () => {
        const kind = sw.dataset.kind as keyof Appearance;
        this.appearance = { ...this.appearance, [kind]: Number(sw.dataset.i) };
        this.render(onCreate, onBack);
      })
    );

    this.root.querySelector('#cc-go')!.addEventListener('click', () => {
      onCreate(this.name, this.position, this.appearance);
    });
    this.root.querySelector('#cc-back')!.addEventListener('click', () => onBack());
  }

  hide() {
    this.root.className = 'career-screen hidden';
    this.root.innerHTML = '';
  }
}
