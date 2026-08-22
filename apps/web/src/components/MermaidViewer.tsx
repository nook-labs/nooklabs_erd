'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface MermaidViewerProps {
  code: string;
  theme?: 'dark' | 'forest' | 'neutral' | 'default';
  className?: string;
  onRenderSuccess?: () => void;
  onError?: (err: string) => void;
}

// Initial Mermaid configuration
let isMermaidInitialized = false;
function ensureMermaidInitialized(theme: string = 'dark') {
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme as any,
      securityLevel: 'loose',
      fontFamily: 'inherit',
      logLevel: 'error',
      themeVariables: {
        darkMode: theme === 'dark',
        background: 'transparent',
        mainBkg: theme === 'dark' ? '#22272e' : '#f6f8fa',
        nodeBorder: theme === 'dark' ? '#444c56' : '#d0d7de',
        textColor: theme === 'dark' ? '#adbac7' : '#24292f',
        lineColor: theme === 'dark' ? '#768390' : '#57606a',
        actorBkg: theme === 'dark' ? '#2d333b' : '#eaeef2',
        actorBorder: theme === 'dark' ? '#545d68' : '#afb8c1',
        actorTextColor: theme === 'dark' ? '#adbac7' : '#24292f',
        signalColor: theme === 'dark' ? '#adbac7' : '#24292f',
        signalTextColor: theme === 'dark' ? '#adbac7' : '#24292f',
        labelBoxBkgColor: theme === 'dark' ? '#2d333b' : '#f6f8fa',
        labelBoxBorderColor: theme === 'dark' ? '#545d68' : '#d0d7de',
        labelTextColor: theme === 'dark' ? '#adbac7' : '#24292f',
        loopTextColor: theme === 'dark' ? '#adbac7' : '#24292f',
        noteBkgColor: theme === 'dark' ? '#3d3822' : '#fff8c5',
        noteBorderColor: theme === 'dark' ? '#9e6a03' : '#d4a72c',
        noteTextColor: theme === 'dark' ? '#f0b72f' : '#734f00',
        activationBorderColor: '#0c8ce9',
        activationBkgColor: 'rgba(12, 140, 233, 0.25)',
        sequenceNumberColor: '#ffffff',
      },
    });
    isMermaidInitialized = true;
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
    const cacheKey = `${theme}__${code?.trim() || ''}`;
    return svgCache.get(cacheKey) || '';
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(() => {
    const cacheKey = `${theme}__${code?.trim() || ''}`;
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

      const cacheKey = `${theme}__${trimmedCode}`;
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
        
        // mermaid.render parses and returns SVG
        const { svg } = await mermaid.render(uniqueId, trimmedCode);

        if (!isCancelled) {
          // Post-process SVG to be fully responsive
          const cleanSvg = svg
            .replace(/<style>[\s\S]*?<\/style>/, (match) => {
              return match;
            })
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
      className={`relative w-full h-full flex items-center justify-center overflow-auto select-none ${className}`}
    >
      {isRendering && !svgContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] z-10">
          <Loader2 className="w-5 h-5 text-[#0c8ce9] animate-spin" />
        </div>
      )}
      <div
        className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto transition-all"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};
