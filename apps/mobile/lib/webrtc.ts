// WebRTC helper for React Native
// Note: Requires react-native-webrtc package to be installed

import RTCPeerConnection from 'react-native-webrtc';

export interface WebRTCConfig {
  onTrack?: (stream: any) => void;
  onIceCandidate?: (candidate: any) => void;
  onConnectionStateChange?: (state: string) => void;
  onIceConnectionStateChange?: (state: string) => void;
}

const defaultConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class VoiceCallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: any = null;
  private remoteStream: any = null;

  async startLocalStream(): Promise<any> {
    const { mediaDevices } = require('react-native-webrtc');
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }

  setupPeerConnection(config?: WebRTCConfig): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(defaultConfig);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: any) => {
        this.peerConnection?.addTrack(track, this.localStream);
      });
    }

    // Set up event handlers
    if (config?.onTrack) {
      this.peerConnection.ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          config.onTrack!(event.streams[0]);
        }
      };
    }

    if (config?.onIceCandidate) {
      this.peerConnection.onIceCandidate = (event: any) => {
        if (event.candidate) {
          config.onIceCandidate!(event.candidate);
        }
      };
    }

    if (config?.onConnectionStateChange) {
      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          config.onConnectionStateChange!(this.peerConnection.connectionState);
        }
      };
    }

    if (config?.onIceConnectionStateChange) {
      this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection) {
          config.onIceConnectionStateChange!(this.peerConnection.iceConnectionState);
        }
      };
    }

    return this.peerConnection;
  }

  async createOffer(): Promise<any> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    return await this.peerConnection.createOffer();
  }

  async createAnswer(): Promise<any> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    return await this.peerConnection.createAnswer();
  }

  async setLocalDescription(desc: any): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    await this.peerConnection.setLocalDescription(desc);
  }

  async setRemoteDescription(desc: any): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    await this.peerConnection.setRemoteDescription(desc);
  }

  async addIceCandidate(candidate: any): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    await this.peerConnection.addIceCandidate(candidate);
  }

  getLocalStream(): any {
    return this.localStream;
  }

  getRemoteStream(): any {
    return this.remoteStream;
  }

  getConnectionState(): string | null {
    return this.peerConnection?.connectionState || null;
  }

  endCall(): void {
    // Release local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream.release();
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
  }

  isActive(): boolean {
    return this.peerConnection !== null && 
           this.peerConnection.connectionState === 'connected';
  }
}

// Singleton instance for app-wide use
export const voiceCallManager = new VoiceCallManager();
