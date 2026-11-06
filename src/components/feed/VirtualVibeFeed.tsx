'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface VirtualVibeFeedProps<T extends { id: string }> {
  items: T[];
  estimateItemHeight: (item: T) => number;
  renderItem: (item: T, invalidateHeight: (id: string) => void) => React.ReactNode;
  overscanPx?: number;
  className?: string;
}

interface LayoutMetric<T> {
  item: T;
  index: number;
  top: number;
  height: number;
  bottom: number;
}

interface ViewportMetrics {
  scrollY: number;
  height: number;
  listTop: number;
}

export function VirtualVibeFeed<T extends { id: string }>({
  items,
  estimateItemHeight,
  renderItem,
  overscanPx = 560,
  className = '',
}: VirtualVibeFeedProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [heightCache, setHeightCache] = useState<Map<string, number>>(() => new Map());
  const [viewport, setViewport] = useState<ViewportMetrics | null>(null);

  const invalidateHeight = useCallback((id: string) => {
    setHeightCache((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  // Read DOM geometry in an effect, then update React state on the next frame.
  useEffect(() => {
    let rafId: number | null = null;
    const measureViewport = () => {
      rafId = null;
      const element = containerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const next = {
        scrollY: window.scrollY,
        height: window.innerHeight,
        listTop: rect.top + window.scrollY,
      };
      setViewport((current) =>
        current &&
        current.scrollY === next.scrollY &&
        current.height === next.height &&
        current.listTop === next.listTop
          ? current
          : next,
      );
    };
    const scheduleMeasurement = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(measureViewport);
    };

    scheduleMeasurement();
    window.addEventListener('scroll', scheduleMeasurement, { passive: true });
    window.addEventListener('resize', scheduleMeasurement, { passive: true });
    return () => {
      window.removeEventListener('scroll', scheduleMeasurement);
      window.removeEventListener('resize', scheduleMeasurement);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [items.length]);

  const { visibleSlices, topSpacerPx, bottomSpacerPx } = useMemo(() => {
    if (items.length === 0) {
      return { visibleSlices: [] as LayoutMetric<T>[], topSpacerPx: 0, bottomSpacerPx: 0 };
    }

    let runningOffset = 0;
    const metrics: LayoutMetric<T>[] = items.map((item, index) => {
      const height = heightCache.get(item.id) ?? estimateItemHeight(item);
      const top = runningOffset;
      runningOffset += height;
      return { item, index, top, height, bottom: runningOffset };
    });

    const totalHeight = runningOffset;
    if (!viewport) {
      const initialSlice = metrics.slice(0, Math.min(items.length, 6));
      const renderedBottom = initialSlice.length > 0
        ? initialSlice[initialSlice.length - 1].bottom
        : 0;
      return {
        visibleSlices: initialSlice,
        topSpacerPx: 0,
        bottomSpacerPx: Math.max(0, totalHeight - renderedBottom),
      };
    }

    const relStart = Math.max(0, viewport.scrollY - viewport.listTop - overscanPx);
    const relEnd = Math.min(
      totalHeight,
      viewport.scrollY + viewport.height - viewport.listTop + overscanPx,
    );

    let startIndex = 0;
    while (startIndex < metrics.length && metrics[startIndex].bottom < relStart) {
      startIndex += 1;
    }

    let endIndex = startIndex;
    while (endIndex < metrics.length && metrics[endIndex].top <= relEnd) {
      endIndex += 1;
    }

    if (startIndex >= metrics.length) {
      startIndex = Math.max(0, metrics.length - 4);
      endIndex = metrics.length;
    } else if (endIndex <= startIndex) {
      endIndex = Math.min(metrics.length, startIndex + 4);
    }

    const slice = metrics.slice(startIndex, endIndex);
    const topPx = slice.length > 0 ? slice[0].top : 0;
    const bottomPx = slice.length > 0
      ? Math.max(0, totalHeight - slice[slice.length - 1].bottom)
      : 0;
    return { visibleSlices: slice, topSpacerPx: topPx, bottomSpacerPx: bottomPx };
  }, [items, estimateItemHeight, overscanPx, heightCache, viewport]);

  // Measure rendered rows after paint and publish changed heights asynchronously.
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const nodes = Array.from(
      viewportEl.querySelectorAll<HTMLElement>('[data-virtual-id]'),
    ).map((node) => ({
      id: node.getAttribute('data-virtual-id'),
      height: Math.round(node.getBoundingClientRect().height + 16),
    })).filter((entry): entry is { id: string; height: number } => entry.id !== null);

    const rafId = window.requestAnimationFrame(() => {
      setHeightCache((current) => {
        let next: Map<string, number> | null = null;
        for (const entry of nodes) {
          const previous = current.get(entry.id);
          if (previous === undefined || Math.abs(previous - entry.height) > 2) {
            next ??= new Map(current);
            next.set(entry.id, entry.height);
          }
        }
        return next ?? current;
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [visibleSlices]);

  return (
    <div ref={containerRef} className={className}>
      <div style={{ height: `${topSpacerPx}px` }} aria-hidden="true" />
      <div ref={viewportRef} className="space-y-4">
        {visibleSlices.map(({ item }) => (
          <div key={item.id} data-virtual-id={item.id}>
            {renderItem(item, invalidateHeight)}
          </div>
        ))}
      </div>
      <div style={{ height: `${bottomSpacerPx}px` }} aria-hidden="true" />
    </div>
  );
}
