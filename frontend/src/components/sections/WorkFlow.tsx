import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Upload, Database, Brain, Eye, Bell, MessageCircle,
} from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    num: "01", icon: "upload", side: "left",
    title: "Data Ingestion",
    description: "Upload or sync attendance records, assessment scores, and subject attempt data directly from existing spreadsheets.",
    stat: "3 sources", statLabel: "attendance · scores · attempts",
    bg: "from-orange-400 to-orange-500",
  },
  {
    num: "02", icon: "database", side: "right",
    title: "Data Fusion",
    description: "All student records are merged into consolidated profiles, enabling holistic cross-dimensional performance analysis.",
    stat: "1 profile", statLabel: "per student, unified",
    bg: "from-orange-500 to-orange-600",
  },
  {
    num: "03", icon: "brain", side: "left",
    title: "Risk Identification",
    description: "Rule-based ML evaluates thresholds for attendance, marks trends, and subject attempts to classify each student's risk level.",
    stat: "Rule-based", statLabel: "threshold classification",
    bg: "from-orange-600 to-red-500",
  },
  {
    num: "04", icon: "eye", side: "right",
    title: "Visualization",
    description: "Dashboards display color-coded risk indicators — GREEN, YELLOW, RED — with drill-down capabilities for every student.",
    stat: "Real-time", statLabel: "GREEN · YELLOW · RED",
    bg: "from-red-500 to-red-600",
  },
  {
    num: "05", icon: "bell", side: "left",
    title: "Alert Generation",
    description: "Automatic in-app and email notifications are dispatched to teachers and guardians when students cross risk thresholds.",
    stat: "Auto", statLabel: "in-app · email alerts",
    bg: "from-red-600 to-orange-600",
  },
  {
    num: "06", icon: "message", side: "right",
    title: "Counselling",
    description: "Counsellors log sessions, track interventions, and use LLM-powered RAG explanations grounded in institutional policies.",
    stat: "RAG", statLabel: "policy-grounded AI",
    bg: "from-orange-600 to-orange-500",
  },
]

function Icon({ name, className = "w-8 h-8" }: { name: string; className?: string }) {
  if (name === "upload")   return <Upload className={className} />
  if (name === "database") return <Database className={className} />
  if (name === "brain")    return <Brain className={className} />
  if (name === "eye")      return <Eye className={className} />
  if (name === "bell")     return <Bell className={className} />
  return <MessageCircle className={className} />
}

const TECH = [
  { name: "Machine Learning", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSz0_2T7QvYteuK6hRVylPfdcJlNwoKW1-Msg&s", desc: "Predictive risk modeling" },
  { name: "LLMs & RAG", img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80", desc: "Contextual explanations" },
  { name: "Vector Database", img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80", desc: "Semantic search & retrieval" },
  { name: "Docker & Kubernetes", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRduCbNCZimPTZV5YzV0pc_pdxBffP84mVDMg&s", desc: "Scalable containerized deployment" },
]

function TechCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = trackRef.current
    if (el && el.children.length === TECH.length) {
      el.insertAdjacentHTML("beforeend", el.innerHTML)
    }
  }, [])
  return (
    <div className="overflow-hidden w-full">
      <div ref={trackRef} className="flex gap-6" style={{ animation: "wfScroll 28s linear infinite" }}>
        {TECH.map((t, i) => (
          <div key={i} className="shrink-0 w-72 group">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-orange-200 dark:border-orange-900/30 bg-white dark:bg-gray-800">
              <div className="relative h-44 overflow-hidden">
                <img src={t.img} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-orange-600 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full shadow">{t.name}</span>
                </div>
              </div>
              <div className="p-4"><p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes wfScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  )
}

export function Workflow() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const lineRef    = useRef<HTMLDivElement>(null)
  const cardRefs   = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs    = useRef<(HTMLDivElement | null)[]>([])
  const ringRefs   = useRef<(HTMLDivElement | null)[]>([])
  const iconRefs   = useRef<(HTMLDivElement | null)[]>([])
  const lineSegRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial state — cards dimmed and off-side
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const isLeft = STEPS[i].side === "left"
        gsap.set(card, { x: isLeft ? -80 : 80, opacity: 0.3 })
      })

      // Initial dots — grey
      dotRefs.current.forEach(dot => {
        if (dot) gsap.set(dot, { backgroundColor: "#d1d5db", scale: 1 })
      })

      // Per-step ScrollTrigger
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const dot    = dotRefs.current[i]
        const ring   = ringRefs.current[i]
        const icon   = iconRefs.current[i]
        const seg    = lineSegRefs.current[i]

        ScrollTrigger.create({
          trigger: card,
          start: "top 65%",
          once: true,
          onEnter: () => {
            // Card slides in
            gsap.to(card, {
              x: 0, opacity: 1, duration: 0.7,
              ease: "power3.out",
            })
            // Add orange border glow class
            card.classList.add("wf-active")

            // Icon bounce
            if (icon) {
              gsap.fromTo(icon,
                { scale: 0.4, rotation: -15 },
                { scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.5)", delay: 0.2 }
              )
            }

            // Dot fills orange with scale pop
            if (dot) {
              gsap.to(dot, { backgroundColor: "#f97316", scale: 1.5, duration: 0.4, ease: "back.out(2)" })
              gsap.to(dot, { scale: 1.2, duration: 0.3, delay: 0.4 })
            }

            // Pulse ring
            if (ring) {
              gsap.fromTo(ring,
                { scale: 1, opacity: 0.8 },
                { scale: 2.5, opacity: 0, duration: 1.2, ease: "power2.out", repeat: 2, delay: 0.1 }
              )
            }

            // Line segment fills
            if (seg) {
              gsap.fromTo(seg,
                { scaleY: 0, transformOrigin: "top center" },
                { scaleY: 1, duration: 0.6, ease: "power2.out", delay: 0.1 }
              )
            }
          },
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="workflow" ref={sectionRef} className="bg-white dark:bg-gray-900 overflow-hidden">
      <style>{`
        .wf-active {
          border-color: rgba(249,115,22,0.5) !important;
          box-shadow: 0 0 0 1px rgba(249,115,22,0.2), 0 20px 60px rgba(249,115,22,0.12);
        }
        .dark .wf-active {
          border-color: rgba(249,115,22,0.4) !important;
          box-shadow: 0 0 0 1px rgba(249,115,22,0.15), 0 20px 60px rgba(249,115,22,0.1);
        }
      `}</style>

      {/* Header */}
      <div className="container mx-auto px-6 pt-20 pb-4 text-center">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">How It Works</p>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Six Steps to{" "}
          <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            Early Intervention
          </span>
        </h2>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          A seamless process from raw data to timely counselling
        </p>
      </div>

      {/* Timeline */}
      <div className="relative container mx-auto px-4 md:px-6 py-16">

        {/* Center vertical line (grey base) */}
        <div
          ref={lineRef}
          className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2 hidden md:block"
        />

        {/* Mobile left line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 md:hidden" />

        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const isLeft = step.side === "left"
            return (
              <div key={i} className="relative flex items-center min-h-[220px] md:min-h-[260px]">

                {/* Orange line segment fill (sits on top of grey line) */}
                <div
                  ref={el => { lineSegRefs.current[i] = el }}
                  className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-orange-500 hidden md:block"
                  style={{ top: 0, height: "100%", transform: "scaleY(0)", transformOrigin: "top center" }}
                />
                {/* Mobile segment */}
                <div
                  className="absolute left-6 -translate-x-1/2 w-0.5 bg-orange-500 md:hidden"
                  style={{ top: 0, height: "100%" }}
                />

                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                  {/* Pulse ring */}
                  <div
                    ref={el => { ringRefs.current[i] = el }}
                    className="absolute inset-0 rounded-full bg-orange-400 opacity-0"
                    style={{ margin: "-6px" }}
                  />
                  <div
                    ref={el => { dotRefs.current[i] = el }}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 shadow-md"
                    style={{ backgroundColor: "#d1d5db" }}
                  />
                </div>

                {/* Mobile dot */}
                <div className="absolute left-6 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 md:hidden">
                  <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900 shadow" />
                </div>

                {/* Card — left side */}
                {isLeft && (
                  <>
                    <div className="w-full md:w-[46%] md:pr-12 pl-12 md:pl-0">
                      <div
                        ref={el => { cardRefs.current[i] = el }}
                        className="rounded-3xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-lg p-7 relative overflow-hidden transition-colors duration-300"
                      >
                        {/* Ghost number */}
                        <span className="absolute top-3 right-4 text-7xl font-black text-gray-100 dark:text-gray-700 select-none leading-none">
                          {step.num}
                        </span>

                        <div className="flex items-start gap-4 relative z-10">
                          <div
                            ref={el => { iconRefs.current[i] = el }}
                            className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${step.bg} flex items-center justify-center text-white shadow-lg`}
                          >
                            <Icon name={step.icon} className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{step.description}</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                              <span className="text-base font-black text-orange-500">{step.stat}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">{step.statLabel}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block md:w-[54%]" />
                  </>
                )}

                {/* Card — right side */}
                {!isLeft && (
                  <>
                    <div className="hidden md:block md:w-[54%]" />
                    <div className="w-full md:w-[46%] md:pl-12 pl-12">
                      <div
                        ref={el => { cardRefs.current[i] = el }}
                        className="rounded-3xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-lg p-7 relative overflow-hidden transition-colors duration-300"
                      >
                        <span className="absolute top-3 right-4 text-7xl font-black text-gray-100 dark:text-gray-700 select-none leading-none">
                          {step.num}
                        </span>

                        <div className="flex items-start gap-4 relative z-10">
                          <div
                            ref={el => { iconRefs.current[i] = el }}
                            className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${step.bg} flex items-center justify-center text-white shadow-lg`}
                          >
                            <Icon name={step.icon} className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{step.description}</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                              <span className="text-base font-black text-orange-500">{step.stat}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">{step.statLabel}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tech stack */}
      <div className="container mx-auto px-6 pb-20">
        <div className="p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 rounded-3xl border border-orange-200 dark:border-orange-900/30 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Powered By Modern Technologies
          </h3>
          <TechCarousel />
        </div>
      </div>
    </section>
  )
}
