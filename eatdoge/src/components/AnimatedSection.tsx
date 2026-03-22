import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function AnimatedSection({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 36, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  )
}
