import { Link } from 'react-router-dom';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { ShieldAlert } from 'lucide-react';

export default function TeacherRegister() {
  return (
    <AuthFormCard
      title="Access Restricted"
      description="Institutional registration is closed"
      footer={
        <Link to="/teacher/login" className="text-orange-500 hover:text-orange-600 font-bold flex items-center justify-center gap-2">
          Back to Login
        </Link>
      }
    >
      <div className="py-8 text-center space-y-4">
        <div className="inline-flex p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-gray-900 dark:text-white font-bold text-lg">Invitation Only</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Registration is by invitation only. Please contact your institution administrator to obtain credentials.
          </p>
        </div>
      </div>
    </AuthFormCard>
  );
}
