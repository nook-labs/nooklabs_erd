'use client';

import React, { useEffect, useState } from 'react';
import { ERDDocManager } from '@/collaboration/doc';
import { ViewportPortal, useViewport } from '@xyflow/react';

interface RemoteCursor {
  clientId: number;
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string | null;
  };
  cursor: {
    x: number;
    y: number;
  } | null;
  lastActive: number;
}

interface MultiplayerCursorsProps {
  manager: ERDDocManager | null;
}

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = ({ manager }) => {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const { zoom } = useViewport();

  useEffect(() => {
    if (!manager?.provider?.awareness) return;

    const awareness = manager.provider.awareness;
    const myClientId = awareness.clientID;

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const cursors: RemoteCursor[] = [];

      states.forEach((state: any, clientId: number) => {
        if (clientId === myClientId) return; // 내 커서는 표시하지 않음
        if (state.user && state.cursor) {
          cursors.push({
            clientId,
            user: state.user,
            cursor: state.cursor,
            lastActive: Date.now(),
          });
        }
      });

      setRemoteCursors(cursors);
    };

    awareness.on('change', handleAwarenessChange);
    handleAwarenessChange();

    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [manager]);

  if (remoteCursors.length === 0) return null;

  // 피그마 방식: 줌 배율(zoom)에 반비례하여 scale 역보정 (항상 일정한 화면 크기 유지)
  const inverseScale = 1 / Math.max(zoom, 0.1);

  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
        {remoteCursors.map(({ clientId, user, cursor }) => {
          if (!cursor) return null;

          const userColor = user.color || '#6366f1';

          return (
            <div
              key={clientId}
              style={{
                transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)`,
                transformOrigin: '0 0',
              }}
              className="absolute top-0 left-0 flex flex-col items-start pointer-events-none will-change-transform"
            >
              {/* Figma-Style Scale Stabilizer Container */}
              <div
                style={{
                  transform: `scale(${inverseScale})`,
                  transformOrigin: '0 0',
                }}
                className="flex flex-col items-start"
              >
                {/* Figma-Style Cursor Arrow */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] -rotate-12"
                >
                  <path
                    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                    fill={userColor}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </svg>

                {/* Figma-Style Name Label Pill */}
                <div
                  style={{ backgroundColor: userColor }}
                  className="px-2 py-0.5 rounded-full text-white text-[11px] font-bold tracking-tight shadow-lg flex items-center gap-1 -mt-1 ml-3.5 border border-white/30 whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>{user.name || '동료'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
};
