'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Copy, Check, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { demoAccounts, roleLabels, homePathForRole } from '@/lib/demoAccounts';

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  color: string;
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: { remember: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const result = await login(data.email, data.password, data.remember);
    setIsLoading(false);
    if (!result.ok) {
      setError('email', { message: result.error });
      toast.error(result.error);
      return;
    }
    const account = result.user;
    toast.success(`Welcome back, ${account.name}!`);
    router.push(homePathForRole(account.role));
  };

  const fillCredentials = (account: DemoAccount) => {
    setValue('email', account.email);
    setValue('password', account.password);
  };

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      /* clipboard unavailable */
    }
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const inputBase =
    'w-full bg-[#051424] border border-[#273647] rounded-lg py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-150';

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap gap-2">
        {demoAccounts.map((account) => (
          <div
            key={`demo-${account.role}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 pl-3 pr-2 py-1.5 cursor-pointer hover:border-primary/40 hover:glow-hover transition-colors"
            onClick={() => fillCredentials(account)}
            title={`Use ${roleLabels[account.role]} demo account`}
          >
            <span className={`text-[11px] font-bold ${account.color}`}>
              {roleLabels[account.role]}
            </span>
            <span className="text-[11px] text-muted-foreground">{account.email}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(account.email, `email-${account.role}`);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy email"
            >
              {copiedField === `email-${account.role}` ? (
                <Check size={11} className="text-accent" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2 ml-1">
            Operator Email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="email"
              className={`${inputBase} pl-10 ${errors.email ? 'border-danger focus:border-danger focus:ring-danger/50' : ''}`}
              placeholder="you@zoox-ps.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
            />
          </div>
          {errors.email && <p className="text-xs text-danger mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground ml-1">
              Security Access Key
            </label>
            <button type="button" className="text-xs text-primary font-semibold hover:underline">
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              className={`${inputBase} pl-10 pr-10 ${errors.password ? 'border-danger focus:border-danger focus:ring-danger/50' : ''}`}
              placeholder="••••••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-danger mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-[#273647] bg-input accent-primary"
              {...register('remember')}
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white font-bold uppercase tracking-[0.14em] py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Initialize System
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By logging in, you agree to our{' '}
        <span className="text-primary font-semibold cursor-pointer">Terms</span> and{' '}
        <span className="text-primary font-semibold cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
}
