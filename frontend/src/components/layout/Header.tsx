import { useEffect, useState } from "react"
import { ThemeToggle } from "../ui/ThemeToggle"
import { BellRing } from "lucide-react"

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg rounded-b-[2rem] mx-4 mt-2"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl"><BellRing className="w-7 h-7 text-white" /></span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                EduAlert
              </h1>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Manipal University Jaipur
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#home"
              className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
            >
              Home
            </a>
            <a
              href="#about"
              className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#features"
              className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
            >
              Workflow
            </a>
            <a
              href="#contact"
              className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
            >
              Contact
            </a>
          </div>

          {/* Theme Toggle & CTA */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <a href="/login" className="hidden md:block px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300">
              Get Started
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}