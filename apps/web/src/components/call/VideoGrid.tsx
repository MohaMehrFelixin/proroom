'use client';

import { cn } from '@/lib/cn';
import { ParticipantTile } from './ParticipantTile';

interface StreamEntry {
  id: string;
  stream: MediaStream;
  userId: string;
  isScreen: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  localUserId: string;
  localName: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  remoteStreams: StreamEntry[];
  participantNames: Record<string, string>;
  pinnedUserId: string | null;
  onPinUser: (userId: string | null) => void;
}

export const VideoGrid = ({
  localStream,
  localScreenStream,
  localUserId,
  localName,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  remoteStreams,
  participantNames,
  pinnedUserId,
  onPinUser,
}: VideoGridProps) => {
  const screenShares = remoteStreams.filter((s) => s.isScreen);
  const cameraFeeds = remoteStreams.filter((s) => !s.isScreen);

  // Include local screen share as a screen share entry
  const hasLocalScreen = isScreenSharing && localScreenStream;
  const hasSpotlight = screenShares.length > 0 || hasLocalScreen || pinnedUserId !== null;

  if (hasSpotlight) {
    // Priority: local screen > remote screen > pinned user
    const spotlightIsLocalScreen = hasLocalScreen;
    const spotlightRemote = !spotlightIsLocalScreen
      ? (screenShares[0] ?? cameraFeeds.find((s) => s.userId === pinnedUserId))
      : undefined;

    const thumbnailRemotes = spotlightRemote
      ? remoteStreams.filter((s) => s !== spotlightRemote)
      : remoteStreams;

    return (
      <div className="flex h-full flex-col gap-2 p-2">
        {/* Main spotlight */}
        <div className="min-h-0 flex-1">
          {spotlightIsLocalScreen ? (
            <ParticipantTile
              stream={localScreenStream}
              name={localName}
              userId={localUserId}
              isLocal
              isScreen
              className="h-full w-full"
            />
          ) : spotlightRemote ? (
            <ParticipantTile
              stream={spotlightRemote.stream}
              name={participantNames[spotlightRemote.userId] ?? spotlightRemote.userId.slice(0, 8)}
              userId={spotlightRemote.userId}
              isScreen={spotlightRemote.isScreen}
              isPinned={pinnedUserId === spotlightRemote.userId}
              onClick={() => onPinUser(null)}
              className="h-full w-full"
            />
          ) : (
            <ParticipantTile
              stream={localStream}
              name={localName}
              userId={localUserId}
              isLocal
              isVideoOff={!isVideoEnabled}
              isMuted={!isAudioEnabled}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="flex h-20 gap-2 overflow-x-auto sm:h-24">
          {/* Local camera thumbnail */}
          <ParticipantTile
            stream={localStream}
            name={localName}
            userId={localUserId}
            isLocal
            isVideoOff={!isVideoEnabled}
            isMuted={!isAudioEnabled}
            onClick={() => onPinUser(localUserId)}
            className="aspect-video h-full flex-shrink-0"
          />
          {thumbnailRemotes.map((entry) => (
            <ParticipantTile
              key={entry.id}
              stream={entry.stream}
              name={participantNames[entry.userId] ?? entry.userId.slice(0, 8)}
              userId={entry.userId}
              isScreen={entry.isScreen}
              onClick={() => onPinUser(entry.userId)}
              className="aspect-video h-full flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid mode — no screen shares, no pinned user
  const totalParticipants = 1 + cameraFeeds.length;
  const gridClass = getGridClass(totalParticipants);

  return (
    <div className={cn('grid h-full gap-2 p-2', gridClass)}>
      <ParticipantTile
        stream={localStream}
        name={localName}
        userId={localUserId}
        isLocal
        isVideoOff={!isVideoEnabled}
        isMuted={!isAudioEnabled}
        onClick={() => onPinUser(localUserId)}
        className="h-full w-full"
      />
      {cameraFeeds.map((entry) => (
        <ParticipantTile
          key={entry.id}
          stream={entry.stream}
          name={participantNames[entry.userId] ?? entry.userId.slice(0, 8)}
          userId={entry.userId}
          onClick={() => onPinUser(entry.userId)}
          className="h-full w-full"
        />
      ))}
    </div>
  );
};

const getGridClass = (count: number): string => {
  if (count === 1) return 'grid-cols-1 grid-rows-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2 grid-rows-2 sm:grid-rows-1';
  if (count <= 4) return 'grid-cols-2 grid-rows-2';
  return 'grid-cols-2 sm:grid-cols-3 auto-rows-fr';
};
