import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { signUp } from '@/lib/authClient';
import { api } from '@/lib/api';

type Site = { id: string; name: string; city: string };

export default function SignUpScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [siteId, setSiteId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .sites()
      .then((rows) => {
        setSites(rows);
        if (rows.length === 1) setSiteId(rows[0].id);
      })
      .catch(() => setError('Could not load studios.'));
  }, []);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    await signUp.email(
      { email, password, name },
      {
        onSuccess: async () => {
          try {
            await api.register({ phone, siteId });
            router.replace('/(app)/overview');
          } catch {
            setError('Could not finish creating your account. Try again.');
            setLoading(false);
          }
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Could not create your account.');
          setLoading(false);
        },
      },
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Join Marn</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Text style={styles.label}>Studio</Text>
      <View style={styles.siteList}>
        {sites.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSiteId(s.id)}
            style={[styles.siteChip, siteId === s.id && styles.siteChipSelected]}
          >
            <Text style={siteId === s.id ? styles.siteChipTextSelected : undefined}>
              {s.name} — {s.city}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button title={loading ? 'Creating account…' : 'Create account'} onPress={onSubmit} disabled={loading || !siteId} />
      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  heading: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12 },
  label: { fontSize: 14, color: '#555' },
  siteList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  siteChip: { borderWidth: 1, borderColor: '#999', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  siteChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  siteChipTextSelected: { color: '#fff' },
  error: { color: '#c0392b' },
  link: { marginTop: 16, textAlign: 'center', color: '#2563eb' },
});
