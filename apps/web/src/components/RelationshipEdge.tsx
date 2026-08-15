'use client';

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  Position,
} from '@xyflow/react';
import { RelationshipModel, CrowsFootMultiplicity } from '@/types/erd';
import { Trash2, Settings2 } from 'lucide-react';

export interface RelationshipEdgeData {
  relationship: RelationshipModel;
  onEdit: (rel: RelationshipModel) => void;
  onDelete: (relId: string) => void;
  sourceOffsetY?: number;
  sourceOffsetX?: number;
  targetOffsetY?: number;
  targetOffsetX?: number;
}

interface CrowsFootMarkerProps {
  x: number;
  y: number;
  position: Position;
  multiplicity: CrowsFootMultiplicity;
  color: string;
  isSource?: boolean;
}

const CrowsFootMarker: React.FC<CrowsFootMarkerProps> = ({
  x,
  y,
  position,
  multiplicity,
  color,
  isSource = false,
}) => {
  // Compute rotation angle pointing along the edge line (away from the table boundary)
  let angle = 0;

  if (isSource) {
    // Source: Line departs from node boundary outwards into canvas
    if (position === Position.Right) angle = 0;
    else if (position === Position.Left) angle = 180;
    else if (position === Position.Bottom) angle = 90;
    else if (position === Position.Top) angle = -90;
  } else {
    // Target: From target node boundary, line points back outwards towards source
    if (position === Position.Left) angle = 180;
    else if (position === Position.Right) angle = 0;
    else if (position === Position.Top) angle = -90;
    else if (position === Position.Bottom) angle = 90;
  }

  // Crow's Foot (<): Prongs touch table boundary (x=0, y=±9) and converge at center line (x=11, y=0)
  const renderCrowsFoot = () => (
    <path
      d="M 0 -9 L 11 0 M 0 9 L 11 0 M 0 0 L 11 0"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  // Coordinate system: (0,0) is node boundary, +X extends along the edge away from table
  const renderSymbol = () => {
    switch (multiplicity) {
      case 'optional-one-many': // O + | + < (0, 1 or N)
        return (
          <>
            {renderCrowsFoot()}
            {/* Vertical bar (|) at x=16 */}
            <line x1="16" y1="-8" x2="16" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            {/* Circle (O) at x=25 */}
            <circle cx="25" cy="0" r="4.2" fill="#07090e" stroke={color} strokeWidth="2" />
          </>
        );

      case 'optional-many': // O + < (0 or N)
        return (
          <>
            {renderCrowsFoot()}
            {/* Circle (O) at x=18 */}
            <circle cx="18" cy="0" r="4.2" fill="#07090e" stroke={color} strokeWidth="2" />
          </>
        );

      case 'optional-one': // O + | (0 or 1)
        return (
          <>
            {/* Vertical bar (|) at x=8 */}
            <line x1="8" y1="-8" x2="8" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            {/* Circle (O) at x=17 */}
            <circle cx="17" cy="0" r="4.2" fill="#07090e" stroke={color} strokeWidth="2" />
          </>
        );

      case 'mandatory-many': // | + < (1 or N)
        return (
          <>
            {renderCrowsFoot()}
            {/* Vertical bar (|) at x=16 */}
            <line x1="16" y1="-8" x2="16" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          </>
        );

      case 'mandatory-one': // || (Only 1 - Double bar)
        return (
          <>
            {/* Bar 1 at x=7 */}
            <line x1="7" y1="-8" x2="7" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            {/* Bar 2 at x=14 */}
            <line x1="14" y1="-8" x2="14" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          </>
        );

      case 'many': // < (N - Plain Crow's foot)
        return renderCrowsFoot();

      case 'one': // | (1 - Single bar)
      default:
        return (
          <line x1="8" y1="-8" x2="8" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        );
    }
  };

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`} className="pointer-events-none">
      {renderSymbol()}
    </g>
  );
};

export const RelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {
  const edgeData = data as unknown as RelationshipEdgeData | undefined;
  const rel = edgeData?.relationship;

  const adjSourceX = sourceX + (edgeData?.sourceOffsetX || 0);
  const adjSourceY = sourceY + (edgeData?.sourceOffsetY || 0);
  const adjTargetX = targetX + (edgeData?.targetOffsetX || 0);
  const adjTargetY = targetY + (edgeData?.targetOffsetY || 0);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: adjSourceX,
    sourceY: adjSourceY,
    sourcePosition,
    targetX: adjTargetX,
    targetY: adjTargetY,
    targetPosition,
    borderRadius: 14,
  });

  const isIdentifying = rel?.relationshipType === 'identifying';

  // Determine source & target multiplicities
  const isOneToOne = rel?.cardinality === 'one-to-one' || rel?.targetMultiplicity === 'one';

  const sourceMultiplicity: CrowsFootMultiplicity =
    rel?.sourceMultiplicity || 'one';

  const targetMultiplicity: CrowsFootMultiplicity =
    rel?.targetMultiplicity ||
    (isOneToOne
      ? 'one'
      : (isIdentifying ? 'mandatory-many' : 'optional-many'));

  const strokeColor = isIdentifying ? '#818cf8' : '#f472b6';

  return (
    <>
      {/* Main Relationship Line */}
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: isIdentifying ? 2.2 : 1.8,
          strokeDasharray: isIdentifying ? undefined : '5,4',
        }}
      />

      {/* Source (Parent Table End) Multiplicity Marker */}
      <CrowsFootMarker
        x={adjSourceX}
        y={adjSourceY}
        position={sourcePosition}
        multiplicity={sourceMultiplicity}
        color={strokeColor}
        isSource={true}
      />

      {/* Target (Child Table End) Multiplicity Marker */}
      <CrowsFootMarker
        x={adjTargetX}
        y={adjTargetY}
        position={targetPosition}
        multiplicity={targetMultiplicity}
        color={strokeColor}
        isSource={false}
      />

      {/* Center Label Badge with Hover Settings & Delete */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          <div className="flex items-center gap-1.5 bg-[#0c1017]/95 border border-white/[0.12] hover:border-indigo-500 rounded-full px-2.5 py-0.5 shadow-xl backdrop-blur-md transition-all text-[10px] text-slate-300">
            <span
              style={{ color: strokeColor }}
              className="font-bold font-mono tracking-tight"
            >
              {isIdentifying ? '식별' : '비식별'}
            </span>

            {/* Actions on Hover */}
            <div className="hidden group-hover:flex items-center gap-1 ml-1 pl-1.5 border-l border-white/[0.1]">
              {edgeData?.onEdit && rel && (
                <button
                  onClick={() => edgeData.onEdit(rel)}
                  className="p-0.5 hover:text-indigo-400 text-slate-400 rounded transition-colors"
                  title="관계 속성 설정"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              )}
              {edgeData?.onDelete && (
                <button
                  onClick={() => edgeData.onDelete(id)}
                  className="p-0.5 hover:text-rose-400 text-slate-400 rounded transition-colors"
                  title="관계 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
