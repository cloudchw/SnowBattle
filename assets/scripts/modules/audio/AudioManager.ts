import { _decorator, Component, AudioSource, AudioClip } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 音频管理器（Cocos Component）。
 * 挂在常驻节点上，通过 @property 绑定各 AudioClip 资源，
 * 复用单个 AudioSource 播放音效与背景音乐。
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
  @property(AudioClip)
  jumpSound: AudioClip = null!;

  @property(AudioClip)
  diveSound: AudioClip = null!;

  @property(AudioClip)
  coinSound: AudioClip = null!;

  @property(AudioClip)
  collisionSound: AudioClip = null!;

  @property(AudioClip)
  powerUpSound: AudioClip = null!;

  @property(AudioClip)
  backgroundMusic: AudioClip = null!;

  private audioSource: AudioSource = null!;

  start() {
    this.setupAudio();
  }

  private setupAudio(): void {
    this.audioSource = this.getComponent(AudioSource) ?? this.addComponent(AudioSource);
  }

  playJumpSound(): void { this.playOneShot(this.jumpSound); }
  playDiveSound(): void { this.playOneShot(this.diveSound); }
  playCoinSound(): void { this.playOneShot(this.coinSound); }
  playCollisionSound(): void { this.playOneShot(this.collisionSound); }
  playPowerUpSound(): void { this.playOneShot(this.powerUpSound); }

  private playOneShot(clip: AudioClip): void {
    if (clip && this.audioSource) {
      this.audioSource.playOneShot(clip);
    }
  }

  playBackgroundMusic(): void {
    if (this.backgroundMusic && this.audioSource) {
      this.audioSource.clip = this.backgroundMusic;
      this.audioSource.loop = true;
      this.audioSource.play();
    }
  }

  stopBackgroundMusic(): void {
    if (this.audioSource) {
      this.audioSource.stop();
    }
  }

  setVolume(volume: number): void {
    if (this.audioSource) {
      this.audioSource.volume = volume;
    }
  }
}
