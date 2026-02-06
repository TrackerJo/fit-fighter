import { motion, AnimatePresence } from 'motion/react';

export default function AnimatedList({ items, className = '', renderItem }) {
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={item.id || index}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {renderItem ? renderItem(item, index) : item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
