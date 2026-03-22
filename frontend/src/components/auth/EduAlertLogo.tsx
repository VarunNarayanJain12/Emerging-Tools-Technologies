import { BellRing } from 'lucide-react'

export function EduAlertLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11'
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl'
  const subSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const bellSize = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className="flex items-center gap-3">
      <div className={`${iconSize} bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg`}>
        <BellRing className={`${bellSize} text-white`} />
      </div>
      <div>
        <p className={`${textSize} font-bold text-gray-900 dark:text-white leading-tight`}>EduAlert</p>
        <p className={`${subSize} text-orange-500 font-medium`}>Manipal University Jaipur</p>
      </div>
    </div>
  )
}
