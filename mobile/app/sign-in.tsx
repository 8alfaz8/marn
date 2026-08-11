import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { signIn } from '@/lib/authClient';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    await signIn.email(
      { email, password },
      {
        onSuccess: () => router.replace('/(app)/overview'),
        onError: (ctx) => {
          setError(ctx.error.message || 'Sign in failed');
          setLoading(false);
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign in</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title={loading ? 'Signing in…' : 'Sign in'} onPress={onSubmit} disabled={loading} />
      <Link href="/sign-up" style={styles.link}>
        New here? Create an account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12 },
  error: { color: '#c0392b' },
  link: { marginTop: 16, textAlign: 'center', color: '#2563eb' },
});
