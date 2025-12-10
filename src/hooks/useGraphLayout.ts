import { useCallback } from 'react';
import { Node } from 'reactflow';

const NODE_WIDTH = 400;
const NODE_HEIGHT = 400;

export const useGraphLayout = () => {
  const findPositionForNewNode = useCallback((currentNodes: Node[], sourceNode: Node, direction: 'right' = 'right') => {
      const gapX = 100;
      const gapY = 50;
      
      let sourceX = sourceNode.position.x;
      let sourceY = sourceNode.position.y;
      
      if (sourceNode.parentNode) {
         const parent = currentNodes.find(n => n.id === sourceNode.parentNode);
         if (parent) {
             sourceX += parent.position.x;
             sourceY += parent.position.y;
         }
      }

      const targetX = sourceX + (sourceNode.width || NODE_WIDTH) + gapX;
      
      const visibleNodes = currentNodes.filter(n => !n.hidden);
      
      const nodesInColumn = visibleNodes.filter(n => {
          let nx = n.position.x;
          if (n.parentNode) {
              const p = currentNodes.find(p => p.id === n.parentNode);
              if (p) nx += p.position.x;
          }
          return Math.abs(nx - targetX) < 150;
      });
      
      if (nodesInColumn.length === 0) {
          return { x: targetX, y: sourceY };
      }

      const maxY = Math.max(...nodesInColumn.map(n => {
          let ny = n.position.y;
          if (n.parentNode) {
              const p = currentNodes.find(p => p.id === n.parentNode);
              if (p) ny += p.position.y;
          }
          return ny + (n.height || NODE_HEIGHT);
      }));
      
      return { x: targetX, y: maxY + gapY };

  }, []);

  return { findPositionForNewNode };
};