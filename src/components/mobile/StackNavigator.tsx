import { ReactNode, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface Screen {
  key: string;
  component: ReactNode;
}

interface StackContextValue {
  push: (key: string, component: ReactNode) => void;
  pop: () => void;
  canGoBack: boolean;
}

const StackContext = createContext<StackContextValue | null>(null);

export function useStackNavigation() {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error('useStackNavigation must be used within StackNavigator');
  }
  return context;
}

interface StackNavigatorProps {
  children: ReactNode;
  onEmpty?: () => void;
}

const SWIPE_THRESHOLD = 100;
const EDGE_WIDTH = 30;

export default function StackNavigator({ children, onEmpty }: StackNavigatorProps) {
  const { theme } = useTheme();
  const [stack, setStack] = useState<Screen[]>([{ key: 'root', component: children }]);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const push = useCallback((key: string, component: ReactNode) => {
    setDirection('forward');
    setStack(prev => [...prev, { key, component }]);
  }, []);

  const pop = useCallback(() => {
    if (stack.length > 1) {
      setDirection('back');
      setStack(prev => prev.slice(0, -1));
    } else if (onEmpty) {
      onEmpty();
    }
  }, [stack.length, onEmpty]);

  const handleDragStart = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.point.x <= EDGE_WIDTH && stack.length > 1) {
      setIsDragging(true);
    }
  }, [stack.length]);

  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isDragging && info.offset.x > 0) {
      setDragX(info.offset.x);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isDragging) {
      if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 500) {
        pop();
      }
      setDragX(0);
      setIsDragging(false);
    }
  }, [isDragging, pop]);

  const currentScreen = stack[stack.length - 1];
  const previousScreen = stack.length > 1 ? stack[stack.length - 2] : null;

  const variants = {
    enter: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? '100%' : '-30%',
      opacity: dir === 'forward' ? 1 : 0.5,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'forward' | 'back') => ({
      x: dir === 'forward' ? '-30%' : '100%',
      opacity: dir === 'forward' ? 0.5 : 1,
    }),
  };

  const dragProgress = Math.min(dragX / window.innerWidth, 1);
  const previousScreenX = isDragging ? -30 + dragProgress * 30 : 0;

  return (
    <StackContext.Provider value={{ push, pop, canGoBack: stack.length > 1 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: theme.colors.background.primary,
        }}
      >
        {previousScreen && isDragging && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              x: `${previousScreenX}%`,
              backgroundColor: theme.colors.background.primary,
            }}
          >
            {previousScreen.component}
          </motion.div>
        )}

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentScreen.key}
            custom={direction}
            variants={variants}
            initial="enter"
            animate={isDragging ? { x: dragX, opacity: 1 } : 'center'}
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag={stack.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: window.innerWidth }}
            dragElastic={0}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: theme.colors.background.primary,
              boxShadow: isDragging ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {currentScreen.component}
          </motion.div>
        </AnimatePresence>
      </div>
    </StackContext.Provider>
  );
}
