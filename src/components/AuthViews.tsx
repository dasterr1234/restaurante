import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  UserCheck,
  X,
  ArrowRight,
  Smartphone,
  UserPlus,
  Building2,
} from 'lucide-react';
import { KaonashiMark } from './Price';
import type { CustomerAccount, LocaleCode, StaffAccount } from '../lib/types';

export const DEFAULT_STAFF_PASSWORDS: Record<string, string> = {
  kaonashi_sysmaster: 'KaonashiAdmin!2026',
  btl_camila: 'KaonashiBTL!2026',
  ops_mateo: 'KaonashiOps!2026',
  itamae_ken: 'KaonashiChef!2026',
  host_sofia: 'KaonashiHost!2026',
};

export interface UnifiedAuthProps {
  locale: LocaleCode;
  staffList: StaffAccount[];
  staffPasswords: Record<string, string>;
  onAdminAuthenticated: (staff: StaffAccount) => void;
  onCustomerAuthenticated: (email: string, name: string, locale: LocaleCode) => Promise<void>;
  onRequestEmailOtp: (email: string) => Promise<{ challengeId: string; simulatedCode: string }>;
  onVerifyEmailOtp: (email: string, code: string) => Promise<boolean>;
  onRegisterCustomer: (payload: {
    name: string;
    email: string;
    phone: string;
  }) => Promise<CustomerAccount>;
  onClose?: () => void;
}

/**
 * Single Unified Login Card used both inside the modal (`UnifiedAuthModal`)
 * and when accessing `/login` or `/admin` directly while unauthenticated.
 *
 * - If the user enters Admin/Staff credentials -> routes to Vista Admin (with 2FA step if enabled).
 * - If the user enters Customer credentials -> routes to Vista Cliente.
 * - Public registration ONLY creates Customer accounts (Admin creation is restricted to logged-in Admins).
 */
export const UnifiedLoginCard: React.FC<UnifiedAuthProps> = ({
  locale,
  staffList,
  staffPasswords,
  onAdminAuthenticated,
  onCustomerAuthenticated,
  onRequestEmailOtp,
  onVerifyEmailOtp,
  onRegisterCustomer,
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'otp' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA TOTP step for Admin accounts that require 2FA
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [pendingStaff, setPendingStaff] = useState<StaffAccount | null>(null);
  const [totpCode, setTotpCode] = useState('123456');

  // OTP states for passwordless customer login
  const [otpEmail, setOtpEmail] = useState('mia.valencia@designstudio.co');
  const [pendingOtp, setPendingOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Customer registration states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+57 300 000 0000');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Detect whether the current identifier matches a registered Admin/Staff account
  const normalizedInput = identifier.trim().toLowerCase();
  const matchedStaff = normalizedInput
    ? staffList.find(
        (s) =>
          s.emailAlias.toLowerCase() === normalizedInput ||
          s.username.toLowerCase() === normalizedInput
      )
    : undefined;

  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!normalizedInput) {
      setError('Ingresa tu correo electrónico o usuario.');
      return;
    }

    if (!password || password.trim().length < 4) {
      setError('Ingresa tu contraseña (mínimo 4 caracteres).');
      return;
    }

    // 1. Check if credentials belong to an Admin / Staff account
    if (matchedStaff) {
      const expectedPass =
        staffPasswords[matchedStaff.username] ||
        DEFAULT_STAFF_PASSWORDS[matchedStaff.username] ||
        'KaonashiAdmin!2026';

      if (password !== expectedPass) {
        setError('Contraseña administrativa incorrecta para esta cuenta corporativa.');
        return;
      }

      if (matchedStaff.totpEnabled || matchedStaff.mfaRequired) {
        setPendingStaff(matchedStaff);
        setTotpCode('123456');
        setStep('totp');
        return;
      }

      onAdminAuthenticated(matchedStaff);
      if (onClose) onClose();
      return;
    }

    // 2. Otherwise, authenticate as Customer (Vista Cliente)
    if (!normalizedInput.includes('@')) {
      setError(
        'Usuario administrativo no encontrado. Si eres cliente, ingresa tu correo electrónico con @.'
      );
      return;
    }

    const displayName = normalizedInput.includes('kenji')
      ? 'Kenji Takahashi'
      : normalizedInput.includes('mia')
      ? 'Mia Valencia'
      : identifier.split('@')[0];

    await onCustomerAuthenticated(normalizedInput, displayName, locale);
    if (onClose) onClose();
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pendingStaff) return;

    if (totpCode.trim() !== '123456') {
      setError('Código TOTP de 6 dígitos inválido. Usa el token del autenticador: 123456.');
      return;
    }

    onAdminAuthenticated(pendingStaff);
    if (onClose) onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!regName.trim() || !cleanEmail.includes('@')) {
      setError('Completa tu nombre y correo electrónico válido.');
      return;
    }

    // Prevent registering an @kaonashi.internal admin email from public registration
    if (
      cleanEmail.endsWith('@kaonashi.internal') ||
      staffList.some((s) => s.emailAlias.toLowerCase() === cleanEmail)
    ) {
      setError(
        'Acción denegada: Las cuentas de Administrador solo pueden ser creadas por otro Administrador activo desde el Panel Admin.'
      );
      return;
    }

    await onRegisterCustomer({
      name: regName.trim(),
      email: cleanEmail,
      phone: regPhone.trim(),
    });
    if (onClose) onClose();
  };

  return (
    <div className="bg-kns-surface border border-kns-primary/40 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl mx-auto">
      {/* Header */}
      <div className="p-6 bg-kns-bg border-b border-kns-hairline flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KaonashiMark className="w-8 h-8" />
          <div>
            <div className="text-[11px] font-mono-tabular text-kns-primary uppercase tracking-wider">
              ACCESO UNIFICADO · DETECCIÓN AUTOMÁTICA DE ROL
            </div>
            <h2 className="font-display text-2xl text-kns-text">
              Iniciar Sesión en Kaonashi
            </h2>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de acceso"
            className="p-1.5 rounded-lg text-kns-muted hover:text-kns-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      {step === 'credentials' && (
        <div className="grid grid-cols-3 gap-1 p-2 bg-kns-bg/60 border-b border-kns-hairline text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg font-medium cursor-pointer ${
              tab === 'login'
                ? 'bg-kns-primary text-kns-on-primary font-semibold'
                : 'text-kns-muted hover:text-kns-text'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('otp');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg font-medium cursor-pointer ${
              tab === 'otp'
                ? 'bg-kns-primary text-kns-on-primary font-semibold'
                : 'text-kns-muted hover:text-kns-text'
            }`}
          >
            Código OTP (6 dígitos)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg font-medium cursor-pointer ${
              tab === 'register'
                ? 'bg-kns-primary text-kns-on-primary font-semibold'
                : 'text-kns-muted hover:text-kns-text'
            }`}
          >
            Crear Cuenta Cliente
          </button>
        </div>
      )}

      <div className="p-6 space-y-5">
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-[#E63946]/60 bg-[#E63946]/15 text-xs text-kns-text flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-[#E63946] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'totp' && pendingStaff ? (
          <div className="space-y-5">
            <div>
              <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                VERIFICACIÓN 2FA TOTP · CUENTA ADMINISTRATIVA DETECTADA
              </div>
              <h3 className="font-display text-xl text-kns-text mt-1">
                Autenticación de Segundo Factor
              </h3>
              <p className="text-xs text-kns-muted mt-1">
                Se detectaron credenciales de Administrador (
                <strong>{pendingStaff.displayName}</strong>). Ingresa tu código TOTP de 6 dígitos
                para abrir la <strong>Vista Admin & Analítica Confidencial</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-kns-primary/50 bg-kns-primary/10 text-xs font-mono-tabular">
              <div className="flex items-center justify-between text-kns-primary font-bold">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  AUTHENTICATOR CORPORATIVO (SIMULADO):
                </span>
                <span>30s</span>
              </div>
              <div className="text-kns-text mt-1">
                Código TOTP activo para {pendingStaff.emailAlias}:{' '}
                <strong className="text-sm text-kns-primary underline">123456</strong>
              </div>
            </div>

            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                aria-label="Código TOTP de 6 dígitos"
                className="w-full px-4 py-3 rounded-xl bg-kns-bg border border-kns-primary text-lg tracking-[0.35em] text-center font-mono-tabular text-kns-text focus:outline-none"
                required
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setPendingStaff(null);
                    setError(null);
                  }}
                  className="px-4 py-3 rounded-xl border border-kns-hairline bg-kns-bg text-xs text-kns-muted hover:text-kns-text cursor-pointer"
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-5 rounded-xl bg-kns-primary text-kns-on-primary font-semibold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verificar & Abrir Vista Admin</span>
                </button>
              </div>
            </form>
          </div>
        ) : tab === 'login' ? (
          <div className="space-y-5">
            <p className="text-xs text-kns-muted leading-relaxed">
              Ingresa tus credenciales en este único acceso: si tu cuenta es de{' '}
              <strong className="text-kns-text">Cliente</strong> verás la vista de reservas y
              pedidos; si tu cuenta es de <strong className="text-kns-primary">Administrador</strong>
              , se desbloqueará automáticamente la vista de analítica y gestión.
            </p>

            <form onSubmit={handleUnifiedSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="unified-identifier" className="text-xs text-kns-muted">
                    Correo Electrónico o Usuario
                  </label>
                  {normalizedInput && (
                    <span
                      className={`text-[10px] font-mono-tabular px-2 py-0.5 rounded ${
                        matchedStaff
                          ? 'bg-kns-primary/20 text-kns-primary border border-kns-primary/40'
                          : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {matchedStaff
                        ? `Rol Admin detectado: ${matchedStaff.role.toUpperCase()}`
                        : 'Perfil detectado: CLIENTE'}
                    </span>
                  )}
                </div>
                <input
                  id="unified-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="cliente@correo.com o master@kaonashi.internal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text focus:outline-none focus:border-kns-primary font-mono-tabular"
                  required
                />
              </div>

              <div>
                <label htmlFor="unified-password" className="block text-xs text-kns-muted mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="unified-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text focus:outline-none focus:border-kns-primary font-mono-tabular"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Mostrar u ocultar contraseña"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-kns-muted hover:text-kns-text cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {matchedStaff
                    ? 'Continuar a Vista Admin (Confidencial)'
                    : 'Iniciar Sesión'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Selector divided cleanly into Cliente vs Admin */}
            <div className="pt-3 border-t border-kns-hairline space-y-3">
              <div className="text-[11px] font-mono-tabular text-kns-muted uppercase">
                Autocompletar Credenciales de Prueba (1-Clic):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cliente Demo */}
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('mia.valencia@designstudio.co');
                    setPassword('Omakase2026!');
                    setError(null);
                  }}
                  className="p-3 rounded-xl border border-kns-hairline bg-kns-bg hover:border-emerald-500/50 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-kns-text flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Mia Valencia
                    </span>
                    <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                      VISTA CLIENTE
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-tabular text-kns-muted mt-1 truncate">
                    mia.valencia@designstudio.co
                  </div>
                </button>

                {/* Admin Demo */}
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('master@kaonashi.internal');
                    setPassword(
                      staffPasswords['kaonashi_sysmaster'] ||
                        DEFAULT_STAFF_PASSWORDS['kaonashi_sysmaster']
                    );
                    setError(null);
                  }}
                  className="p-3 rounded-xl border border-kns-primary/40 bg-kns-bg hover:bg-kns-primary/10 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-kns-text flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-kns-primary" />
                      Hiroshi Sato
                    </span>
                    <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-kns-primary text-kns-on-primary font-semibold">
                      VISTA ADMIN
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-tabular text-kns-primary mt-1 truncate">
                    master@kaonashi.internal
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : tab === 'otp' ? (
          <div className="space-y-4">
            <p className="text-xs text-kns-muted">
              Recibe un código único de 6 dígitos en tu correo de cliente para entrar sin contraseña.
            </p>
            {!pendingOtp ? (
              <div className="space-y-3">
                <input
                  type="email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const res = await onRequestEmailOtp(otpEmail);
                    setPendingOtp(res.simulatedCode);
                    setEnteredOtp(res.simulatedCode);
                  }}
                  className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
                >
                  Enviar Código OTP de 6 Dígitos
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-kns-primary/50 bg-kns-primary/10 text-xs font-mono-tabular">
                  <div className="text-kns-primary font-bold">
                    BANDEJA DE ENTRADA SIMULADA:
                  </div>
                  <div className="text-kns-text mt-1">
                    Para: {otpEmail} · Código OTP: <strong>{pendingOtp}</strong>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-kns-bg border border-kns-primary text-center font-mono-tabular text-lg tracking-widest text-kns-text"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await onVerifyEmailOtp(otpEmail, enteredOtp);
                    if (ok) {
                      setPendingOtp(null);
                      if (onClose) onClose();
                    } else {
                      setError('Código OTP incorrecto.');
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
                >
                  Verificar Código e Ir a Vista Cliente
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-kns-bg border border-kns-hairline text-[11px] text-kns-muted flex items-start gap-2">
              <Lock className="w-4 h-4 text-kns-primary shrink-0 mt-0.5" />
              <span>
                Este formulario crea exclusivamente cuentas de <strong>Cliente</strong>. Por
                seguridad, solo un usuario <strong>Admin</strong> autenticado puede crear otro
                usuario Admin desde el Panel Administrativo.
              </span>
            </div>

            <div>
              <label className="block text-xs text-kns-muted mb-1">Nombre Completo *</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ej. Valentina Gómez"
                className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-kns-muted mb-1">Correo Electrónico *</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="valentina@ejemplo.co"
                className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-kns-muted mb-1">
                Teléfono Móvil (WhatsApp/SMS)
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text"
              />
            </div>
            <div>
              <label className="block text-xs text-kns-muted mb-1">Crear Contraseña *</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl bg-kns-bg border border-kns-hairline text-sm text-kns-text"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
            >
              Crear Cuenta de Cliente
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const UnifiedAuthModal: React.FC<
  UnifiedAuthProps & {
    isOpen: boolean;
  }
> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inicio de sesión unificado Kaonashi"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <UnifiedLoginCard {...props} />
    </div>
  );
};
