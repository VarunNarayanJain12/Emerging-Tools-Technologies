import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Bell,
  BarChart,
  FileText,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
  Brain,
  AlertCircle,
  Filter,
} from "lucide-react"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { DashboardPreview } from "@/components/sections/DashboardPreview"

gsap.registerPlugin(ScrollTrigger)

export function Features() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"teacher" | "counsellor">("teacher")

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top center+=100",
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [activeTab])

  const teacherFeatures = [
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Performance Analytics",
      description:
        "Visual dashboards showing attendance trends, assessment scores, and historical performance data.",
    },
    {
      icon: <AlertCircle className="w-6 h-6" />,
      title: "Risk Indicators",
      description:
        "Color-coded alerts (Green, Yellow, Red) for easy identification of at-risk students.",
    },
    {
      icon: <Filter className="w-6 h-6" />,
      title: "Smart Filters",
      description:
        "Filter students by risk level, department, semester, or custom criteria.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Detailed Reports",
      description:
        "Generate comprehensive reports with attendance, marks, and attempt history.",
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Automated Alerts",
      description:
        "Receive notifications when students cross critical risk thresholds.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Trend Analysis",
      description:
        "Track student progress over time with intuitive graphs and visualizations.",
    },
  ]

  const counsellorFeatures = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "LLM-Powered Insights",
      description:
        "Get AI-generated explanations and intervention recommendations using RAG.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Student Profiles",
      description:
        "Access consolidated student data including academic and behavioral indicators.",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Communication Hub",
      description:
        "Direct messaging with students and guardians for effective follow-up.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Intervention Tracking",
      description:
        "Document interventions, meetings, and track their effectiveness over time.",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Case Management",
      description:
        "Organize and manage student cases with notes, documents, and action items.",
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Success Metrics",
      description:
        "Measure intervention effectiveness with data-driven success indicators.",
    },
  ]

  const features = activeTab === "teacher" ? teacherFeatures : counsellorFeatures

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-orange-50 via-cream-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/20 dark:bg-orange-600/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful{" "}
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Features
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
            Tailored dashboards for teachers and counsellors with specialized
            tools
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg border border-orange-200 dark:border-orange-900/30">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === "teacher"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
            >
              Teacher Dashboard
            </button>
            <button
              onClick={() => setActiveTab("counsellor")}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === "counsellor"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
            >
              Counsellor Dashboard
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card group p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-orange-100 dark:border-orange-900/30 hover:scale-105 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              All features include role-based access control and data privacy
              compliance
            </span>
          </div>
        </div>

        {/* Dashboard scroll preview */}
        <ContainerScroll
          titleComponent={
            <div className="space-y-3">
              <p className="text-sm font-semibold text-orange-500 uppercase tracking-widest">Live Preview</p>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
                See the{" "}
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {activeTab === "teacher" ? "Teacher" : "Student"}
                </span>{" "}
                Dashboard
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto">
                {activeTab === "teacher"
                  ? "Monitor all students, track risk levels, and take action — all from one place."
                  : "Students get a clear view of their risk score, attendance, and academic performance."}
              </p>
            </div>
          }
        >
          <DashboardPreview tab={activeTab} />
        </ContainerScroll>
      </div>
    </section>
  )
}