import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from '@/components/login-form';

export const metadata = {
  title: 'Ingresar · Hisamed',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/');

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-8">
      <div className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          Iniciar sesión
        </h2>
        <p className="text-sm text-zinc-500">
          Accede con tu correo y contraseña.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
