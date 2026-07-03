import { _decorator, Component, Node, AudioSource, AudioClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property(AudioClip)
    jumpSound: AudioClip = null;

    @property(AudioClip)
    diveSound: AudioClip = null;

    @property(AudioClip)
    coinSound: AudioClip = null;

    @property(AudioClip)
    collisionSound: AudioClip = null;

    @property(AudioClip)
    powerUpSound: AudioClip = null;

    @property(AudioClip)
    backgroundMusic: AudioClip = null;

    private audioSource: AudioSource = null;

    start() {
        // 初始化音频管理器
        this.setupAudio();
    }

    setupAudio() {
        this.audioSource = this.getComponent(AudioSource);
        if (!this.audioSource) {
            this.audioSource = this.addComponent(AudioSource);
        }
        
        console.log('AudioManager initialized');
    }

    playJumpSound() {
        if (this.jumpSound && this.audioSource) {
            this.audioSource.playOneShot(this.jumpSound);
        }
    }

    playDiveSound() {
        if (this.diveSound && this.audioSource) {
            this.audioSource.playOneShot(this.diveSound);
        }
    }

    playCoinSound() {
        if (this.coinSound && this.audioSource) {
            this.audioSource.playOneShot(this.coinSound);
        }
    }

    playCollisionSound() {
        if (this.collisionSound && this.audioSource) {
            this.audioSource.playOneShot(this.collisionSound);
        }
    }

    playPowerUpSound() {
        if (this.powerUpSound && this.audioSource) {
            this.audioSource.playOneShot(this.powerUpSound);
        }
    }

    playBackgroundMusic() {
        if (this.backgroundMusic && this.audioSource) {
            this.audioSource.clip = this.backgroundMusic;
            this.audioSource.loop = true;
            this.audioSource.play();
        }
    }

    stopBackgroundMusic() {
        if (this.audioSource) {
            this.audioSource.stop();
        }
    }

    setVolume(volume: number) {
        if (this.audioSource) {
            this.audioSource.volume = volume;
        }
    }

    update(deltaTime: number) {
        // 音频管理器不需要每帧更新
    }
}