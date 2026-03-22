import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description: string
  aside?: ReactNode
}

export function SectionHeading({ eyebrow, title, description, aside }: SectionHeadingProps) {
  return (
    <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-3xl"
      >
        <p className="mb-3 inline-flex rounded-full border border-doge-200/20 bg-doge-100/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.34em] text-doge-200/80">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
        <p className="mt-4 text-base leading-7 text-[#e7ddcf]/80 sm:text-lg">{description}</p>
      </motion.div>
      {aside && <div className="max-w-md">{aside}</div>}
    </div>
  )
}
