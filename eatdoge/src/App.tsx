import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeHelp,
  BadgeInfo,
  Bone,
  ChevronDown,
  Instagram,
  Laugh,
  Menu,
  MessageCircleMore,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { AnimatedSection } from './components/AnimatedSection'
import { SectionHeading } from './components/SectionHeading'

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Sticker Wall', href: '#gallery' },
  { label: 'Fake-nomics', href: '#tokenomics' },
  { label: 'FAQ', href: '#faq' },
]

const memePhrases = ['wow', 'much eat', 'many snack', 'very coin', 'zero utility', 'maximum vibes']
const tickerItems = ['very snack', 'much wow', 'zero utility', 'bark respectfully', 'chaos certified', 'eatdoge.com', 'premium nonsense']

const aboutCards = [
  {
    title: 'Not a protocol. Not a platform.',
    body: 'It is simply Doge in a premium dark room, chewing through seriousness one golden crumb at a time.',
  },
  {
    title: 'Luxury meme internet',
    body: 'Plush gradients, tasteful glow, and copy written like the internet accidentally hired an art director.',
  },
  {
    title: 'No promises. Only vibes.',
    body: 'No staking. No dashboards. No token utility. Just mood, motion, and extremely decorative nonsense.',
  },
]

const features = [
  ['Infinite Vibes', 'Runs on ambient wow and the suspicious confidence of a dog near a sandwich.'],
  ['Certified Snack Energy', 'Every pixel is lightly seasoned with crumb-grade optimism.'],
  ['Barkchain Compatible', 'Interoperable with barking, side-eye, and emotionally loaded eye contact.'],
  ['0% Seriousness', 'Our compliance department is a biscuit tin and even it thinks this is funny.'],
  ['Community Chow Mode', 'A social layer for people who communicate in “lmao”, stickers, and inexplicable loyalty.'],
  ['Premium Doge Aura', 'Subtle gold glow so the mascot feels expensive without becoming a chandelier.'],
  ['Sauce Layer 2', 'An advanced rollup architecture for ketchup, mayo, and mysterious meme condiments.'],
  ['Bone-Backed Sentiment', 'Backed by absolutely nothing except mood, momentum, and a photogenic face.'],
]

const stickers = [
  'CEO of Snacking',
  'Chairman of Wow',
  'Supreme Biscuit Officer',
  'Bark to Earn Emotionally',
  'Crumb Maximalist',
  'Snack Liquidity Wizard',
]

const tokenomics = [
  ['40%', 'snacks'],
  ['25%', 'vibes'],
  ['15%', 'barking'],
  ['10%', 'crumbs'],
  ['9%', 'chaos'],
  ['1%', 'actual planning'],
]

const faqs = [
  ['Is this financial advice?', 'No. This is snack advice at best, and even that should be reviewed by a sandwich.'],
  ['Does this do anything?', 'Yes. It upgrades your browser tab into a premium vibe habitat.'],
  ['Why is Doge eating?', 'Because staring at food while being iconic is peak brand storytelling.'],
  ['Is there a roadmap?', 'Only spiritually. It points toward crumbs, glow, and destiny-shaped nonsense.'],
  ['Can I believe in this?', 'Absolutely. Just not in the SEC-filing sense. More in the “this is weirdly beautiful” sense.'],
]

const featureIcons = [Bone, Sparkles, MessageCircleMore, Laugh, Send, BadgeInfo, ChevronDown, BadgeHelp]
const aboutIcons = [Sparkles, Laugh, BadgeInfo]

export default function App({ dogeSrc }: { dogeSrc: string }) {
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1450)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const floatingBits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        id: index,
        size: 20 + ((index * 11) % 36),
        left: `${(index * 8.2) % 100}%`,
        top: `${(index * 16.7) % 100}%`,
        delay: index * 0.3,
        duration: 8 + (index % 6),
      })),
    [],
  )

  return (
    <div className="noise relative overflow-hidden bg-charcoal text-cream">
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090807]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
          >
            <motion.img
              src={dogeSrc}
              alt="EatDoge mascot"
              className="mb-6 h-28 w-28 rounded-full border border-doge-200/20 bg-doge-100/10 p-4 shadow-glow"
              animate={{ y: [0, -14, 0], rotate: [0, -3, 3, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.8, ease: 'easeInOut' }}
            />
            <motion.p
              className="text-sm uppercase tracking-[0.45em] text-doge-200/70"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.6 }}
            >
              preheating the crumbs
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-gold-grid bg-[size:92px_92px] opacity-[0.07]" />

      {floatingBits.map((bit) => (
        <motion.div
          key={bit.id}
          className="pointer-events-none absolute rounded-full border border-doge-100/10 bg-doge-100/5 blur-sm"
          style={{ left: bit.left, top: bit.top, width: bit.size, height: bit.size }}
          animate={{ y: [0, -18, 0], x: [0, 10, 0], opacity: [0.15, 0.45, 0.15] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: bit.duration, delay: bit.delay, ease: 'easeInOut' }}
        />
      ))}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b0908]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <a href="#hero" className="group flex items-center gap-3">
            <motion.img
              whileHover={{ rotate: 8, scale: 1.05 }}
              src={dogeSrc}
              alt="EatDoge logo"
              className="h-11 w-11 rounded-full border border-doge-200/15 bg-doge-100/10 p-1.5 shadow-glow"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">EatDoge</p>
              <p className="text-xs uppercase tracking-[0.28em] text-doge-200/55">very snack. much wow.</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-medium text-[#f3e7d1]/72 transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <motion.a
            href="#cta"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="hidden items-center gap-2 rounded-full border border-doge-100/20 bg-doge-300 px-5 py-3 text-sm font-semibold text-[#1b1205] shadow-glow md:inline-flex"
          >
            <Sparkles size={16} /> Such Wow
          </motion.a>

          <button
            aria-label="Toggle mobile menu"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex rounded-full border border-white/10 bg-white/5 p-3 text-doge-100 md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/5 bg-[#0e0c0b] md:hidden"
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="text-base font-medium text-[#f3e7d1]/80">
                    {item.label}
                  </a>
                ))}
                <a href="#cta" onClick={() => setMobileOpen(false)} className="inline-flex w-fit rounded-full bg-doge-300 px-4 py-2.5 font-semibold text-[#1b1205]">
                  Feed the Vibes
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section id="hero" className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pb-20 pt-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="mb-5 inline-flex rounded-full border border-doge-100/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.36em] text-doge-200/80"
              >
                entertainment only • meme atmosphere engaged
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.7 }}
                className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl"
              >
                EatDoge
                <span className="mt-3 block bg-gradient-to-r from-doge-100 via-doge-300 to-doge-200 bg-clip-text text-transparent">
                  Very snack. Much wow.
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7 }}
                className="mt-6 max-w-2xl text-lg leading-8 text-[#eadfcf]/78 sm:text-xl"
              >
                A suspiciously polished meme universe where Doge eats vibes, snacks, and the remaining fragments of internet seriousness. No utility. No promises. Just glow, motion, and premium nonsense.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7 }}
                className="mt-9 flex flex-col gap-4 sm:flex-row"
              >
                <motion.a whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.98 }} href="#about" className="inline-flex items-center justify-center rounded-full bg-doge-300 px-6 py-4 text-base font-semibold text-[#1a1307] shadow-glow">
                  Enter the Bowl
                </motion.a>
                <motion.a whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} href="#gallery" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-4 text-base font-semibold text-white/90">
                  View Memes
                </motion.a>
              </motion.div>
              <div className="mt-10 flex flex-wrap gap-3">
                {memePhrases.map((phrase, index) => (
                  <motion.span
                    key={phrase}
                    animate={{ y: [0, index % 2 === 0 ? -4 : 4, 0] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 4 + index * 0.4, ease: 'easeInOut' }}
                    className="rounded-full border border-doge-100/10 bg-white/5 px-4 py-2 text-sm text-doge-100/85 shadow-soft"
                  >
                    {phrase}
                  </motion.span>
                ))}
              </div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.8 }} className="relative flex items-center justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 22, ease: 'linear' }} className="absolute h-[22rem] w-[22rem] rounded-full border border-doge-100/10 border-dashed bg-doge-100/5 shadow-glow sm:h-[28rem] sm:w-[28rem]" />
              <motion.div animate={{ rotate: -360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 30, ease: 'linear' }} className="absolute h-[18rem] w-[18rem] rounded-full border border-white/10 sm:h-[22rem] sm:w-[22rem]" />
              <motion.div animate={{ y: [0, -16, 0], rotate: [0, -2, 2, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 5.5, ease: 'easeInOut' }} className="relative z-10">
                <div className="absolute inset-0 rounded-full bg-doge-300/25 blur-3xl" />
                <div className="glass relative rounded-[2.6rem] border border-doge-100/15 px-7 py-8 shadow-glow">
                  <motion.img src={dogeSrc} alt="Doge mascot floating above a bowl of vibes" className="relative z-10 h-64 w-64 animate-wobble object-contain drop-shadow-[0_18px_50px_rgba(206,143,24,0.5)] sm:h-80 sm:w-80" />
                  <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.2 }} className="absolute -right-4 top-5 rounded-full border border-doge-100/20 bg-[#1a140b]/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-doge-100/75">
                    chomp.exe
                  </motion.div>
                  <div className="absolute -left-5 bottom-6 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-soft">
                    maximum vibes
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="mt-16 overflow-hidden rounded-full border border-white/8 bg-white/5 py-3">
            <div className="flex min-w-max gap-4 whitespace-nowrap px-4 text-sm uppercase tracking-[0.32em] text-doge-100/70 animate-marquee">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-4">
                  {item}
                  <span className="text-doge-300">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 px-5 pb-24 sm:px-6 lg:px-8">
          <AnimatedSection id="about" className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-8 shadow-soft sm:p-10">
            <SectionHeading
              eyebrow="what is this"
              title="A snack-powered legend with absolutely no business looking this polished"
              description="EatDoge is a website dedicated to Doge, snacks, glow, and fully intentional internet nonsense. It is not a platform, not a protocol, not a productivity suite. It is a digital mood board for people who respect both good design and bad ideas."
              aside={<p className="rounded-3xl border border-doge-100/15 bg-doge-100/5 p-5 text-sm leading-7 text-[#eadfcf]/75">Tiny legal-ish whisper: this is parody, comedy, aesthetics, and emotional support for your eyeballs. There is nothing to connect, mint, stake, or believe with your bank account.</p>}
            />
            <div className="grid gap-5 md:grid-cols-3">
              {aboutCards.map((card, index) => {
                const Icon = aboutIcons[index]
                return (
                  <motion.article key={card.title} whileHover={{ y: -8, scale: 1.01 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="glass rounded-[1.75rem] border border-white/8 p-6">
                    <div className="mb-4 inline-flex rounded-2xl bg-doge-100/10 p-3 text-doge-200">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                    <p className="mt-3 leading-7 text-[#eadfcf]/74">{card.body}</p>
                  </motion.article>
                )
              })}
            </div>
          </AnimatedSection>

          <AnimatedSection id="features" className="rounded-[2rem] border border-white/8 bg-[#13100e]/80 p-8 shadow-soft sm:p-10">
            <SectionHeading
              eyebrow="meme features"
              title="Fake capabilities, real presentation, dangerous levels of sauce"
              description="These features are spiritually true and technically unserious. Hover respectfully. The Doge aura can smell fear."
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {features.map(([title, body], index) => {
                const Icon = featureIcons[index]
                return (
                  <motion.article key={title} whileHover={{ y: -10, rotate: index % 2 === 0 ? -1 : 1 }} className="group relative overflow-hidden rounded-[1.6rem] border border-doge-100/12 bg-gradient-to-b from-white/8 to-white/[0.02] p-5 shadow-soft">
                    <div className="absolute inset-x-6 top-0 h-24 rounded-b-full bg-doge-300/10 blur-2xl transition duration-300 group-hover:bg-doge-300/20" />
                    <div className="relative z-10">
                      <div className="mb-4 inline-flex rounded-2xl border border-doge-100/15 bg-doge-100/8 p-3 text-doge-200">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#eadfcf]/72">{body}</p>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </AnimatedSection>

          <AnimatedSection id="gallery" className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-8 shadow-soft sm:p-10">
            <SectionHeading
              eyebrow="sticker wall"
              title="Premium Doge portraits for the culturally overinvested"
              description="An entirely serious museum of unserious stickers, captions, and crumb-certified executive titles."
            />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {stickers.map((label, index) => (
                <motion.div key={label} whileHover={{ y: -8, rotate: index % 2 === 0 ? -1.5 : 1.5 }} className="relative overflow-hidden rounded-[1.8rem] border border-doge-100/15 bg-[#171310] p-5 shadow-glow">
                  <div className="absolute -right-6 top-4 rotate-12 rounded-full bg-doge-300/15 px-4 py-1 text-xs uppercase tracking-[0.28em] text-doge-100/70">wow stamp</div>
                  <div className="absolute left-4 top-4 h-14 w-20 -rotate-6 rounded-2xl bg-white/10 blur-sm" />
                  <div className="glass relative rounded-[1.4rem] border border-white/8 px-4 py-5">
                    <div className="absolute right-4 top-4 rounded-full border border-doge-100/20 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-doge-200/80">limited meme</div>
                    <motion.img
                      src={dogeSrc}
                      alt={label}
                      animate={{ y: [0, -10, 0], rotate: [0, -1.5, 1.5, 0] }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 6 + index, ease: 'easeInOut' }}
                      className="mx-auto h-44 w-44 object-contain drop-shadow-[0_12px_24px_rgba(206,143,24,0.4)]"
                    />
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-white">{label}</p>
                        <p className="mt-1 text-sm text-[#eadfcf]/65">Sticker-grade prestige. Fridge compatible in spirit.</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-doge-100/70">#{index + 1}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection id="tokenomics" className="rounded-[2rem] border border-white/8 bg-[#120f0d]/85 p-8 shadow-soft sm:p-10">
            <SectionHeading
              eyebrow="tokenomics but obviously fake"
              title="A beautifully presented pie of jokes, crumbs, and irresponsible percentages"
              description="Satire only. These numbers do not represent economics, assets, governance, or anything your accountant should ever hear about."
            />
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="glass rounded-[1.8rem] border border-doge-100/15 p-6">
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-full border-[18px] border-doge-300/30 border-t-doge-200 border-r-doge-400/80 border-b-white/10 border-l-doge-500/60 shadow-glow">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-doge-100/70">satire index</p>
                    <p className="mt-3 text-5xl font-semibold text-white">100%</p>
                    <p className="mt-2 text-sm text-[#eadfcf]/70">legally unserious</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {tokenomics.map(([value, label], index) => (
                  <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-sm uppercase tracking-[0.28em] text-doge-100/75">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/6">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: value }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: index * 0.08 }}
                        className="h-full rounded-full bg-gradient-to-r from-doge-500 via-doge-300 to-doge-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection id="faq" className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-8 shadow-soft sm:p-10">
            <SectionHeading
              eyebrow="faq"
              title="Questions from the brave, the curious, and the terminally online"
              description="Short answers for long stares. Everything here remains firmly in the category of fun internet theater."
            />
            <div className="space-y-4">
              {faqs.map(([question, answer], index) => {
                const isOpen = activeFaq === index
                return (
                  <div key={question} className="overflow-hidden rounded-[1.4rem] border border-white/8 bg-[#15110f]">
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-lg font-medium text-white">{question}</span>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="rounded-full border border-white/10 p-2 text-doge-200">
                        <ChevronDown size={18} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-5 pb-5">
                          <p className="max-w-3xl leading-7 text-[#eadfcf]/72">{answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </AnimatedSection>

          <AnimatedSection id="cta" className="relative overflow-hidden rounded-[2.2rem] border border-doge-100/12 bg-gradient-to-br from-[#1c150d] via-[#120f0d] to-[#0c0a09] p-8 shadow-glow sm:p-12">
            <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.34, 0.2] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 6 }} className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,219,153,0.25),transparent_50%)]" />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-doge-200/75">final vibe transmission</p>
                <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Join the snack side.</h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#eadfcf]/78">Hover over the buttons. Absorb the glow. Stare into the Doge. Leave with absolutely no utility and mysteriously improved morale.</p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  {['Bark Respectfully', 'Absorb the Vibes', 'Stare at Doge'].map((label) => (
                    <motion.a key={label} href="#hero" whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.98 }} className="inline-flex justify-center rounded-full border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white shadow-soft">
                      {label}
                    </motion.a>
                  ))}
                </div>
              </div>
              <div className="relative flex justify-center">
                <motion.div animate={{ y: [0, -14, 0], rotate: [0, -3, 3, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 5.2 }} className="relative rounded-[2rem] border border-doge-100/15 bg-white/5 p-6 shadow-glow">
                  <div className="absolute -left-6 top-8 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.3em] text-doge-100/70">wow relic</div>
                  <img src={dogeSrc} alt="EatDoge mascot in final call to action" className="h-56 w-56 object-contain drop-shadow-[0_18px_36px_rgba(206,143,24,0.55)]" />
                </motion.div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </main>

      <footer className="border-t border-white/6 bg-[#090807]/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <img src={dogeSrc} alt="EatDoge footer logo" className="h-14 w-14 rounded-full border border-doge-100/15 bg-doge-100/8 p-2 shadow-glow" />
            <div>
              <p className="text-xl font-semibold text-white">eatdoge.com</p>
              <p className="mt-1 text-sm text-[#eadfcf]/62">For entertainment, memes, and spiritual snacking only.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#eadfcf]/70">
            {[
              { label: 'X', href: 'https://example.com', Icon: Sparkles },
              { label: 'Telegram', href: 'https://example.com', Icon: Send },
              { label: 'Instagram', href: 'https://example.com', Icon: Instagram },
            ].map(({ label, href, Icon }) => (
              <a key={label} href={href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 hover:border-doge-100/25 hover:text-white">
                <Icon size={16} />
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
