import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from '@/lib/supabase';

type Mode = 'login' | 'register';

const C = {
  bg: '#F4F8F7', ink: '#19352F', muted: '#6B817A', primary: '#137B6B', dark: '#0B5148',
  line: '#D6E5DF', surface: '#FFFFFF', soft: '#E6F4EF', error: '#B73343',
};

function readableError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo desde el enlace que te enviamos.';
  if (m.includes('user already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('email rate limit')) return 'Demasiados intentos. Intenta de nuevo más tarde.';
  if (m.includes('failed to fetch') || m.includes('network request failed')) return 'No se pudo conectar a Supabase. Revisa Internet y las credenciales.';
  return message;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(Boolean(supabase));
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let mounted = true;
    client.auth.getSession().then(({ data, error: initialError }) => {
      if (!mounted) return;
      setSession(data.session);
      if (initialError) setError(readableError(initialError.message));
      setChecking(false);
    }).catch(() => {
      if (mounted) { setChecking(false); setError('No se pudo recuperar la sesión.'); }
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  function switchMode(nextMode: Mode) {
    setMode(nextMode); setError(''); setNotice(''); setPassword('');
  }

  async function submit() {
    if (!supabase || busy) return;
    setError(''); setNotice('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) { setError('Escribe un correo electrónico válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (mode === 'register' && !name.trim()) { setError('Escribe tu nombre para registrarte.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { full_name: name.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Registro recibido. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.');
          setMode('login'); setPassword('');
        } else {
          setNotice('¡Tu cuenta fue creada correctamente!');
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (signInError) throw signInError;
        setPassword('');
      }
    } catch (err) {
      setError(readableError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.'));
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(readableError(signOutError.message));
    else { setPassword(''); setNotice('Sesión cerrada correctamente.'); }
    setBusy(false);
  }

  const fullName = session?.user.user_metadata?.full_name;
  const displayName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : 'Usuario';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><Text style={styles.logoText}>🔒</Text></View>
          <Text style={styles.brandName}>MI SISTEMA</Text>
          <Text style={styles.subtitle}>Acceso seguro · PWA en React Native + Supabase</Text>
        </View>

        <View style={styles.card}>
          {!configured ? (
            <>
              <Text style={styles.heading}>Configurar Supabase</Text>
              <Text style={styles.paragraph}>La aplicación ya incluye el registro y el inicio de sesión. Solo falta conectar tu proyecto de Supabase.</Text>
              <View style={styles.info}><Text style={styles.infoText}>1. Crea un proyecto en supabase.com.{'\n'}2. Copia .env.example como .env.{'\n'}3. Agrega tu Project URL y Publishable key.{'\n'}4. Reinicia con npx expo start --web --clear.</Text></View>
              <Text style={styles.small}>Completa la configuración de Supabase y reinicia la aplicación.</Text>
            </>
          ) : checking ? (
            <View style={styles.loading}><ActivityIndicator color={C.primary} size="large" /><Text style={styles.paragraph}>Verificando sesión...</Text></View>
          ) : session ? (
            <>
              <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>
              <Text style={[styles.heading, styles.center]}>¡Bienvenido, {displayName}!</Text>
              <Text style={[styles.paragraph, styles.center]}>Has iniciado sesión correctamente.</Text>
              <View style={styles.info}>
                <Text style={styles.caption}>CORREO REGISTRADO</Text>
                <Text style={styles.value}>{session.user.email ?? 'Sin correo'}</Text>
                <View style={styles.separator} />
                <Text style={styles.caption}>AUTENTICACIÓN</Text>
                <Text style={styles.value}>Supabase Auth · Sesión activa</Text>
              </View>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              <Pressable onPress={signOut} disabled={busy} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}>
                <Text style={styles.primaryButtonText}>{busy ? 'Cerrando sesión...' : 'Cerrar sesión'}</Text>
              </Pressable>
              <Text style={styles.small}>Tu cuenta se guarda en Supabase Auth (PostgreSQL).</Text>
            </>
          ) : (
            <>
              <Text style={styles.heading}>{mode === 'login' ? '¡Qué bueno verte!' : 'Crea tu cuenta'}</Text>
              <Text style={styles.paragraph}>{mode === 'login' ? 'Ingresa tus datos para continuar.' : 'Regístrate con tu correo electrónico.'}</Text>
              <View style={styles.tabs}>
                <Pressable onPress={() => switchMode('login')} style={[styles.tab, mode === 'login' && styles.tabActive]}><Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Iniciar sesión</Text></Pressable>
                <Pressable onPress={() => switchMode('register')} style={[styles.tab, mode === 'register' && styles.tabActive]}><Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registrarse</Text></Pressable>
              </View>
              {mode === 'register' && <>
                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#879B94" autoCapitalize="words" editable={!busy} accessibilityLabel="Nombre" />
              </>}
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="nombre@correo.com" placeholderTextColor="#879B94" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" editable={!busy} accessibilityLabel="Correo electrónico" />
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordWrap}>
                <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" placeholderTextColor="#879B94" secureTextEntry={!visible} autoCapitalize="none" textContentType={mode === 'register' ? 'newPassword' : 'password'} editable={!busy} accessibilityLabel="Contraseña" />
                <Pressable onPress={() => setVisible(!visible)} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={styles.toggle}><Text style={styles.toggleText}>{visible ? 'Ocultar' : 'Mostrar'}</Text></Pressable>
              </View>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              {notice ? <Text style={styles.success} accessibilityRole="alert">{notice}</Text> : null}
              <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta'}</Text>}
              </Pressable>
              <Text style={styles.small}>Autenticación segura administrada por Supabase.</Text>
            </>
          )}
        </View>
        <Text style={styles.footer}>Mi Sistema · Práctica universitaria de PWA</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 36 },
  brand: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 68, height: 68, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  logoText: { color: 'white', fontSize: 31, fontWeight: '900' },
  brandName: { color: C.ink, letterSpacing: 3, fontSize: 19, fontWeight: '800' },
  subtitle: { color: C.muted, marginTop: 7, fontSize: 12, textAlign: 'center' },
  card: { width: '100%', maxWidth: 440, backgroundColor: C.surface, padding: 26, borderRadius: 22, borderWidth: 1, borderColor: C.line, shadowColor: '#1C4438', shadowOpacity: 0.07, shadowRadius: 20, elevation: 3 },
  heading: { fontSize: 25, fontWeight: '800', color: C.ink, marginBottom: 6 },
  center: { textAlign: 'center' },
  paragraph: { fontSize: 14, lineHeight: 22, color: C.muted, marginBottom: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#EDF3F0', borderRadius: 12, padding: 4, marginBottom: 21 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: 'white', elevation: 2 },
  tabText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: C.primary, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FBFDFC', borderRadius: 11, paddingHorizontal: 14, height: 49, fontSize: 15, color: C.ink, marginBottom: 19 },
  passwordWrap: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FBFDFC', borderRadius: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 14, height: 49, fontSize: 15, color: C.ink, minWidth: 0 },
  toggle: { paddingHorizontal: 12, paddingVertical: 15 },
  toggleText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  error: { color: C.error, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  success: { color: C.dark, backgroundColor: C.soft, padding: 11, borderRadius: 9, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  primaryButton: { marginTop: 7, backgroundColor: C.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: 'white', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.85 },
  small: { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 17 },
  footer: { color: '#8C9E98', fontSize: 11, marginTop: 21, textAlign: 'center' },
  loading: { alignItems: 'center', paddingVertical: 30, gap: 18 },
  checkmark: { width: 65, height: 65, borderRadius: 33, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  checkmarkText: { color: C.primary, fontSize: 36, fontWeight: '800' },
  info: { backgroundColor: C.soft, padding: 16, borderRadius: 12, marginTop: 8, marginBottom: 20 },
  infoText: { fontSize: 13, lineHeight: 24, color: C.dark },
  caption: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: C.muted, marginBottom: 5 },
  value: { fontSize: 14, color: C.ink, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#CADFD5', marginVertical: 14 },
});
