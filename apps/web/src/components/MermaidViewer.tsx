'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface MermaidViewerProps {
  code: string;
  theme?: 'dark' | 'pastel' | 'forest' | 'neutral' | 'default';
  className?: string;
  onRenderSuccess?: () => void;
  onError?: (err: string) => void;
}

// Initial Mermaid configuration
let currentMermaidTheme: string | null = null;
function ensureMermaidInitialized(theme: string = 'pastel') {
  try {
    if (currentMermaidTheme === theme) return;
    
    const isDark = theme === 'dark';
    
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      logLevel: 'error',
      sequence: {
        diagramMarginX: 24,
        diagramMarginY: 20,
        actorMargin: 45,
        width: 155,
        height: 46,
        boxMargin: 10,
        boxTextMargin: 6,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 2,
        useMaxWidth: false,
        actorFontSize: 13.5,
        actorFontFamily: 'Pretendard, -apple-system, sans-serif',
        actorFontWeight: '600',
        noteFontSize: 12.5,
        noteFontFamily: 'Pretendard, -apple-system, sans-serif',
        noteFontWeight: '500',
        noteAlign: 'left',
        messageFontSize: 13,
        messageFontFamily: 'Pretendard, -apple-system, sans-serif',
        messageFontWeight: '500',
        wrap: true,
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 16,
        nodeSpacing: 45,
        rankSpacing: 45,
        useMaxWidth: false,
      },
      themeVariables: isDark
        ? {
            darkMode: true,
            background: 'transparent',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '14px',
            
            primaryColor: '#1e293b',
            primaryTextColor: '#f8fafc',
            primaryBorderColor: '#3b82f6',
            lineColor: '#94a3b8',
            secondaryColor: '#334155',
            tertiaryColor: '#0f172a',
            
            actorBkg: '#1e293b',
            actorBorder: '#3b82f6',
            actorTextColor: '#ffffff',
            actorLineColor: '#64748b',
            
            signalColor: '#94a3b8',
            signalTextColor: '#f8fafc',
            
            labelBoxBkgColor: '#0f172a',
            labelBoxBorderColor: '#475569',
            labelTextColor: '#38bdf8',
            loopTextColor: '#e2e8f0',
            
            noteBkgColor: '#1e1c18',
            noteBorderColor: '#eab308',
            noteTextColor: '#fef08a',
            
            activationBorderColor: '#38bdf8',
            activationBkgColor: 'rgba(56, 189, 248, 0.22)',
            sequenceNumberColor: '#ffffff',
            
            nodeBkg: '#1e293b',
            nodeBorder: '#3b82f6',
            nodeTextColor: '#f8fafc',
            mainBkg: '#1e293b',
            textColor: '#f8fafc',
            edgeLabelBackground: '#0f172a',
            clusterBkg: 'rgba(15, 23, 42, 0.75)',
            clusterBorder: '#475569',
            
            classText: '#f8fafc',
            altBackground: '#0f172a',
          }
        : {
            // Modern Pastel / Light (초고가독성 테마)
            darkMode: false,
            background: '#ffffff',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: '13.5px',
            
            primaryColor: '#ede9fe',
            primaryTextColor: '#18181b',
            primaryBorderColor: '#c4b5fd',
            lineColor: '#18181b',
            secondaryColor: '#f3e8ff',
            tertiaryColor: '#ffffff',
            
            // 액터 (은은한 라벤더)
            actorBkg: '#ede9fe',
            actorBorder: '#c4b5fd',
            actorTextColor: '#18181b',
            actorLineColor: '#ddd6fe',
            
            // 화살표 & 텍스트 (선명한 블랙)
            signalColor: '#18181b',
            signalTextColor: '#18181b',
            
            // Alt/Loop 분기 박스
            labelBoxBkgColor: '#ede9fe',
            labelBoxBorderColor: '#c4b5fd',
            labelTextColor: '#4f46e5',
            loopTextColor: '#18181b',
            
            // Note 박스 (소프트 레몬 옐로우)
            noteBkgColor: '#fef9c3',
            noteBorderColor: '#eab308',
            noteTextColor: '#18181b',
            
            activationBorderColor: '#818cf8',
            activationBkgColor: 'rgba(129, 140, 248, 0.2)',
            sequenceNumberColor: '#ffffff',
            
            // Flowchart
            nodeBkg: '#ede9fe',
            nodeBorder: '#c4b5fd',
            nodeTextColor: '#18181b',
            mainBkg: '#ede9fe',
            textColor: '#18181b',
            edgeLabelBackground: '#ffffff',
            clusterBkg: '#f8fafc',
            clusterBorder: '#e2e8f0',
          },
    });
    currentMermaidTheme = theme;
  } catch (e) {
    console.error('Failed to initialize mermaid', e);
  }
}

// In-memory static cache for parsed SVG diagrams to avoid expensive re-renders
const svgCache = new Map<string, string>();

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  code,
  theme = 'dark',
  className = '',
  onRenderSuccess,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>(() => {
    const cacheKey = `${theme}__v7__${code?.trim() || ''}`;
    return svgCache.get(cacheKey) || '';
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(() => {
    const cacheKey = `${theme}__v7__${code?.trim() || ''}`;
    return !svgCache.has(cacheKey);
  });
  const rawId = useId();
  const renderIdRef = useRef(`mermaid_${rawId.replace(/[:]/g, '_')}_${Math.random().toString(36).substring(2, 6)}`);

  useEffect(() => {
    let isCancelled = false;

    const renderDiagram = async () => {
      const trimmedCode = code?.trim();
      if (!trimmedCode) {
        setSvgContent('');
        setErrorMsg('다이어그램 코드가 비어 있습니다.');
        setIsRendering(false);
        return;
      }

      const cacheKey = `${theme}__v7__${trimmedCode}`;
      if (svgCache.has(cacheKey)) {
        setSvgContent(svgCache.get(cacheKey)!);
        setErrorMsg(null);
        setIsRendering(false);
        onRenderSuccess?.();
        return;
      }

      setIsRendering(true);
      setErrorMsg(null);

      try {
        ensureMermaidInitialized(theme);
        const uniqueId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const isDark = theme === 'dark';
        
        // mermaid.render parses and returns SVG
        const { svg } = await mermaid.render(uniqueId, trimmedCode);

        if (!isCancelled) {
          // Custom injected CSS with STRICT scoping to #uniqueId to prevent leaking to global SVG icons
          const injectedCss = isDark
            ? `
            <style>
              #${uniqueId} text {
                font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                text-rendering: geometricPrecision !important;
                -webkit-font-smoothing: antialiased !important;
              }
              #${uniqueId} rect.actor {
                stroke-width: 1.5px !important;
                rx: 6px !important;
                ry: 6px !important;
              }
              #${uniqueId} circle.actor {
                stroke-width: 1.5px !important;
              }
              #${uniqueId} line.actor {
                stroke-width: 1.5px !important;
              }
              #${uniqueId} text.actor > tspan, #${uniqueId} text.actor {
                font-weight: 600 !important;
                letter-spacing: -0.01em !important;
              }
              #${uniqueId} .messageText {
                font-weight: 500 !important;
                letter-spacing: -0.015em !important;
              }
              #${uniqueId} .note {
                rx: 4px !important;
                ry: 4px !important;
              }
            </style>
          `
            : `
            <style>
              #${uniqueId} text {
                font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                text-rendering: geometricPrecision !important;
                -webkit-font-smoothing: antialiased !important;
              }
              #${uniqueId} rect.actor {
                fill: #ede9fe !important;
                stroke: #c4b5fd !important;
                stroke-width: 1.2px !important;
                rx: 6px !important;
                ry: 6px !important;
              }
              #${uniqueId} circle.actor {
                fill: #ede9fe !important;
                stroke: #c4b5fd !important;
                stroke-width: 1.3px !important;
              }
              #${uniqueId} line.actor {
                stroke: #c4b5fd !important;
                stroke-width: 1.3px !important;
              }
              #${uniqueId} text.actor > tspan, #${uniqueId} text.actor {
                fill: #18181b !important;
                font-weight: 600 !important;
                letter-spacing: -0.01em !important;
              }
              #${uniqueId} line[class*="actor-line"], #${uniqueId} .actor-line {
                stroke: #ddd6fe !important;
                stroke-width: 1.2px !important;
              }
              #${uniqueId} .messageLine0, #${uniqueId} .messageLine1 {
                stroke: #18181b !important;
                stroke-width: 1.3px !important;
              }
              #${uniqueId} #arrowhead path, #${uniqueId} marker path {
                fill: #18181b !important;
                stroke: #18181b !important;
              }
              #${uniqueId} .messageText {
                fill: #18181b !important;
                font-weight: 500 !important;
                letter-spacing: -0.015em !important;
                font-size: 13px !important;
              }
              #${uniqueId} .labelText {
                fill: #4f46e5 !important;
                font-weight: 600 !important;
              }
              #${uniqueId} .loopText {
                fill: #18181b !important;
                font-weight: 500 !important;
              }
              #${uniqueId} .loopLine {
                stroke: #c4b5fd !important;
                stroke-dasharray: 4, 4 !important;
              }
              #${uniqueId} .note {
                fill: #fef9c3 !important;
                stroke: #eab308 !important;
                rx: 4px !important;
                ry: 4px !important;
                stroke-width: 1.2px !important;
              }
              #${uniqueId} .noteText, #${uniqueId} .noteText > tspan {
                fill: #18181b !important;
                font-weight: 500 !important;
                letter-spacing: -0.01em !important;
              }
            </style>
          `;

          // Post-process SVG to be fully responsive and crisp
          let cleanSvg = svg;

          // Ensure SVG has the unique ID for scoped CSS
          if (!cleanSvg.includes(`id="${uniqueId}"`)) {
            cleanSvg = cleanSvg.replace('<svg ', `<svg id="${uniqueId}" `);
          }

          const badgeCircleFill = isDark ? '#0284c7' : '#18181b';
          const badgeCircleStroke = isDark ? '#38bdf8' : '#18181b';
          const badgeTextFill = '#ffffff';

          // 1. Transform sequenceNumber circles directly in SVG DOM
          cleanSvg = cleanSvg.replace(/<circle([^>]*class="[^"]*sequenceNumber[^"]*"[^>]*)>/gi, (_match: string, attrs: string) => {
            const cleanAttrs = attrs
              .replace(/\s*(fill|stroke|stroke-width|r|style)="[^"]*"/gi, '')
              .trim();
            return `<circle ${cleanAttrs} r="9.5" fill="${badgeCircleFill}" stroke="${badgeCircleStroke}" stroke-width="1.2" style="fill:${badgeCircleFill} !important;stroke:${badgeCircleStroke} !important;" />`;
          });

          // 2. Transform sequenceNumber texts directly in SVG DOM with perfect visual centering offset (dy="0.12em")
          cleanSvg = cleanSvg.replace(/<text([^>]*class="[^"]*sequenceNumber[^"]*"[^>]*)>([\s\S]*?)<\/text>/gi, (_match: string, attrs: string, content: string) => {
            const cleanAttrs = attrs
              .replace(/\s*(fill|stroke|dy|text-anchor|dominant-baseline|alignment-baseline|style)="[^"]*"/gi, '')
              .trim();
            const textVal = content.replace(/<[^>]+>/g, '').trim();
            return `<text ${cleanAttrs} dy="0.12em" text-anchor="middle" dominant-baseline="central" alignment-baseline="central" fill="${badgeTextFill}" style="fill:${badgeTextFill} !important;font-size:10.5px !important;font-weight:800 !important;font-family:Pretendard,system-ui,-apple-system,sans-serif !important;text-anchor:middle !important;dominant-baseline:central !important;">${textVal}</text>`;
          });

          // 3. Transform any group sequenceNumber elements
          cleanSvg = cleanSvg.replace(/<g([^>]*class="[^"]*sequenceNumber[^"]*"[^>]*)>([\s\S]*?)<\/g>/gi, (match: string, gAttrs: string, inner: string) => {
            let fixedInner = inner.replace(/<circle([^>]*)>/gi, (_cMatch: string, cAttrs: string) => {
              const cleanC = cAttrs.replace(/\s*(fill|stroke|stroke-width|r|style)="[^"]*"/gi, '').trim();
              return `<circle ${cleanC} r="9.5" fill="${badgeCircleFill}" stroke="${badgeCircleStroke}" stroke-width="1.2" style="fill:${badgeCircleFill} !important;stroke:${badgeCircleStroke} !important;" />`;
            });
            fixedInner = fixedInner.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (_tMatch: string, tAttrs: string, tContent: string) => {
              const cleanT = tAttrs.replace(/\s*(fill|stroke|dy|text-anchor|dominant-baseline|alignment-baseline|style)="[^"]*"/gi, '').trim();
              const textVal = tContent.replace(/<[^>]+>/g, '').trim();
              return `<text ${cleanT} dy="0.12em" text-anchor="middle" dominant-baseline="central" alignment-baseline="central" fill="${badgeTextFill}" style="fill:${badgeTextFill} !important;font-size:10.5px !important;font-weight:800 !important;font-family:Pretendard,system-ui,-apple-system,sans-serif !important;text-anchor:middle !important;dominant-baseline:central !important;">${textVal}</text>`;
            });
            return `<g ${gAttrs}>${fixedInner}</g>`;
          });

          if (cleanSvg.includes('</svg>')) {
            cleanSvg = cleanSvg.replace('</svg>', `${injectedCss}</svg>`);
          }

          cleanSvg = cleanSvg
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/style="max-width:[^;]*;"/, 'style="max-width: 100%; height: auto;"');

          svgCache.set(cacheKey, cleanSvg);
          setSvgContent(cleanSvg);
          setErrorMsg(null);
          setIsRendering(false);
          onRenderSuccess?.();
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Mermaid render error:', err);
          const errorString = err?.message || err?.str || String(err);
          setErrorMsg(errorString);
          setIsRendering(false);
          onError?.(errorString);

          // Clean up any stray error elements created by mermaid in DOM
          if (typeof document !== 'undefined') {
            const strayElements = document.querySelectorAll(`[id^="d${renderIdRef.current}"]`);
            strayElements.forEach((el) => el.remove());
          }
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [code, theme, onRenderSuccess, onError]);

  if (errorMsg) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs gap-2 min-h-[140px] text-center ${className}`}>
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <div className="font-semibold text-rose-200">Mermaid 렌더링 오류</div>
        <p className="text-[11px] text-rose-300/80 max-h-24 overflow-y-auto font-mono bg-black/40 p-2 rounded w-full text-left whitespace-pre-wrap">
          {errorMsg}
        </p>
        <span className="text-[10px] text-neutral-400">우측 상단 연필 아이콘을 눌러 코드를 수정하세요.</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-auto select-none p-2 ${className}`}
    >
      {isRendering && !svgContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] z-10">
          <Loader2 className="w-5 h-5 text-[#0c8ce9] animate-spin" />
        </div>
      )}
      <div
        className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto [&>svg]:w-auto [&>svg]:mx-auto transition-all"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
