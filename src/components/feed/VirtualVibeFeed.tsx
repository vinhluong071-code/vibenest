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

export function VirtualVibeFeed<T extends { id: string }>({
  items,
  estimateItemHeight,
  renderItem,
  overscanPx = 560,
  className = '',
}: VirtualVibeFeedProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const heightCacheRef = useRef<Map<string, number>>(new Map());
  const [scrollTick, setScrollTick] = useState(0);

  const invalidateHeight = useCallback((id: string) => {
    heightCacheRef.current.delete(id);
    setScrollTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    const handleViewportUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setScrollTick((tick) => tick + 1);
      });
    };

    window.addEventListener('scroll', handleViewportUpdate, { passive: true });
    window.addEventListener('resize', handleViewportUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleViewportUpdate);
      window.removeEventListener('resize', handleViewportUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const { visibleSlices, topSpacerPx, bottomSpacerPx } = useMemo(() => {
    // Reference scrollTick so layout recalculates on scroll/resize/height invalidation
    void scrollTick;

    if (items.length === 0) {
      return { visibleSlices: [] as LayoutMetric<T>[], topSpacerPx: 0, bottomSpacerPx: 0 };
    }

    let runningOffset = 0;
    const metrics: LayoutMetric<T>[] = items.map((item, idx) => {
      const height = heightCacheRef.current.get(item.id) ?? estimateItemHeight(item);
      const top = runningOffset;
      runningOffset += height;
      return {
        item,
        index: idx,
        top,
        height,
        bottom: runningOffset,
      };
    });

    const totalHeight = runningOffset;
    const containerEl = containerRef.current;

    if (!containerEl || typeof window === 'undefined') {
      const initialSlice = metrics.slice(0, Math.min(items.length, 6));
      const renderedBottom = initialSlice.length > 0 ? initialSlice[initialSlice.length - 1].bottom : 0;
      return {
        visibleSlices: initialSlice,
        topSpacerPx: 0,
        bottomSpacerPx: Math.max(0, totalHeight - renderedBottom),
      };
    }

    const listRect = containerEl.getBoundingClientRect();
    const listTopPageY = listRect.top + window.scrollY;
    const viewportTopPageY = window.scrollY;
    const viewportBottomPageY = viewportTopPageY + window.innerHeight;

    const relStart = Math.max(0, viewportTopPageY - listTopPageY - overscanPx);
    const relEnd = Math.min(totalHeight, viewportBottomPageY - listTopPageY + overscanPx);

    let startIndex = 0;
    while (startIndex < metrics.length && metrics[startIndex].bottom < relStart) {
      startIndex++;
    }

    let endIndex = startIndex;
    while (endIndex < metrics.length && metrics[endIndex].top <= relEnd) {
      endIndex++;
    }

    if (startIndex >= metrics.length) {
      startIndex = Math.max(0, metrics.length - 4);
      endIndex = metrics.length;
    } else if (endIndex <= startIndex) {
      endIndex = Math.min(metrics.length, startIndex + 4);
    }

    const slice = metrics.slice(startIndex, endIndex);
    const topPx = slice.length > 0 ? slice[0].top : 0;
    const bottomPx = slice.length > 0 ? Math.max(0, totalHeight - slice[slice.length - 1].bottom) : 0;

    return {
      visibleSlices: slice,
      topSpacerPx: topPx,
      bottomSpacerPx: bottomPx,
    };
  }, [items, estimateItemHeight, overscanPx, scrollTick]);

  // Measure actual rendered heights and update cache if delta > 2px
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    let hasSignificantDiff = false;
    const nodes = viewportEl.querySelectorAll<HTMLElement>('[data-virtual-id]');
    nodes.forEach((node) => {
      const id = node.getAttribute('data-virtual-id');
      if (!id) return;
      const rect = node.getBoundingClientRect();
      const measuredHeight = Math.round(rect.height + 16); // 16px = space-y-4 margin
      const prevHeight = heightCacheRef.current.get(id);
      if (prevHeight === undefined || Math.abs(prevHeight - measuredHeight) > 2) {
        heightCacheRef.current.set(id, measuredHeight);
        hasSignificantDiff = true;
      }
    });

    if (hasSignificantDiff) {
      setScrollTick((tick) => tick + 1);
    }
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
