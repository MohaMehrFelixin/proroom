import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import type {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
} from 'mediasoup/node/lib/types';
import {
  workerSettings,
  numWorkers,
  routerOptions,
  transportOptions,
} from './mediasoup.config';

interface RoomState {
  router: Router;
  peers: Map<
    string,
    {
      transports: Map<string, WebRtcTransport>;
      producers: Map<string, Producer>;
      consumers: Map<string, Consumer>;
    }
  >;
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);
  private workers: Worker[] = [];
  private workerIndex = 0;
  private rooms = new Map<string, RoomState>();

  async onModuleInit() {
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(workerSettings);
      worker.on('died', () => {
        this.logger.error(`mediasoup Worker ${i} died, restarting...`);
        setTimeout(() => this.replaceWorker(i), 2000);
      });
      this.workers.push(worker);
      this.logger.log(`mediasoup Worker ${i} created [pid: ${worker.pid}]`);
    }
  }

  async onModuleDestroy() {
    for (const worker of this.workers) {
      worker.close();
    }
  }

  private async replaceWorker(index: number) {
    const worker = await mediasoup.createWorker(workerSettings);
    worker.on('died', () => {
      this.logger.error(`mediasoup Worker ${index} died again`);
      setTimeout(() => this.replaceWorker(index), 2000);
    });
    this.workers[index] = worker;
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  async getOrCreateRoom(roomId: string): Promise<RoomState> {
    let room = this.rooms.get(roomId);
    if (!room) {
      const worker = this.getNextWorker();
      const router = await worker.createRouter(routerOptions);
      room = { router, peers: new Map() };
      this.rooms.set(roomId, room);
      this.logger.log(`Room ${roomId} created on worker ${worker.pid}`);
    }
    return room;
  }

  getRtpCapabilities(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.router.rtpCapabilities;
  }

  async createTransport(
    roomId: string,
    userId: string,
    direction: 'send' | 'recv',
  ) {
    const room = await this.getOrCreateRoom(roomId);

    if (!room.peers.has(userId)) {
      room.peers.set(userId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }

    const transport = await room.router.createWebRtcTransport({
      ...transportOptions,
      appData: { direction },
    });
    room.peers.get(userId)!.transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    roomId: string,
    userId: string,
    transportId: string,
    dtlsParameters: Record<string, unknown>,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const peer = room.peers.get(userId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    await transport.connect({
      dtlsParameters: dtlsParameters as mediasoup.types.DtlsParameters,
    });
  }

  async produce(
    roomId: string,
    userId: string,
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
    appData?: Record<string, unknown>,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const peer = room.peers.get(userId);
    if (!peer) throw new Error('Peer not found');

    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, userId },
    });

    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      peer.producers.delete(producer.id);
    });

    return producer.id;
  }

  async consume(
    roomId: string,
    userId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume this producer');
    }

    const peer = room.peers.get(userId);
    if (!peer) throw new Error('Peer not found');

    // Find a receive transport
    const recvTransport = Array.from(peer.transports.values()).find(
      (t) => t.appData.direction === 'recv',
    );
    if (!recvTransport) throw new Error('No receive transport');

    const consumer = await recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      peer.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(roomId: string, userId: string, consumerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (!peer) return;

    const consumer = peer.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
    }
  }

  getProducers(roomId: string, excludeUserId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const producers: Array<{
      userId: string;
      producerId: string;
      kind: string;
      appData: Record<string, unknown>;
    }> = [];

    for (const [userId, peer] of room.peers) {
      if (userId === excludeUserId) continue;
      for (const [, producer] of peer.producers) {
        producers.push({
          userId,
          producerId: producer.id,
          kind: producer.kind,
          appData: producer.appData as Record<string, unknown>,
        });
      }
    }

    return producers;
  }

  removePeer(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(userId);
    if (!peer) return;

    for (const [, consumer] of peer.consumers) {
      consumer.close();
    }
    for (const [, producer] of peer.producers) {
      producer.close();
    }
    for (const [, transport] of peer.transports) {
      transport.close();
    }

    room.peers.delete(userId);

    // Clean up empty rooms
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      this.logger.log(`Room ${roomId} closed (no peers)`);
    }
  }

  async closeRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [userId] of room.peers) {
      this.removePeer(roomId, userId);
    }

    // If router still open (removePeer deletes room when empty, but just in case)
    if (this.rooms.has(roomId)) {
      room.router.close();
      this.rooms.delete(roomId);
    }

    this.logger.log(`Room ${roomId} force-closed by admin`);
  }
}
